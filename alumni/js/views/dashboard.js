// ============================================================
// DASHBOARD VIEW — full vanilla port of DashboardView.jsx
// Stat cards, Chart.js bar + pie charts, campus comparison, SOAP
// ============================================================

import { getEngagementCount } from '../utils/helpers.js'
import { renderCampusToggle, renderSOAPCard } from '../components.js'
import { setDashboardCampus, navigate } from '../state.js'
import { registerChart } from '../app.js'

// Brand chart colors
const COLORS = {
  burgundy: '#8b2230',
  gold: '#d4a24a',
  gray: '#9ca3af',
}

// ── Render ──

export function renderDashboard(state) {
  const { alumni, dashboardCampus } = state

  const filtered = dashboardCampus === 'all'
    ? alumni
    : alumni.filter(a => a.campus === dashboardCampus)

  const totalDisplay = dashboardCampus === 'all' ? '~7,042' : dashboardCampus === 'pomona' ? '~4,695' : '~2,347'
  const mentorCount = filtered.filter(a => a.engagement.is_mentor).length
  const donorCount = filtered.filter(a => a.engagement.is_donor).length

  // Campus comparison data
  const pomona = alumni.filter(a => a.campus === 'pomona')
  const lebanon = alumni.filter(a => a.campus === 'lebanon')

  const campusComparison = dashboardCampus === 'all' ? `
    <div class="card" style="padding:24px;margin-bottom:32px">
      <h3 class="text-base font-bold mb-4" style="color:var(--gray-900)">Two Campuses, Two Communities</h3>
      <div class="grid grid-2 gap-6">
        ${renderCampusCard('Pomona, CA', '~4,695', pomona.length, pomona.filter(a => getEngagementCount(a) > 0).length, pomona.filter(a => a.engagement.is_mentor).length, 'LA / San Diego', '1977')}
        ${renderCampusCard('Lebanon, OR', '~2,347', lebanon.length, lebanon.filter(a => getEngagementCount(a) > 0).length, lebanon.filter(a => a.engagement.is_mentor).length, 'OR / WA / PNW', '2011')}
      </div>
    </div>` : ''

  return `
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold" style="color:var(--gray-900)">Dashboard</h1>
        <p class="text-sm text-gray-400">The big picture — for the board, the president, COCA</p>
      </div>
      ${renderCampusToggle(dashboardCampus, 'dash-campus')}
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-4 gap-4 mb-8">
      ${renderStatCard('Total Alumni Located', totalDisplay, 'Matched via NPI Registry', true)}
      ${renderStatCard('States + Territories', '48', 'Nationwide presence', false)}
      ${renderStatCard('Active Mentors', mentorCount, 'Currently mentoring students', false)}
      ${renderStatCard('Donors', donorCount, "Contributing to Dean's Fund", false)}
    </div>

    <!-- Charts -->
    <div class="grid grid-2 gap-6 mb-8">
      <div class="card" style="padding:24px">
        <h3 class="text-base font-bold mb-4" style="color:var(--gray-900)">Specialty Distribution</h3>
        <p class="text-xs text-gray-400 mb-4">From ${filtered.length} sample records</p>
        <canvas id="specialty-chart" height="200"></canvas>
      </div>
      <div class="card" style="padding:24px">
        <h3 class="text-base font-bold mb-4" style="color:var(--gray-900)">Engagement Distribution</h3>
        <p class="text-xs text-gray-400 mb-4">Based on engagement checkboxes</p>
        <canvas id="engagement-chart" height="200"></canvas>
        <div id="engagement-legend" style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:8px"></div>
      </div>
    </div>

    ${campusComparison}

    <!-- SOAP Impact -->
    <div class="mb-8">
      <h3 class="text-base font-bold mb-4" style="color:var(--gray-900)">Impact Stories</h3>
      ${renderSOAPCard()}
    </div>

    <!-- Footer note -->
    <div class="text-center" style="padding:16px 0">
      <p class="text-xs text-gray-400">Dashboard showing ${filtered.length} sample records. Full dataset (${totalDisplay} alumni) populates when Lisa's graduate list is connected.</p>
    </div>
  `
}

