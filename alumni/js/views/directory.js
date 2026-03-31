// ============================================================
// DIRECTORY VIEW — full vanilla port of DirectoryView.jsx
// Search, 6 filters, sort, paginated alumni cards
// ============================================================

import {
  filterAlumni, sortAlumni, getLastTouchpoint, formatDate,
  getEngagementCount, getAllSpecialties, getAllTags
} from '../utils/helpers.js'
import { renderAvatar, renderVIPBadge, renderEngagementBadge, renderCampusToggle } from '../components.js'
import {
  navigate, setDirectorySearch, setDirectoryFilters, setDirectorySort, forceRender
} from '../state.js'

const PAGE_SIZE = 25

const engagementTypes = [
  { key: 'is_mentor', label: 'Mentor' },
  { key: 'is_donor', label: 'Donor' },
  { key: 'is_preceptor', label: 'Preceptor' },
  { key: 'is_advisory_board', label: 'Advisory Board' },
  { key: 'attends_rcme_events', label: 'RCME Events' },
  { key: 'attends_social_events', label: 'Social Events' },
  { key: 'is_soap_mentor', label: 'SOAP Mentor' },
  { key: 'is_guest_speaker', label: 'Guest Speaker' },
]

const sortOptions = [
  { key: 'name', label: 'Name' },
  { key: 'class_year', label: 'Class Year' },
  { key: 'last_touchpoint', label: 'Last Touchpoint' },
  { key: 'engagement', label: 'Engagement' },
]

// Module-scoped page state (resets on re-render when filters change)
let currentPage = 0

export function resetDirectoryPage() { currentPage = 0 }

// ── Render ──

