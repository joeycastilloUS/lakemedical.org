// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const now = new Date()
  const date = new Date(dateStr + 'T00:00:00')
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Upcoming'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  const years = Math.floor(diffDays / 365)
  const remainingMonths = Math.floor((diffDays % 365) / 30)
  if (remainingMonths === 0) return years === 1 ? '1 year ago' : `${years} years ago`
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`
}

export function daysOverdue(dateStr) {
  if (!dateStr) return 0
  const now = new Date()
  const date = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function getInitials(name) {
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getEngagementCount(alumni) {
  if (!alumni?.engagement) return 0
  return Object.entries(alumni.engagement)
    .filter(([key, val]) => key !== 'is_vip' && val === true)
    .length
}

export function getEngagementLevel(alumni) {
  const count = getEngagementCount(alumni)
  if (count >= 4) return 'high'
  if (count >= 2) return 'moderate'
  if (count >= 1) return 'low'
  return 'none'
}

export function getLastTouchpoint(alumni) {
  if (!alumni?.touchpoints?.length) return null
  return alumni.touchpoints.reduce((latest, tp) =>
    !latest || tp.date > latest.date ? tp : latest
  , null)
}

export function filterAlumni(alumniList, filters, search) {
  let result = [...alumniList]

  // Search
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.professional.specialty.toLowerCase().includes(q) ||
      a.professional.practice_city.toLowerCase().includes(q) ||
      a.professional.practice_state.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.notables.some(n => n.toLowerCase().includes(q))
    )
  }

  // Campus
  if (filters.campus && filters.campus !== 'all') {
    result = result.filter(a => a.campus === filters.campus)
  }

  // Specialty
  if (filters.specialty && filters.specialty !== 'all') {
    result = result.filter(a => a.professional.specialty === filters.specialty)
  }

  // Engagement types
  if (filters.engagementType?.length > 0) {
    result = result.filter(a =>
      filters.engagementType.some(type => a.engagement[type] === true)
    )
  }

  // Tags
  if (filters.tags?.length > 0) {
    result = result.filter(a =>
      filters.tags.some(tag => a.tags.includes(tag))
    )
  }

  // Class year
  if (filters.classYear && filters.classYear !== 'all') {
    const year = Number(filters.classYear)
    result = result.filter(a => a.class_year === year)
  }

  return result
}

export function sortAlumni(alumniList, sortBy) {
  const sorted = [...alumniList]
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'class_year':
      return sorted.sort((a, b) => b.class_year - a.class_year)
    case 'last_touchpoint': {
      return sorted.sort((a, b) => {
        const aLast = getLastTouchpoint(a)?.date || '1900-01-01'
        const bLast = getLastTouchpoint(b)?.date || '1900-01-01'
        return bLast.localeCompare(aLast)
      })
    }
    case 'engagement':
      return sorted.sort((a, b) => getEngagementCount(b) - getEngagementCount(a))
    default:
      return sorted
  }
}

export function getCampusLabel(campus) {
  switch (campus) {
    case 'pomona': return 'COMP (Pomona)'
    case 'lebanon': return 'COMP-Northwest (Lebanon)'
    default: return 'Both Campuses'
  }
}

export function getCampusShort(campus) {
  switch (campus) {
    case 'pomona': return 'Pomona'
    case 'lebanon': return 'Lebanon'
    default: return 'All'
  }
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50'
    case 'medium': return 'text-amber-600 bg-amber-50'
    case 'low': return 'text-gray-500 bg-gray-50'
    default: return 'text-gray-500 bg-gray-50'
  }
}

export function getTriggerTypeColor(type) {
  switch (type) {
    case 'practice_move': return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' }
    case 'new_credential': return { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' }
    case 'publication': return { border: 'border-l-green-600', bg: 'bg-green-50', text: 'text-green-700' }
    case 'follow_up_due': return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700' }
    case 'milestone': return { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' }
    case 'reengagement': return { border: 'border-l-rose-400', bg: 'bg-rose-50', text: 'text-rose-700' }
    case 'soap_prep': return { border: 'border-l-gold', bg: 'bg-gold-light', text: 'text-amber-800' }
    case 'notable_achievement': return { border: 'border-l-gold', bg: 'bg-gold-light', text: 'text-amber-800' }
    default: return { border: 'border-l-gray-300', bg: 'bg-gray-50', text: 'text-gray-600' }
  }
}

export function getAllSpecialties(alumniList) {
  const specs = new Set(alumniList.map(a => a.professional.specialty))
  return [...specs].sort()
}

export function getAllTags(alumniList) {
  const tags = new Set(alumniList.flatMap(a => a.tags))
  return [...tags].sort()
}
