// ============================================================
// PROFILE VIEW — full vanilla port of ProfileView.jsx
// 7 sections: header, engagement, notables, timeline, notes,
// outreach history, data provenance
// ============================================================

import { formatDate, timeAgo, getLastTouchpoint, getCampusLabel, daysOverdue } from '../utils/helpers.js'
import {
  renderAvatar, renderVIPBadge, renderEngagementBadge, renderTagBadge,
  renderStatusDot, renderFerpaNotice, engagementConfig
} from '../components.js'
import {
  navigate, goBack, openOutreach, setAddingNote,
  addNote, addNotable, toggleEngagement, forceRender
} from '../state.js'

// Module-scoped transient state (replaces React useState)
let noteText = ''
let noteAuthor = 'Dr. Warren'
let notableText = ''
let addingNotable = false

// ── Render ──

export function renderProfile(alumni, state) {
  if (!alumni) return ''

  const lastTouchpoint = getLastTouchpoint(alumni)
  const nextAction = alumni.suggested_next_action
  const isOverdue = nextAction?.due_date && daysOverdue(nextAction.due_date) > 0
  const backLabel = state.previousView === 'directory' ? 'Directory' : 'Queue'

  return `
    <div style="max-width:768px">
      <!-- Back -->
      <button class="flex items-center gap-1 text-sm text-gray-400 mb-6" data-action="go-back" style="transition:color 0.15s">
        <svg class="icon icon-sm"><use href="./css/icons.svg#arrow-left"></use></svg>
        Back to ${backLabel}
      </button>

      <!-- ═══ SECTION 1: Profile Header ═══ -->
      <div class="card" style="padding:28px;margin-bottom:20px">
        <div class="flex items-start gap-4" style="gap:20px">
          ${renderAvatar(alumni.name, 'lg')}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-2xl font-bold" style="color:var(--gray-900)">${alumni.name}, ${alumni.credentials}</h1>
              ${alumni.engagement.is_vip ? renderVIPBadge() : ''}
            </div>
            <p class="text-sm text-gray-500 mb-1">${alumni.professional.specialty} &middot; ${alumni.professional.practice_name || ''}</p>
            <p class="text-sm text-gray-400 mb-3">
              ${alumni.professional.practice_city}, ${alumni.professional.practice_state} &middot; Class of ${alumni.class_year} &middot; ${getCampusLabel(alumni.campus)}
            </p>

            <!-- Relationship Context -->
            <div style="background:var(--cream);border-radius:8px;padding:12px 16px;margin-bottom:16px">
              ${lastTouchpoint
                ? `<p class="text-sm text-gray-600"><span class="font-semibold text-gray-800">Last connected:</span> ${formatDate(lastTouchpoint.date)} — ${lastTouchpoint.title}</p>`
                : `<p class="text-sm text-gray-400" style="font-style:italic">No touchpoints on record — this is a first connection opportunity</p>`}
              ${nextAction ? `<p class="text-sm" style="color:${isOverdue ? 'var(--red-600)' : 'var(--gray-600)'};margin-top:4px">
                <span class="font-semibold" style="color:${isOverdue ? 'var(--red-700)' : 'var(--gray-800)'}">Next action:</span>
                ${nextAction.description}${isOverdue ? ` <span style="color:var(--red-500);font-weight:600;margin-left:4px">(${daysOverdue(nextAction.due_date)} days overdue)</span>` : ''}
              </p>` : ''}
            </div>

            <!-- NPI & License -->
            <div class="flex items-center gap-4 text-xs text-gray-400 mb-4">
              <span>NPI: ${alumni.professional.npi}</span>
              <span class="flex items-center gap-1">License: ${renderStatusDot(alumni.professional.license_status)} ${alumni.professional.license_status} (${alumni.professional.license_state})</span>
              <span>Verified: ${formatDate(alumni.professional.last_verified)}</span>
            </div>

            <!-- Tags -->
            ${(alumni.tags?.length || 0) > 0 ? `<div class="flex flex-wrap gap-1 mb-4">${alumni.tags.map(t => renderTagBadge(t)).join('')}</div>` : ''}

            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
              <button class="btn btn-outline btn-sm" data-action="start-note">
                <svg class="icon icon-sm"><use href="./css/icons.svg#plus"></use></svg> Add Note
              </button>
              <button class="btn btn-primary btn-sm" data-action="draft-outreach-profile">
                <svg class="icon icon-sm"><use href="./css/icons.svg#mail"></use></svg> Draft Outreach
              </button>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        ${(alumni.contact.email || alumni.contact.phone) ? `
          <div class="flex items-center gap-6 text-sm text-gray-500" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100)">
            ${alumni.contact.email ? `<span class="flex items-center gap-1">
              <svg class="icon icon-sm" style="color:var(--gray-400)"><use href="./css/icons.svg#at-sign"></use></svg>
              ${alumni.contact.email}${alumni.contact.email_status === 'bounced' ? ' <span class="text-xs font-semibold" style="color:var(--red-500);margin-left:4px">Bounced</span>' : ''}
            </span>` : ''}
            ${alumni.contact.phone ? `<span class="flex items-center gap-1">
              <svg class="icon icon-sm" style="color:var(--gray-400)"><use href="./css/icons.svg#phone"></use></svg>
              ${alumni.contact.phone}
            </span>` : ''}
            ${alumni.contact.preferred_method ? `<span class="text-xs text-gray-400">Prefers: ${alumni.contact.preferred_method}</span>` : ''}
          </div>` : ''}
      </div>

      <!-- ═══ SECTION 2: Engagement Status ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h2 class="text-lg font-bold mb-4" style="color:var(--gray-900)">Engagement with COMP</h2>
        <div class="grid grid-2 gap-2">
          ${Object.entries(engagementConfig).map(([key, config]) => {
            const isActive = alumni.engagement[key]
            return `<label class="flex items-center gap-3" style="padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;${isActive ? 'background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15)' : 'border:1px solid transparent'}">
              <input type="checkbox" ${isActive ? 'checked' : ''} data-action="toggle-engagement" data-field="${key}"
                style="width:16px;height:16px;accent-color:var(--burgundy)">
              <svg class="icon icon-sm" style="color:${isActive ? 'var(--green-600)' : 'var(--gray-400)'}"><use href="./css/icons.svg#${config.icon}"></use></svg>
              <span class="text-sm ${isActive ? 'font-semibold text-gray-800' : 'text-gray-500'}">${config.label}</span>
            </label>`
          }).join('')}
        </div>
      </div>

      <!-- ═══ SECTION 3: Notables ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold" style="color:var(--gray-900)">Notables</h2>
          ${!addingNotable ? `<button class="flex items-center gap-1 text-xs font-semibold text-burgundy" data-action="start-notable">
            <svg class="icon icon-sm"><use href="./css/icons.svg#plus"></use></svg> Add
          </button>` : ''}
        </div>
        <p class="text-xs text-gray-400 mb-4">What makes ${alumni.name.split(',')[0]} notable beyond their specialty</p>

        ${addingNotable ? `
          <div class="mb-4" style="padding:12px;background:var(--cream);border-radius:8px;border:1px solid var(--gray-200)">
            <input type="text" id="notable-input" class="input" style="margin-bottom:8px"
              value="${notableText}" placeholder="e.g. Published in NEJM, Board certified in 3 specialties...">
            <div class="flex items-center gap-2">
              <button class="btn btn-primary btn-sm" data-action="save-notable">Save</button>
              <button class="btn btn-ghost btn-sm" data-action="cancel-notable">Cancel</button>
            </div>
          </div>` : ''}

        ${(alumni.notables?.length || 0) > 0
          ? `<ul class="space-y-2">${alumni.notables.map(n =>
              `<li class="flex items-start gap-2 text-sm text-gray-600"><span style="color:var(--gold);margin-top:4px">&bull;</span> ${n}</li>`
            ).join('')}</ul>`
          : !addingNotable ? `<p class="text-sm text-gray-400" style="font-style:italic">No notables on record yet</p>` : ''}
      </div>

      <!-- ═══ SECTION 4: Touchpoint Timeline ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h2 class="text-lg font-bold mb-4" style="color:var(--gray-900)">
          Timeline <span class="text-sm font-medium text-gray-400" style="margin-left:8px">${alumni.touchpoints?.length || 0} touchpoints</span>
        </h2>
        ${(alumni.touchpoints?.length || 0) > 0
          ? `<div style="position:relative">
              <div style="position:absolute;left:16px;top:8px;bottom:8px;width:1px;background:var(--gray-200)"></div>
              ${alumni.touchpoints.map((tp, i) => `
                <div class="flex" style="position:relative;gap:16px;padding-bottom:${i < alumni.touchpoints.length - 1 ? '24px' : '0'}">
                  <div style="position:relative;z-index:1;width:32px;display:flex;justify-content:center;padding-top:4px">
                    <div style="width:12px;height:12px;border-radius:50%;border:2px solid ${tp.source === 'manual' ? 'var(--burgundy)' : 'var(--gray-300)'};background:${tp.source === 'manual' ? 'var(--burgundy)' : '#fff'}"></div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-semibold text-gray-400">${formatDate(tp.date)}</span>
                      <span class="text-xs text-gray-400" style="color:var(--gray-300)">&middot;</span>
                      <span class="text-xs text-gray-400">${tp.added_by}</span>
                    </div>
                    <p class="text-sm font-semibold text-gray-800 mb-1">${tp.icon} ${tp.title}</p>
                    ${tp.detail ? `<p class="text-sm text-gray-500" style="line-height:1.6">${tp.detail}</p>` : ''}
                  </div>
                </div>`).join('')}
            </div>`
          : `<p class="text-sm text-gray-400" style="font-style:italic">No touchpoints recorded yet</p>`}
      </div>

      <!-- ═══ SECTION 5: Personal Notes ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h2 class="text-lg font-bold mb-4" style="color:var(--gray-900)">Personal Notes</h2>

        ${state.addingNote ? `
          <div class="mb-4" style="padding:16px;background:var(--cream);border-radius:8px;border:1px solid var(--gray-200)">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-semibold text-gray-500">Author:</label>
              <input type="text" id="note-author" class="input" style="width:160px;padding:4px 8px" value="${noteAuthor}">
            </div>
            <textarea id="note-text" class="textarea" style="min-height:80px;margin-bottom:8px" placeholder="Add a note...">${noteText}</textarea>
            <div class="flex items-center gap-2">
              <button class="btn btn-primary btn-sm" data-action="save-note">Save Note</button>
              <button class="btn btn-ghost btn-sm" data-action="cancel-note">Cancel</button>
            </div>
          </div>` : ''}

        ${(alumni.notes?.length || 0) > 0
          ? `<div class="space-y-4">${alumni.notes.map(note => `
              <div style="border-left:2px solid rgba(212,162,74,0.3);padding-left:16px">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-semibold text-gray-500">${formatDate(note.date)}</span>
                  <span class="text-xs" style="color:var(--gray-300)">&mdash;</span>
                  <span class="text-xs font-semibold text-burgundy">${note.author}</span>
                </div>
                <p class="text-sm text-gray-600" style="line-height:1.6">${note.text}</p>
              </div>`).join('')}</div>`
          : !state.addingNote ? `<p class="text-sm text-gray-400" style="font-style:italic">No notes yet. Click "Add Note" to start Lisa's notebook for this alumnus.</p>` : ''}
      </div>

      <!-- ═══ SECTION 6: Outreach History ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h2 class="text-lg font-bold mb-4" style="color:var(--gray-900)">Outreach History</h2>

        ${nextAction ? `
          <div class="flex items-center gap-3 mb-4" style="padding:12px 16px;border-radius:8px;${isOverdue ? 'background:var(--red-50);border:1px solid var(--red-200)' : 'background:rgba(245,230,200,0.5);border:1px solid rgba(212,162,74,0.2)'}">
            <svg class="icon icon-sm" style="color:${isOverdue ? 'var(--red-500)' : 'var(--amber-700)'}"><use href="./css/icons.svg#clock"></use></svg>
            <div class="flex-1">
              <span class="text-sm font-semibold" style="color:${isOverdue ? 'var(--red-700)' : 'var(--gray-800)'}">Suggested: ${nextAction.description}</span>
              ${nextAction.due_date ? `<span class="text-xs text-gray-400" style="margin-left:8px">${isOverdue ? `Due ${formatDate(nextAction.due_date)}` : `by ${formatDate(nextAction.due_date)}`}</span>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" data-action="draft-outreach-profile">
              <svg class="icon icon-sm"><use href="./css/icons.svg#mail"></use></svg> Draft
            </button>
          </div>` : ''}

        ${(alumni.outreach_history?.length || 0) > 0
          ? `<div class="space-y-2">${alumni.outreach_history.map(o => `
              <div class="flex items-center gap-3" style="padding:8px 0;border-bottom:1px solid var(--gray-50)">
                ${renderStatusDot(o.status, 'md')}
                <div class="flex-1 min-w-0"><span class="text-sm text-gray-800">${o.subject}</span></div>
                <span class="text-xs text-gray-400">${formatDate(o.date)}</span>
                <span class="text-xs font-medium text-gray-500" style="text-transform:capitalize">${o.status}</span>
              </div>`).join('')}</div>`
          : `<p class="text-sm text-gray-400" style="font-style:italic">No outreach history</p>`}
      </div>

      <!-- ═══ SECTION 7: Data Provenance ═══ -->
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h2 class="text-sm font-semibold text-gray-400 mb-3" style="text-transform:uppercase;letter-spacing:0.05em">Data Sources</h2>
        <div class="space-y-2 mb-4">
          ${Object.entries(alumni.data_sources).map(([key, source]) => `
            <div class="flex items-center text-xs">
              <span class="text-gray-400 flex-shrink-0" style="width:112px;text-transform:capitalize">${key.replace(/_/g, ' ')}</span>
              <span class="text-gray-400" style="margin:0 8px">&middot;&middot;&middot;&middot;&middot;</span>
              <span class="text-gray-500">${source}</span>
            </div>`).join('')}
        </div>
        ${renderFerpaNotice()}
      </div>
    </div>`
}

