// ============================================================
// SHARED COMPONENTS — render functions returning HTML strings
// Port of 8 React components: Avatar, Badge (4 types),
// CampusToggle, ComplianceBadges (4), Navigation, SOAPCard, StatusDot
// ============================================================

import { getInitials } from './utils/helpers.js'

// ── Avatar ──

const avatarPalettes = [0, 1, 2, 3, 4, 5, 6, 7]

function nameToColorIndex(name) {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return Math.abs(hash) % avatarPalettes.length
}

export function renderAvatar(name, size = 'md') {
  const initials = getInitials(name)
  const colorIdx = nameToColorIndex(name)
  const sizeClass = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg' }[size]
  return `<div class="avatar ${sizeClass} avatar-${colorIdx}">${initials}</div>`
}

// ── Engagement Badge ──

const engagementConfig = {
  is_mentor: { label: 'Active Mentor', icon: 'users', cssClass: 'badge-mentor' },
  is_donor: { label: 'Donor', icon: 'heart', cssClass: 'badge-donor' },
  is_preceptor: { label: 'Preceptor', icon: 'graduation-cap', cssClass: 'badge-preceptor' },
  is_advisory_board: { label: 'Advisory Board', icon: 'shield', cssClass: 'badge-advisory' },
  attends_rcme_events: { label: 'RCME Events', icon: 'calendar', cssClass: 'badge-rcme' },
  attends_social_events: { label: 'Social Events', icon: 'calendar', cssClass: 'badge-social' },
  is_soap_mentor: { label: 'SOAP Mentor', icon: 'handshake', cssClass: 'badge-soap' },
  is_guest_speaker: { label: 'Guest Speaker', icon: 'mic', cssClass: 'badge-speaker' },
  is_champion: { label: 'Champion', icon: 'star', cssClass: 'badge-champion' },
}

export { engagementConfig }

export function renderEngagementBadge(type) {
  const config = engagementConfig[type]
  if (!config) return ''
  return `<span class="engagement-badge ${config.cssClass}">
    <svg class="icon icon-sm"><use href="./css/icons.svg#${config.icon}"></use></svg>
    ${config.label}
  </span>`
}

// ── VIP Badge ──

export function renderVIPBadge() {
  return `<span class="badge-vip">
    <svg class="icon icon-sm"><use href="./css/icons.svg#star"></use></svg>
    VIP
  </span>`
}

// ── Tag Badge ──

const tagLabels = {
  published_researcher: '\u{1F4DA} Published',
  faculty: '\u{1F393} Faculty',
  board_candidate: '\u{1F3DB}\uFE0F Board Candidate',
  leadership: '\u{1F464} Leadership',
  soap_alum: '\u{1F91D} SOAP Alum',
  champion: '\u2B50 Champion',
  lost_contact: '\u{1F515} Lost Contact',
  near_pomona: '\u{1F4CD} Near Pomona',
  near_lebanon: '\u{1F4CD} Near Lebanon',
  never_contacted: '\u{1F4ED} Never Contacted',
  recent_grad: '\u{1F393} Recent Grad',
  first_generation: '\u2728 First Generation',
  reunion_2026: '\u{1F389} Reunion 2026',
  media_presence: '\u{1F4FA} Media',
  notable: '\u2B50 Notable',
}

export function renderTagBadge(tag) {
  const label = tagLabels[tag] || tag.replace(/_/g, ' ')
  return `<span class="tag-badge">${label}</span>`
}

// ── Priority Badge ──

export function renderPriorityBadge(priority) {
  const cls = {
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
  }[priority] || 'priority-low'
  return `<span class="badge-priority ${cls}">${priority}</span>`
}

// ── Campus Toggle ──

export function renderCampusToggle(value, name = 'campus', size = '') {
  const options = [
    { key: 'all', label: 'Both Campuses' },
    { key: 'pomona', label: 'Pomona' },
    { key: 'lebanon', label: 'Lebanon' },
  ]
  const sizeClass = size === 'sm' ? 'campus-btn-sm' : ''
  return `<div class="campus-toggle">
    ${options.map(opt => `
      <button class="campus-btn ${sizeClass} ${value === opt.key ? 'active' : ''}" data-action="campus-toggle" data-name="${name}" data-value="${opt.key}">
        ${opt.label}
      </button>
    `).join('')}
  </div>`
}

