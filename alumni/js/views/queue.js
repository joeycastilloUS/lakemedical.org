// ============================================================
// QUEUE VIEW — full vanilla port of QueueView.jsx
// Morning briefing, trigger cards, filters, SOAP card, archive
// ============================================================

import { formatDate } from '../utils/helpers.js'
import { renderPriorityBadge, renderCampusToggle, renderSOAPCard } from '../components.js'
import {
  setQueueFilter, setQueueCampus, navigate, navigateDirectorySearch,
  openOutreach, dismissTrigger, restoreTrigger
} from '../state.js'

const triggerTypeLabels = {
  all: 'All',
  practice_move: 'Practice Moves',
  new_credential: 'Credentials',
  publication: 'Publications',
  follow_up_due: 'Follow-ups',
  milestone: 'Milestones',
  reengagement: 'Re-engagement',
  soap_prep: 'SOAP',
  notable_achievement: 'Achievements',
}

// Trigger type → actual CSS border color (replaces Tailwind classes)
function triggerBorderColor(type) {
  const map = {
    practice_move: 'var(--blue-500)',
    new_credential: 'var(--gold)',
    publication: 'var(--green-600)',
    follow_up_due: 'var(--red-500)',
    milestone: 'var(--purple-500)',
    reengagement: 'var(--rose-400)',
    soap_prep: 'var(--gold)',
    notable_achievement: 'var(--gold)',
  }
  return map[type] || 'var(--gray-300)'
}

function triggerTextColor(type) {
  const map = {
    practice_move: 'var(--blue-700)',
    new_credential: 'var(--amber-700)',
    publication: 'var(--green-700)',
    follow_up_due: 'var(--red-700)',
    milestone: 'var(--purple-700)',
    reengagement: 'var(--rose-700)',
    soap_prep: 'var(--amber-800)',
    notable_achievement: 'var(--amber-800)',
  }
  return map[type] || 'var(--gray-600)'
}

// ── Render ──

export function renderQueue(state) {
  const { queueItems, archivedItems, queueFilter, queueCampusFilter } = state

  const soapTrigger = queueItems.find(t => t.trigger_type === 'soap_prep')

  // Filter regular triggers
  let filtered = queueItems.filter(t => t.trigger_type !== 'soap_prep')
  if (queueFilter !== 'all') filtered = filtered.filter(t => t.trigger_type === queueFilter)
  if (queueCampusFilter !== 'all') filtered = filtered.filter(t => t.campus === queueCampusFilter || t.campus === 'all')

  // Sort: high priority first, then by date
  const prio = { high: 0, medium: 1, low: 2 }
  filtered.sort((a, b) => {
    const d = (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2)
    return d !== 0 ? d : b.detected_date.localeCompare(a.detected_date)
  })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const pills = Object.entries(triggerTypeLabels).map(([key, label]) =>
    `<button class="pill ${queueFilter === key ? 'pill-active' : 'pill-inactive'}" data-action="queue-filter" data-filter="${key}">${label}</button>`
  ).join('')

  const cards = filtered.map((t, i) => renderTriggerCard(t, i)).join('')

  const empty = filtered.length === 0 && !soapTrigger
    ? `<div class="text-center" style="padding:64px 0">
        <div style="font-size:32px;margin-bottom:12px">✓</div>
        <p class="font-medium text-gray-400">Queue is clear</p>
        <p class="text-sm text-gray-400" style="margin-top:4px">No pending items matching your filters</p>
      </div>` : ''

  const archived = archivedItems.length > 0
    ? `<div style="margin-top:40px">
        <details>
          <summary class="flex items-center gap-2 text-sm font-semibold text-gray-400" style="cursor:pointer">
            <svg class="icon icon-sm"><use href="./css/icons.svg#archive"></use></svg>
            Archived (${archivedItems.length})
          </summary>
          <div class="space-y-3" style="margin-top:12px">
            ${archivedItems.map(t => `
              <div class="flex items-center gap-3" style="padding:12px 16px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-100)">
                <span class="text-sm text-gray-400 flex-1">${t.trigger_icon} ${t.alumni_name} — ${t.trigger_label}</span>
                <button class="flex items-center gap-1 text-xs font-semibold text-burgundy" data-action="restore-trigger" data-id="${t.id}">
                  <svg class="icon icon-sm"><use href="./css/icons.svg#rotate-ccw"></use></svg>
                  Restore
                </button>
              </div>`).join('')}
          </div>
        </details>
      </div>` : ''

  return `
    <div class="mb-6">
      <p class="text-xs font-medium text-gray-400" style="text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${today}</p>
      <h1 class="text-2xl font-bold" style="color:var(--gray-900)">Good morning, Dr. Warren</h1>
      <p class="text-sm text-gray-400" style="margin-top:4px">${queueItems.length} items need your attention</p>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="flex flex-wrap gap-1">${pills}</div>
      <div class="ml-auto">${renderCampusToggle(queueCampusFilter, 'queue-campus', 'sm')}</div>
    </div>

    ${soapTrigger ? renderSOAPCard() : ''}

    <div class="space-y-4">${cards}</div>
    ${empty}
    ${archived}
  `
}