function renderStatCard(label, value, note, accent) {
  const bg = accent
    ? 'background:rgba(139,34,48,0.05);border-color:rgba(139,34,48,0.15)'
    : 'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)'
  const valColor = accent ? 'color:var(--burgundy)' : 'color:var(--gray-800)'

  return `<div class="card" style="padding:20px;${bg}">
    <div class="text-xs font-bold text-gray-400 mb-2" style="text-transform:uppercase;letter-spacing:0.05em;font-size:10px">${label}</div>
    <div class="text-2xl font-bold mb-1" style="${valColor}">${value}</div>
    <div class="text-xs text-gray-400">${note}</div>
  </div>`
}

function renderCampusCard(name, total, sampleCount, engaged, mentors, corridor, founded) {
  const rows = [
    ['Total Alumni', total],
    ['Sample Records', sampleCount],
    ['Engaged (sample)', engaged],
    ['Active Mentors', mentors],
    ['Primary Corridor', corridor],
    ['Founded', founded],
  ]
  return `<div style="border:1px solid var(--gray-200);border-radius:8px;padding:20px">
    <h4 class="text-lg font-bold mb-3" style="color:var(--burgundy)">${name}</h4>
    <div class="space-y-2">
      ${rows.map(([label, val]) => `
        <div class="flex justify-between text-sm" style="padding:4px 0;border-bottom:1px solid var(--gray-50)">
          <span class="text-gray-400">${label}</span>
          <span class="font-semibold text-gray-800">${val}</span>
        </div>`).join('')}
    </div>
  </div>`
}

// ── Chart Creation (called from wireEvents after DOM render) ──

function createCharts(filtered) {
  // Specialty distribution — horizontal bar chart
  const specMap = {}
  filtered.forEach(a => {
    const s = a.professional.specialty
    specMap[s] = (specMap[s] || 0) + 1
  })
  const specData = Object.entries(specMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const specCanvas = document.getElementById('specialty-chart')
  if (specCanvas) {
    const chart = new Chart(specCanvas, {
      type: 'bar',
      data: {
        labels: specData.map(d => d.name),
        datasets: [{
          data: specData.map(d => d.count),
          backgroundColor: COLORS.burgundy,
          borderRadius: 4,
          barPercentage: 0.7,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { size: 11 }, color: '#9ca3af' },
            grid: { color: '#f0f0f0', drawBorder: false },
          },
          y: {
            ticks: { font: { size: 11 }, color: '#6b7280' },
            grid: { display: false },
          },
        },
      },
    })
    registerChart(chart)
  }

  // Engagement distribution — pie chart
  const engDist = [
    { name: 'Highly Engaged (4+)', value: filtered.filter(a => getEngagementCount(a) >= 4).length, color: COLORS.burgundy },
    { name: 'Moderately Engaged (1-3)', value: filtered.filter(a => { const c = getEngagementCount(a); return c >= 1 && c < 4 }).length, color: COLORS.gold },
    { name: 'Not Yet Engaged', value: filtered.filter(a => getEngagementCount(a) === 0).length, color: COLORS.gray },
  ].filter(d => d.value > 0)

  const engCanvas = document.getElementById('engagement-chart')
  if (engCanvas) {
    const chart = new Chart(engCanvas, {
      type: 'pie',
      data: {
        labels: engDist.map(d => d.name),
        datasets: [{
          data: engDist.map(d => d.value),
          backgroundColor: engDist.map(d => d.color),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw}`,
            },
          },
        },
      },
    })
    registerChart(chart)

    // Custom legend
    const legendEl = document.getElementById('engagement-legend')
    if (legendEl) {
      legendEl.innerHTML = engDist.map(d =>
        `<div class="flex items-center gap-2 text-xs text-gray-500">
          <span style="width:10px;height:10px;border-radius:50%;background:${d.color};flex-shrink:0"></span>
          <span class="font-semibold text-gray-800">${d.value}</span>
          <span>${d.name}</span>
        </div>`
      ).join('')
    }
  }
}

// ── Events ──

export function wireDashboardEvents(state) {
  const { alumni, dashboardCampus } = state

  // Campus toggle
  document.querySelectorAll('[data-action="campus-toggle"][data-name="dash-campus"]').forEach(el =>
    el.addEventListener('click', () => setDashboardCampus(el.dataset.value))
  )

  // Navigate links (SOAP card)
  document.querySelectorAll('[data-action="navigate"]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.view, el.dataset.id))
  )

  // Create charts after DOM is ready
  const filtered = dashboardCampus === 'all'
    ? alumni
    : alumni.filter(a => a.campus === dashboardCampus)
  createCharts(filtered)
}