// ── Status Dot ──

export function renderStatusDot(status, size = 'sm') {
  const colorClass = {
    active: 'dot-active',
    replied: 'dot-replied',
    opened: 'dot-opened',
    sent: 'dot-sent',
    bounced: 'dot-bounced',
    inactive: 'dot-inactive',
  }[status] || 'dot-inactive'
  const sizeClass = size === 'md' ? 'status-dot-md' : 'status-dot-sm'
  return `<span class="status-dot ${sizeClass} ${colorClass}"></span>`
}

// ── SOAP Card ──

export function renderSOAPCard() {
  const mentors = [
    { name: 'Dr. Maria Santos', detail: "Family Medicine, Bakersfield \u2014 SOAP '21", id: 'alumni_003' },
    { name: 'Dr. Ryan Park', detail: "Internal Medicine, Portland \u2014 SOAP '20", id: null },
    { name: 'Dr. Nicole Adams', detail: "Pediatrics, Eugene \u2014 SOAP '22", id: null },
  ]

  return `
  <div class="card mb-6" style="border-color: rgba(212,162,74,0.3);">
    <div style="border-left: 4px solid var(--gold); padding: 24px;">
      <div class="flex items-start gap-4">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--gold-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg class="icon-xl" style="color:var(--amber-700)"><use href="./css/icons.svg#handshake"></use></svg>
        </div>
        <div class="flex-1">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--amber-700);margin-bottom:4px;">
            SOAP Mentorship \u2014 Match Day 2026
          </div>
          <h3 style="font-size:18px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">
            14 of 15 unmatched students placed
          </h3>
          <p class="text-sm text-gray-500 mb-4" style="line-height:1.6;">
            Three alumni who went through the SOAP process volunteered to mentor students who didn't match.
            Marion Safawi coordinated. In 24 hours, they helped place all but one.
          </p>

          <div class="space-y-2 mb-4">
            ${mentors.map(m => `
              <button class="flex items-center gap-2 text-sm ${m.id ? 'text-burgundy' : 'text-gray-600'}" style="cursor:${m.id ? 'pointer' : 'default'}" ${m.id ? `data-action="navigate" data-view="profile" data-id="${m.id}"` : ''}>
                <span style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;"></span>
                <span class="font-semibold">${m.name}</span>
                <span class="text-gray-400">\u2014</span>
                <span class="text-gray-500">${m.detail}</span>
              </button>
            `).join('')}
          </div>

          <blockquote style="font-size:14px;font-style:italic;color:var(--gray-500);border-left:2px solid rgba(212,162,74,0.4);padding-left:12px;margin-bottom:16px;">
            "I was in your shoes three years ago. It turned out to be the best thing that ever happened to me."
          </blockquote>

          <button class="flex items-center gap-1 text-sm font-semibold text-burgundy" data-action="navigate" data-view="profile" data-id="alumni_003" style="transition:color 0.15s;">
            View SOAP mentor profiles
            <svg class="icon icon-sm"><use href="./css/icons.svg#chevron-right"></use></svg>
          </button>
        </div>
      </div>
    </div>
  </div>`
}

// ── Compliance Badges ──

export function renderPrototypeBadge() {
  return `<span class="badge-prototype">Prototype</span>`
}

export function renderHumanReviewsBadge() {
  return `<div class="human-reviews-badge">
    <svg class="icon"><use href="./css/icons.svg#hand"></use></svg>
    Draft only \u2014 a human reviews and sends every message
  </div>`
}

export function renderSampleDataDisclaimer() {
  return `<p class="disclaimer">All data shown is sample/illustrative. Built to demonstrate system capabilities using realistic scenarios. No actual alumni records are included.</p>`
}

export function renderFerpaNotice() {
  return `<div class="ferpa-notice">
    <svg class="icon"><use href="./css/icons.svg#shield"></use></svg>
    <p>All alumni data sourced from FERPA-compliant channels. Public federal data (NPPES) requires no consent. Personal details are voluntary and revocable. One-click opt-out honored in all outreach.</p>
  </div>`
}
