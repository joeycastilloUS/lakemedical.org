// NPI (NPPES) API — Worker-compatible module
// National Provider Identifier Registry — free, public, no auth
// Docs: https://npiregistry.cms.hhs.gov/api-page

const NPI_BASE = 'https://npiregistry.cms.hhs.gov/api/'
const NPI_VERSION = '2.1'

export async function searchNPI({ firstName, lastName, state, limit = 10 }) {
  const params = new URLSearchParams({
    version: NPI_VERSION,
    enumeration_type: 'NPI-1',
    first_name: firstName,
    last_name: lastName,
    limit: String(limit),
  })
  if (state) params.set('state', state)

  const res = await fetch(`${NPI_BASE}?${params}`)
  if (!res.ok) throw new Error(`NPI API ${res.status}`)
  return res.json()
}

export function parseNPIResult(result) {
  if (!result) return null
  const basic = result.basic || {}
  const taxonomies = result.taxonomies || []
  const addresses = result.addresses || []
  const primaryTaxonomy = taxonomies.find(t => t.primary) || taxonomies[0]
  const practiceAddr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0]

  return {
    npi: String(result.number),
    name: {
      first: basic.first_name || '',
      last: basic.last_name || '',
      credential: basic.credential || '',
      full: `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
    },
    specialty: {
      code: primaryTaxonomy?.code || '',
      description: primaryTaxonomy?.desc || '',
      state: primaryTaxonomy?.state || '',
    },
    practice: {
      city: practiceAddr?.city || '',
      state: practiceAddr?.state || '',
      phone: practiceAddr?.telephone_number || '',
    },
    enumeration_date: basic.enumeration_date || '',
  }
}

export async function matchAlumni({ firstName, lastName, classYear }) {
  const data = await searchNPI({ firstName, lastName, limit: 20 })
  const results = (data.results || []).map(parseNPIResult)
  if (results.length === 0) return null

  const scored = results.map(r => {
    let score = 0
    const cred = (r.name.credential || '').toUpperCase()
    if (cred.includes('DO') || cred.includes('D.O')) score += 10
    if (classYear && r.enumeration_date) {
      const enumYear = parseInt(r.enumeration_date.split('-')[0])
      if (enumYear >= classYear - 2 && enumYear <= classYear + 4) score += 3
    }
    if (r.name.first.toUpperCase() === firstName.toUpperCase()) score += 2
    return { ...r, _matchScore: score }
  })

  scored.sort((a, b) => b._matchScore - a._matchScore)
  const best = scored[0]
  return best._matchScore >= 5 ? best : null
}

const SPECIALTY_MAP = {
  'internal medicine': 'Internal Medicine',
  'family medicine': 'Family Medicine',
  'family practice': 'Family Medicine',
  'emergency medicine': 'Emergency Medicine',
  'pediatrics': 'Pediatrics',
  'psychiatry': 'Psychiatry',
  'obstetrics & gynecology': 'OB/GYN',
  'general surgery': 'General Surgery',
  'orthopedic surgery': 'Orthopedic Surgery',
  'anesthesiology': 'Anesthesiology',
  'neurology': 'Neurology',
  'cardiology': 'Cardiology',
  'cardiovascular disease': 'Cardiology',
  'sports medicine': 'Sports Medicine',
  'radiology': 'Radiology',
  'dermatology': 'Dermatology',
  'pathology': 'Pathology',
}

export function cleanSpecialty(desc) {
  if (!desc) return 'Unknown'
  const lower = desc.toLowerCase()
  for (const [key, value] of Object.entries(SPECIALTY_MAP)) {
    if (lower.includes(key)) return value
  }
  return desc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export function npiToAlumniRecord(npiResult, { classYear, campus, id }) {
  if (!npiResult) return null
  const today = new Date().toISOString().split('T')[0]
  return {
    id: id || `alumni_npi_${npiResult.npi}`,
    name: `Dr. ${npiResult.name.first} ${npiResult.name.last}`,
    credentials: npiResult.name.credential || 'DO',
    class_year: classYear,
    campus: campus || 'pomona',
    professional: {
      npi: npiResult.npi,
      specialty: cleanSpecialty(npiResult.specialty.description),
      practice_city: npiResult.practice.city,
      practice_state: npiResult.practice.state,
      last_verified: today,
    },
    contact: { source: 'npi_registry', last_confirmed: today },
    engagement: {},
    notables: [],
    tags: [],
    touchpoints: [{
      date: today, type: 'signal', icon: '📡',
      title: 'NPI record matched',
      detail: `NPI: ${npiResult.npi}. ${cleanSpecialty(npiResult.specialty.description)} in ${npiResult.practice.city}, ${npiResult.practice.state}.`,
      added_by: 'system', source: 'npi_sync',
    }],
    notes: [],
    outreach_history: [],
  }
}