// ── Trigger Card ──

function renderTriggerCard(trigger, index) {
  const border = triggerBorderColor(trigger.trigger_type)
  const color = triggerTextColor(trigger.trigger_type)

  let insights = ''
  if (trigger.detail.campus_proximity)
    insights += `<div class="flex items-center gap-2 text-sm">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--burgundy);flex-shrink:0"></span>
      <span class="text-gray-500">${trigger.detail.campus_proximity}</span></div>`
  if (trigger.detail.student_match)
    insights += `<div class="flex items-center gap-2 text-sm">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>
      <span class="text-gray-500">${trigger.detail.student_match}</span></div>`
  if (trigger.detail.last_touchpoint)
    insights += `<div class="flex items-center gap-2 text-sm">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--gray-300);flex-shrink:0"></span>
      <span class="text-gray-400">Last touchpoint: ${trigger.detail.last_touchpoint}</span></div>`
  if (trigger.detail.days_overdue > 0)
    insights += `<div class="flex items-center gap-2 text-sm">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--red-500);flex-shrink:0"></span>
      <span style="color:var(--red-600);font-weight:500">${trigger.detail.days_overdue} days overdue</span></div>`

  let actions = ''
  if (trigger.alumni_id)
    actions += `<button class="btn btn-ghost btn-sm" data-action="navigate" data-view="profile" data-id="${trigger.alumni_id}">
      <svg class="icon icon-sm"><use href="./css/icons.svg#eye"></use></svg> View Profile</button>`
  if (trigger.directory_search)
    actions += `<button class="btn btn-ghost btn-sm" data-action="directory-search" data-search="${trigger.directory_search}">
      <svg class="icon icon-sm"><use href="./css/icons.svg#users"></use></svg> View These Alumni</button>`
  if (trigger.suggested_outreach)
    actions += `<button class="btn btn-primary btn-sm" data-action="draft-outreach" data-trigger-id="${trigger.id}">
      <svg class="icon icon-sm"><use href="./css/icons.svg#mail"></use></svg> Draft Outreach</button>`
  actions += `<button class="btn btn-ghost btn-sm ml-auto" data-action="dismiss-trigger" data-id="${trigger.id}">
    <svg class="icon icon-sm"><use href="./css/icons.svg#x"></use></svg> Dismiss</button>`

  return `
    <div class="card card-hover animate-fade-up" style="animation-delay:${0.05 + index * 0.05}s">
      <div style="border-left:4px solid ${border};padding:24px">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color}">
              ${trigger.trigger_icon} ${trigger.trigger_label}
            </span>
            ${renderPriorityBadge(trigger.priority)}
          </div>
          <span class="text-xs text-gray-400">${formatDate(trigger.detected_date)}</span>
        </div>

        <h3 class="text-lg font-bold mb-1" style="color:var(--gray-900)">
          ${trigger.alumni_name}${trigger.alumni_specialty ? `, ${trigger.alumni_specialty}` : ''}${trigger.alumni_class ? ` &middot; Class of ${trigger.alumni_class}` : ''}
        </h3>

        <p class="text-sm text-gray-600 mb-3" style="line-height:1.6">
          ${trigger.detail.summary || trigger.detail.context}
        </p>

        ${insights ? `<div class="space-y-2 mb-4">${insights}</div>` : ''}

        <div class="flex flex-wrap items-center gap-2 pt-3 border-t">${actions}</div>
      </div>
    </div>`
}

// ── Events ──

export function wireQueueEvents(state) {
  // Filter pills
  document.querySelectorAll('[data-action="queue-filter"]').forEach(el =>
    el.addEventListener('click', () => setQueueFilter(el.dataset.filter))
  )

  // Campus toggle
  document.querySelectorAll('[data-action="campus-toggle"][data-name="queue-campus"]').forEach(el =>
    el.addEventListener('click', () => setQueueCampus(el.dataset.value))
  )

  // Navigate (profile links + SOAP card links)
  document.querySelectorAll('[data-action="navigate"]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.view, el.dataset.id))
  )

  // Directory search
  document.querySelectorAll('[data-action="directory-search"]').forEach(el =>
    el.addEventListener('click', () => navigateDirectorySearch(el.dataset.search))
  )

  // Draft outreach
  document.querySelectorAll('[data-action="draft-outreach"]').forEach(el => {
    const trigger = state.queueItems.find(t => t.id === el.dataset.triggerId)
    if (trigger?.suggested_outreach) {
      el.addEventListener('click', () => openOutreach({
        ...trigger.suggested_outreach,
        alumniId: trigger.alumni_id,
        alumniName: trigger.alumni_name,
      }))
    }
  })

  // Dismiss
  document.querySelectorAll('[data-action="dismiss-trigger"]').forEach(el =>
    el.addEventListener('click', () => dismissTrigger(el.dataset.id))
  )

  // Restore
  document.querySelectorAll('[data-action="restore-trigger"]').forEach(el =>
    el.addEventListener('click', () => restoreTrigger(el.dataset.id))
  )
}