export function renderDirectory(state) {
  const { alumni, directorySearch, directoryFilters, directorySortBy } = state

  const specialties = getAllSpecialties(alumni)
  const tags = getAllTags(alumni)
  const classYears = [...new Set(alumni.map(a => a.class_year))].sort((a, b) => b - a)

  const filtered = sortAlumni(
    filterAlumni(alumni, directoryFilters, directorySearch),
    directorySortBy
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1)
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Build filter selects
  const specOpts = specialties.map(s => `<option value="${s}" ${directoryFilters.specialty === s ? 'selected' : ''}>${s}</option>`).join('')
  const engOpts = engagementTypes.map(e => `<option value="${e.key}" ${(directoryFilters.engagementType?.[0] === e.key) ? 'selected' : ''}>${e.label}</option>`).join('')
  const yearOpts = classYears.map(y => `<option value="${y}" ${String(directoryFilters.classYear) === String(y) ? 'selected' : ''}>Class of ${y}</option>`).join('')
  const tagOpts = tags.map(t => `<option value="${t}" ${(directoryFilters.tags?.[0] === t) ? 'selected' : ''}>${t.replace(/_/g, ' ')}</option>`).join('')
  const sortOpts = sortOptions.map(o => `<option value="${o.key}" ${directorySortBy === o.key ? 'selected' : ''}>Sort: ${o.label}</option>`).join('')

  const cards = paged.map((a, i) => renderAlumniCard(a, i)).join('')

  const empty = filtered.length === 0
    ? `<div class="text-center" style="padding:64px 0">
        <div style="font-size:32px;margin-bottom:12px">🔍</div>
        <p class="font-medium text-gray-400">No alumni match your search</p>
        <p class="text-sm text-gray-400" style="margin-top:4px">Try adjusting your filters or search terms</p>
      </div>` : ''

  const pagination = totalPages > 1
    ? `<div class="flex items-center justify-between" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--gray-100)">
        <button class="btn btn-ghost btn-sm" data-action="page-prev" ${currentPage === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
          <svg class="icon icon-sm"><use href="./css/icons.svg#chevron-left"></use></svg> Previous
        </button>
        <span class="text-xs text-gray-400">Page ${currentPage + 1} of ${totalPages} &middot; ${filtered.length} alumni</span>
        <button class="btn btn-ghost btn-sm" data-action="page-next" ${currentPage >= totalPages - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
          Next <svg class="icon icon-sm"><use href="./css/icons.svg#chevron-right"></use></svg>
        </button>
      </div>` : ''

  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold" style="color:var(--gray-900)">Alumni</h1>
      <p class="text-sm text-gray-400">${alumni.length} records &middot; Search by name, specialty, location, or tag</p>
    </div>

    <div style="position:relative;margin-bottom:20px">
      <svg class="icon icon-md" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--gray-400)"><use href="./css/icons.svg#search"></use></svg>
      <input type="text" id="directory-search" class="input input-lg" style="padding-left:44px;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04)"
        value="${directorySearch}" placeholder="Search by name, specialty, city, or tag...">
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      ${renderCampusToggle(directoryFilters.campus, 'dir-campus', 'sm')}
      <select class="select" data-action="filter-specialty"><option value="all">All Specialties</option>${specOpts}</select>
      <select class="select" data-action="filter-engagement"><option value="all">All Engagement</option>${engOpts}</select>
      <select class="select" data-action="filter-year"><option value="all">All Class Years</option>${yearOpts}</select>
      <select class="select" data-action="filter-tags"><option value="all">All Tags</option>${tagOpts}</select>
      <select class="select" data-action="sort-by">${sortOpts}</select>
      <span class="text-xs text-gray-400 ml-auto">Showing ${filtered.length} of ${alumni.length} alumni</span>
    </div>

    <div class="space-y-3">${cards}</div>
    ${empty}
    ${pagination}
  `
}

// ── Alumni Card ──

function renderAlumniCard(a, index) {
  const lastTp = getLastTouchpoint(a)
  const activeEngagements = Object.entries(a.engagement)
    .filter(([key, val]) => val === true && key !== 'is_vip')
    .map(([key]) => key)

  const badges = activeEngagements.length > 0
    ? `<div class="flex flex-wrap gap-1 mb-2">
        ${activeEngagements.slice(0, 4).map(type => renderEngagementBadge(type)).join('')}
        ${activeEngagements.length > 4 ? `<span class="text-xs text-gray-400" style="align-self:center">+${activeEngagements.length - 4} more</span>` : ''}
      </div>` : ''

  const notable = a.notables.length > 0
    ? `<p class="text-xs text-gray-500 mb-1"><span class="font-semibold text-gray-600">Notable:</span> ${a.notables[0]}</p>` : ''

  const touchpoint = lastTp
    ? `Last touchpoint: ${formatDate(lastTp.date)} — ${lastTp.title}`
    : 'No touchpoints on record'

  return `
    <button class="w-full card card-hover animate-fade-up" style="text-align:left;padding:20px;animation-delay:${index * 0.03}s" data-action="navigate" data-view="profile" data-id="${a.id}">
      <div class="flex items-start gap-4">
        ${renderAvatar(a.name, 'md')}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-base font-bold" style="color:var(--gray-900)">${a.name}, ${a.credentials}</h3>
            ${a.engagement.is_vip ? renderVIPBadge() : ''}
            <span class="text-xs text-gray-400 ml-auto flex-shrink-0">Class of ${a.class_year}</span>
          </div>
          <p class="text-sm text-gray-500 mb-2">${a.professional.specialty} &middot; ${a.professional.practice_city}, ${a.professional.practice_state}</p>
          ${badges}
          ${notable}
          <p class="text-xs text-gray-400">${touchpoint}</p>
        </div>
      </div>
    </button>`
}

// ── Events ──

export function wireDirectoryEvents(state) {
  // Search input
  const searchInput = document.getElementById('directory-search')
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 0
      setDirectorySearch(searchInput.value)
    })
  }

  // Campus toggle
  document.querySelectorAll('[data-action="campus-toggle"][data-name="dir-campus"]').forEach(el =>
    el.addEventListener('click', () => { currentPage = 0; setDirectoryFilters({ campus: el.dataset.value }) })
  )

  // Filter selects
  const specialty = document.querySelector('[data-action="filter-specialty"]')
  if (specialty) specialty.addEventListener('change', () => { currentPage = 0; setDirectoryFilters({ specialty: specialty.value }) })

  const engagement = document.querySelector('[data-action="filter-engagement"]')
  if (engagement) engagement.addEventListener('change', () => {
    currentPage = 0
    setDirectoryFilters({ engagementType: engagement.value === 'all' ? [] : [engagement.value] })
  })

  const year = document.querySelector('[data-action="filter-year"]')
  if (year) year.addEventListener('change', () => { currentPage = 0; setDirectoryFilters({ classYear: year.value }) })

  const tagsEl = document.querySelector('[data-action="filter-tags"]')
  if (tagsEl) tagsEl.addEventListener('change', () => {
    currentPage = 0
    setDirectoryFilters({ tags: tagsEl.value === 'all' ? [] : [tagsEl.value] })
  })

  // Sort
  const sortEl = document.querySelector('[data-action="sort-by"]')
  if (sortEl) sortEl.addEventListener('change', () => { currentPage = 0; setDirectorySort(sortEl.value) })

  // Navigate to profile
  document.querySelectorAll('[data-action="navigate"]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.view, el.dataset.id))
  )

  // Pagination
  const prevBtn = document.querySelector('[data-action="page-prev"]')
  const nextBtn = document.querySelector('[data-action="page-next"]')
  if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 0) { currentPage--; forceRender() } })
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; forceRender() })
}
