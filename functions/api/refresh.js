// POST /api/refresh — trigger data pipeline refresh
// Called by GCP Cloud Scheduler or manually.
// Reads alumni list from KV, enriches via NPI + PubMed, writes back.

import { matchAlumni, npiToAlumniRecord } from './_npi.js'
import { searchAlumniPublications, pubmedToEnrichment } from './_pubmed.js'

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const delay = ms => new Promise(r => setTimeout(r, ms))

export async function onRequestPost(context) {
  const { env } = context

  // Auth check
  const authHeader = context.request.headers.get('Authorization')
  const expected = env.REFRESH_SECRET
  if (expected && authHeader !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!env.ALUMNI_DATA) {
    return new Response(JSON.stringify({ error: 'KV not bound' }), {
      status: 503, headers: JSON_HEADERS,
    })
  }

  // Read current alumni list from KV (or request body for initial seed)
  let alumniList
  try {
    const body = await context.request.json().catch(() => null)
    if (body?.alumni) {
      // Seed mode: caller provides the list
      alumniList = body.alumni
    } else {
      // Refresh mode: read existing data from KV
      const cached = await env.ALUMNI_DATA.get('alumni-data', 'json')
      alumniList = cached?.alumni || []
    }
  } catch (e) {
    alumniList = []
  }

  if (alumniList.length === 0) {
    return new Response(JSON.stringify({
      status: 'empty', message: 'No alumni to refresh',
    }), { headers: JSON_HEADERS })
  }

  // Process in batches — Workers have a 30s CPU time limit
  // Process up to 50 per invocation, track cursor in KV
  const cursor = parseInt(await env.ALUMNI_DATA.get('refresh-cursor') || '0')
  const batchSize = 50
  const batch = alumniList.slice(cursor, cursor + batchSize)
  const results = { processed: 0, matched: 0, publications: 0, errors: 0 }

  for (const alumni of batch) {
    try {
      // Parse name from existing record
      const nameParts = (alumni.name || '').replace(/^Dr\.\s*/, '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      if (!firstName || !lastName) continue

      // NPI match
      const npiMatch = await matchAlumni({
        firstName, lastName,
        classYear: alumni.class_year,
      })

      if (npiMatch) {
        alumni.professional = {
          ...alumni.professional,
          npi: npiMatch.npi,
          practice_city: npiMatch.practice.city,
          practice_state: npiMatch.practice.state,
          last_verified: new Date().toISOString().split('T')[0],
        }
        results.matched++
      }

      await delay(200) // NPI rate limit

      // PubMed search
      const pubResult = await searchAlumniPublications({ firstName, lastName })
      if (pubResult.articles.length > 0) {
        const enrichment = pubmedToEnrichment(pubResult.articles)
        alumni.notables = [...(enrichment.notables || []), ...(alumni.notables || [])]
        if (!alumni.tags?.includes('published_researcher')) {
          alumni.tags = [...(alumni.tags || []), 'published_researcher']
        }
        results.publications++
      }

      await delay(500) // PubMed rate limit

      results.processed++
    } catch (e) {
      results.errors++
    }
  }

  // Write updated data back to KV
  const nextCursor = cursor + batchSize
  const isComplete = nextCursor >= alumniList.length

  await env.ALUMNI_DATA.put('alumni-data', JSON.stringify({
    alumni: alumniList,
    triggers: (await env.ALUMNI_DATA.get('alumni-data', 'json'))?.triggers || [],
    lastRefresh: new Date().toISOString(),
  }))

  if (isComplete) {
    await env.ALUMNI_DATA.delete('refresh-cursor')
  } else {
    await env.ALUMNI_DATA.put('refresh-cursor', String(nextCursor))
  }

  return new Response(JSON.stringify({
    status: isComplete ? 'complete' : 'in_progress',
    batch: { from: cursor, to: cursor + batch.length, total: alumniList.length },
    results,
    nextCursor: isComplete ? null : nextCursor,
    timestamp: new Date().toISOString(),
  }), { headers: JSON_HEADERS })
}
