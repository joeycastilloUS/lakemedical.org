// ============================================================
// STATE MANAGEMENT — Global state object + mutation functions
// Vanilla port of React useReducer
// ============================================================

let _state = null
let _renderCallback = null

export function initState(alumni, triggers) {
  _state = {
    // Navigation
    currentView: 'queue',
    selectedAlumniId: null,
    previousView: null,

    // Queue
    queueFilter: 'all',
    queueCampusFilter: 'all',
    queueItems: triggers.filter(t => t.status === 'pending'),
    archivedItems: [],

    // Directory
    directorySearch: '',
    directoryFilters: {
      campus: 'all',
      specialty: 'all',
      engagementType: [],
      tags: [],
      classYear: 'all',
    },
    directorySortBy: 'name',

    // Alumni data (mutable)
    alumni: alumni,

    // Outreach panel
    outreachPanelOpen: false,
    outreachDraft: null,

    // Profile interactions
    addingNote: false,

    // Dashboard
    dashboardCampus: 'all',
  }
  return _state
}

export function getState() { return _state }

export function onRender(cb) { _renderCallback = cb }
export function forceRender() { if (_renderCallback) _renderCallback() }

function update(changes) {
  Object.assign(_state, changes)
  if (_renderCallback) _renderCallback()
}

function updateAlumni(alumniId, fn) {
  _state.alumni = _state.alumni.map(a => a.id === alumniId ? fn(a) : a)
  if (_renderCallback) _renderCallback()
}

// ── Navigation ──

export function navigate(view, alumniId) {
  update({
    previousView: _state.currentView,
    currentView: view,
    selectedAlumniId: alumniId || null,
    addingNote: false,
    outreachPanelOpen: false,
    outreachDraft: null,
  })
}

export function navigateDirectorySearch(search, filters) {
  update({
    previousView: _state.currentView,
    currentView: 'directory',
    selectedAlumniId: null,
    directorySearch: search || '',
    directoryFilters: filters || _state.directoryFilters,
    addingNote: false,
    outreachPanelOpen: false,
    outreachDraft: null,
  })
}

export function goBack() {
  update({
    currentView: _state.previousView || 'queue',
    selectedAlumniId: null,
    previousView: null,
    addingNote: false,
    outreachPanelOpen: false,
    outreachDraft: null,
  })
}

// ── Queue ──

export function setQueueFilter(filter) { update({ queueFilter: filter }) }
export function setQueueCampus(campus) { update({ queueCampusFilter: campus }) }

export function dismissTrigger(triggerId) {
  const item = _state.queueItems.find(t => t.id === triggerId)
  update({
    queueItems: _state.queueItems.filter(t => t.id !== triggerId),
    archivedItems: item ? [..._state.archivedItems, { ...item, status: 'archived' }] : _state.archivedItems,
  })
}

export function restoreTrigger(triggerId) {
  const item = _state.archivedItems.find(t => t.id === triggerId)
  update({
    archivedItems: _state.archivedItems.filter(t => t.id !== triggerId),
    queueItems: item ? [..._state.queueItems, { ...item, status: 'pending' }] : _state.queueItems,
  })
}

// ── Directory ──

export function setDirectorySearch(search) { update({ directorySearch: search }) }
export function setDirectoryFilters(filters) {
  update({ directoryFilters: { ..._state.directoryFilters, ...filters } })
}
export function setDirectorySort(sortBy) { update({ directorySortBy: sortBy }) }

// ── Alumni Record Mutations ──

export function addNote(alumniId, text, author) {
  const newNote = {
    date: new Date().toISOString().split('T')[0],
    author: author || 'Dr. Warren',
    text: text,
  }
  const newTouchpoint = {
    date: newNote.date,
    type: 'note',
    icon: '\u{1F4DD}',
    title: `Note added by ${newNote.author}`,
    detail: text,
    added_by: newNote.author,
    source: 'manual',
  }
  updateAlumni(alumniId, a => ({
    ...a,
    notes: [newNote, ...a.notes],
    touchpoints: [newTouchpoint, ...a.touchpoints],
  }))
  update({ addingNote: false })
}

export function toggleEngagement(alumniId, field) {
  updateAlumni(alumniId, a => ({
    ...a,
    engagement: { ...a.engagement, [field]: !a.engagement[field] },
  }))
}

export function addNotable(alumniId, notable) {
  updateAlumni(alumniId, a => ({
    ...a,
    notables: [...a.notables, notable],
  }))
}

// ── Outreach Panel ──

export function openOutreach(draft) {
  update({ outreachPanelOpen: true, outreachDraft: draft })
}

export function closeOutreach() {
  update({ outreachPanelOpen: false, outreachDraft: null })
}

export function markOutreachSent(alumniId) {
  const outreachEntry = {
    date: new Date().toISOString().split('T')[0],
    subject: _state.outreachDraft?.subject || 'Outreach',
    status: 'sent',
    channel: 'email',
  }
  const touchpoint = {
    date: outreachEntry.date,
    type: 'outreach',
    icon: '\u{1F4E7}',
    title: outreachEntry.subject,
    detail: 'Marked as sent from prototype.',
    added_by: 'Dr. Warren',
    source: 'outreach_engine',
  }
  updateAlumni(alumniId, a => ({
    ...a,
    outreach_history: [outreachEntry, ...a.outreach_history],
    touchpoints: [touchpoint, ...a.touchpoints],
  }))
  update({ outreachPanelOpen: false, outreachDraft: null })
}

// ── Profile ──

export function setAddingNote(value) { update({ addingNote: value }) }

// ── Dashboard ──

export function setDashboardCampus(campus) { update({ dashboardCampus: campus }) }