// ── Events ──

export function wireProfileEvents(state) {
  const alumni = state.selectedAlumniId
    ? state.alumni.find(a => a.id === state.selectedAlumniId)
    : null
  if (!alumni) return

  // Back
  document.querySelectorAll('[data-action="go-back"]').forEach(el =>
    el.addEventListener('click', () => goBack())
  )

  // Add Note button
  document.querySelectorAll('[data-action="start-note"]').forEach(el =>
    el.addEventListener('click', () => { noteText = ''; setAddingNote(true) })
  )

  // Save Note
  document.querySelectorAll('[data-action="save-note"]').forEach(el =>
    el.addEventListener('click', () => {
      const text = document.getElementById('note-text')?.value?.trim()
      const author = document.getElementById('note-author')?.value?.trim() || 'Dr. Warren'
      if (text) {
        noteAuthor = author
        noteText = ''
        addNote(alumni.id, text, author)
      }
    })
  )

  // Cancel Note
  document.querySelectorAll('[data-action="cancel-note"]').forEach(el =>
    el.addEventListener('click', () => { noteText = ''; setAddingNote(false) })
  )

  // Start Notable
  document.querySelectorAll('[data-action="start-notable"]').forEach(el =>
    el.addEventListener('click', () => { addingNotable = true; notableText = ''; forceRender() })
  )

  // Save Notable
  document.querySelectorAll('[data-action="save-notable"]').forEach(el =>
    el.addEventListener('click', () => {
      const text = document.getElementById('notable-input')?.value?.trim()
      if (text) {
        addingNotable = false
        notableText = ''
        addNotable(alumni.id, text)
      }
    })
  )

  // Cancel Notable
  document.querySelectorAll('[data-action="cancel-notable"]').forEach(el =>
    el.addEventListener('click', () => { addingNotable = false; notableText = ''; forceRender() })
  )

  // Notable enter key
  const notableInput = document.getElementById('notable-input')
  if (notableInput) {
    notableInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && notableInput.value.trim()) {
        addingNotable = false
        notableText = ''
        addNotable(alumni.id, notableInput.value.trim())
      }
    })
  }

  // Toggle Engagement
  document.querySelectorAll('[data-action="toggle-engagement"]').forEach(el =>
    el.addEventListener('change', () => toggleEngagement(alumni.id, el.dataset.field))
  )

  // Draft Outreach (from header + suggested action)
  document.querySelectorAll('[data-action="draft-outreach-profile"]').forEach(el =>
    el.addEventListener('click', () => {
      const nextAction = alumni.suggested_next_action
      openOutreach({
        alumniId: alumni.id,
        alumniName: alumni.name,
        email: alumni.contact.email,
        subject: nextAction?.description || `Connecting with ${alumni.name}`,
        body: `Dear ${alumni.name.replace('Dr. ', '')},\n\nI wanted to reach out...\n\nWarm regards,\nDr. Lisa Warren, DO, MBA\nDean, COMP & COMP-Northwest`,
      })
    })
  )

  // Navigate links (if any profile-internal navigate buttons exist)
  document.querySelectorAll('[data-action="navigate"]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.view, el.dataset.id))
  )
}
