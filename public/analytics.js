// ═══════════════════════════════════════════════════════════════════════════════
// TAP+ ANALYTICS MODULE — public/analytics.js
// Requires Chart.js (already in index.html)
// Plugs into State, API, esc() from app.js
// Provides:
//   renderAnalyticsTab(body)  — for bizAdmin/manager dashboard tab
//   renderSAAnalytics(body)   — for super admin Analytics tab
// ═══════════════════════════════════════════════════════════════════════════════

// ── Chart instance registry ───────────────────────────────────────────────────
const _aC = {};
function _aDestroy(id) { if (_aC[id]) { _aC[id].destroy(); delete _aC[id]; } }

// ── Color palette (one per business/line) ─────────────────────────────────────
const _PALETTE = [
  '#00e5a0','#4facfe','#ffd166','#a78bfa','#ff8c42',
  '#ff4455','#02c39a','#f4a261','#e76f51','#457b9d',
  '#2a9d8f','#e9c46a','#f72585','#7209b7','#3a86ff',
];

// ── Grouping helpers ──────────────────────────────────────────────────────────
function _groupKey(ts, grouping) {
  const d = new Date(ts);
  switch (grouping) {
    case 'day':     return `${d.getMonth()+1}/${d.getDate()}`;
    case 'week': {
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay()+6)%7));
      return `${mon.getMonth()+1}/${mon.getDate()}`;
    }
    case 'month':   return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    case 'quarter': return `Q${Math.ceil((d.getMonth()+1)/3)} ${d.getFullYear()}`;
    case 'year':    return String(d.getFullYear());
    default:        return `${d.getMonth()+1}/${d.getDate()}`;
  }
}

function _periodRange(period) {
  const now = Date.now();
  const DAY = 86400000;
  switch (period) {
    case 'daily':     return { start: now - 7*DAY,   grouping: 'day' };
    case 'weekly':    return { start: now - 8*7*DAY, grouping: 'week' };
    case 'monthly':   return { start: now - 12*30*DAY, grouping: 'month' };
    case 'quarterly': return { start: now - 4*91*DAY,  grouping: 'quarter' };
    case 'yearly':    return { start: now - 3*365*DAY, grouping: 'year' };
    case 'alltime':   return { start: 0,             grouping: 'month' }; // overridden by user
    default:          return { start: now - 30*DAY,  grouping: 'day' };
  }
}

function _calcMetricValue(metric, taps) {
  const rated = taps.filter(t => t.rating);
  switch (metric) {
    case 'taps':      return taps.length;
    case 'fivestar':  return rated.filter(t => t.rating === 5).length;
    case 'avgrating': return rated.length
      ? parseFloat((rated.reduce((s,t) => s+t.rating,0)/rated.length).toFixed(2)) : 0;
    case 'ctr':       return taps.length
      ? Math.round(rated.length/taps.length*100) : 0;
    default:          return taps.length;
  }
}

function _buildSeriesData(taps, start, grouping, metric) {
  const filtered = taps.filter(t => t.ts >= start);
  // Group taps by period key
  const groups = {};
  filtered.forEach(t => {
    const k = _groupKey(t.ts, grouping);
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  });
  // Sort keys
  const keys = Object.keys(groups).sort((a,b) => {
    // Parse first tap ts in each group for sorting
    const fa = groups[a][0]?.ts || 0;
    const fb = groups[b][0]?.ts || 0;
    return fa - fb;
  });
  return { labels: keys, data: keys.map(k => _calcMetricValue(metric, groups[k])) };
}

function _growthPct(data) {
  if (data.length < 2) return null;
  const prev = data[data.length-2];
  const curr = data[data.length-1];
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function _statCards(allSeries, metric) {
  // allSeries: [{name, data}]
  const allVals = allSeries.flatMap(s => s.data);
  const total = allVals.reduce((s,v) => s+v, 0);
  const latest = allSeries.map(s => s.data[s.data.length-1] || 0);
  const latestTotal = latest.reduce((s,v) => s+v, 0);
  const prev = allSeries.map(s => s.data[s.data.length-2] || 0);
  const prevTotal = prev.reduce((s,v) => s+v, 0);
  const growth = prevTotal > 0 ? Math.round(((latestTotal-prevTotal)/prevTotal)*100) : null;
  const metricLabel = {taps:'Total Taps',fivestar:'5★ Reviews',avgrating:'Avg Rating',ctr:'CTR %'}[metric]||metric;
  const metricUnit  = {taps:'',fivestar:'',avgrating:'★',ctr:'%'}[metric]||'';
  const displayVal  = metric === 'avgrating'
    ? (allSeries.length ? (allSeries.reduce((s,x)=>s+(x.data[x.data.length-1]||0),0)/allSeries.length).toFixed(1) : '—')
    : latestTotal;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px">
        <div style="font-size:26px;font-weight:900;color:#00e5a0">${displayVal}${metricUnit}</div>
        <div style="font-size:11px;color:rgba(238,240,248,.4);margin-top:2px">Latest ${metricLabel}</div>
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px">
        <div style="font-size:26px;font-weight:900;color:${growth===null?'rgba(238,240,248,.4)':growth>=0?'#00e5a0':'#ff4455'}">
          ${growth===null?'—':(growth>=0?'+':'')+growth+'%'}
        </div>
        <div style="font-size:11px;color:rgba(238,240,248,.4);margin-top:2px">vs Previous Period</div>
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px">
        <div style="font-size:26px;font-weight:900;color:#4facfe">${allSeries.length}</div>
        <div style="font-size:11px;color:rgba(238,240,248,.4);margin-top:2px">Location${allSeries.length!==1?'s':''}</div>
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px">
        <div style="font-size:26px;font-weight:900;color:#ffd166">${total}</div>
        <div style="font-size:11px;color:rgba(238,240,248,.4);margin-top:2px">All Time ${metricLabel}</div>
      </div>
    </div>`;
}

// ── Draw line chart ───────────────────────────────────────────────────────────
function _drawLineChart(canvasId, labels, datasets, metric) {
  _aDestroy(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const isRating = metric === 'avgrating';

  Chart.defaults.color = 'rgba(238,240,248,.4)';
  Chart.defaults.borderColor = 'rgba(255,255,255,.06)';
  Chart.defaults.font.family = "'Nunito',sans-serif";

  _aC[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'bottom',
          labels: {
            color: 'rgba(238,240,248,.55)',
            font: { family: "'Nunito',sans-serif", size: 11 },
            boxWidth: 12,
            padding: 14,
          }
        },
        tooltip: {
          backgroundColor: '#1a1b26',
          borderColor: 'rgba(255,255,255,.1)',
          borderWidth: 1,
          padding: 10,
          titleColor: 'rgba(238,240,248,.9)',
          bodyColor: 'rgba(238,240,248,.6)',
          callbacks: {
            label: ctx => {
              const unit = {taps:' taps',fivestar:' reviews',avgrating:'★',ctr:'%'}[metric]||'';
              return ` ${ctx.dataset.label}: ${ctx.parsed.y}${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: 'rgba(238,240,248,.35)', maxTicksLimit: 8, font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,.05)' },
          beginAtZero: !isRating,
          min: isRating ? 1 : undefined,
          max: isRating ? 5 : undefined,
          ticks: {
            color: 'rgba(238,240,248,.35)',
            font: { size: 10 },
            callback: v => isRating ? v+'★' : metric === 'ctr' ? v+'%' : v
          }
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS TAB — single business
// ═══════════════════════════════════════════════════════════════════════════════
function renderAnalyticsTab(body) {
  let period   = 'monthly';
  let grouping = 'month';
  let metric   = 'taps';

  const PERIODS = [
    { id:'daily',     label:'Daily' },
    { id:'weekly',    label:'Weekly' },
    { id:'monthly',   label:'Monthly' },
    { id:'quarterly', label:'Quarterly' },
    { id:'yearly',    label:'Yearly' },
    { id:'alltime',   label:'All Time' },
  ];
  const GROUPINGS = [
    { id:'day',     label:'By Day' },
    { id:'week',    label:'By Week' },
    { id:'month',   label:'By Month' },
    { id:'quarter', label:'By Quarter' },
    { id:'year',    label:'By Year' },
  ];
  const METRICS = [
    { id:'taps',      label:'Taps' },
    { id:'fivestar',  label:'5★ Reviews' },
    { id:'avgrating', label:'Avg Rating' },
    { id:'ctr',       label:'CTR %' },
  ];

  function draw() {
    const taps = State.taps || [];
    const biz  = State.biz;
    const { start } = _periodRange(period);
    const grp = period === 'alltime' ? grouping : _periodRange(period).grouping;
    const { labels, data } = _buildSeriesData(taps, start, grp, metric);
    const color = '#00e5a0';

    const allSeries = [{ name: biz?.name || 'This Location', data }];

    body.innerHTML = `
      <div style="font-weight:700;font-size:15px;margin-bottom:14px">📈 Analytics</div>

      ${_statCards(allSeries, metric)}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${PERIODS.map(p => `
          <button onclick="window._aPeriod('${p.id}')"
            style="padding:7px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
              border:1px solid ${period===p.id?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
              background:${period===p.id?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
              color:${period===p.id?'#00e5a0':'rgba(238,240,248,.5)'}">
            ${p.label}
          </button>`).join('')}
      </div>

      ${period === 'alltime' ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${GROUPINGS.map(g => `
            <button onclick="window._aGroup('${g.id}')"
              style="padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
                border:1px solid ${grouping===g.id?'rgba(79,172,254,.4)':'rgba(255,255,255,.08)'};
                background:${grouping===g.id?'rgba(79,172,254,.1)':'rgba(255,255,255,.03)'};
                color:${grouping===g.id?'#4facfe':'rgba(238,240,248,.4)'}">
              ${g.label}
            </button>`).join('')}
        </div>` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
        ${METRICS.map(m => `
          <button onclick="window._aMetric('${m.id}')"
            style="padding:7px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
              border:1px solid ${metric===m.id?'rgba(167,139,250,.4)':'rgba(255,255,255,.1)'};
              background:${metric===m.id?'rgba(167,139,250,.12)':'rgba(255,255,255,.04)'};
              color:${metric===m.id?'#a78bfa':'rgba(238,240,248,.5)'}">
            ${m.label}
          </button>`).join('')}
      </div>

      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px">
        ${labels.length === 0
          ? '<div style="text-align:center;color:rgba(238,240,248,.3);padding:40px 0">No data for this period.</div>'
          : `<div style="height:240px"><canvas id="a-chart"></canvas></div>`
        }
      </div>`;

    if (labels.length > 0) {
      setTimeout(() => _drawLineChart('a-chart', labels, [{
        label: biz?.name || 'This Location',
        data,
        borderColor: color,
        backgroundColor: color + '18',
        pointBackgroundColor: color,
        pointBorderColor: '#07080c',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
        spanGaps: true,
      }], metric), 30);
    }

    window._aPeriod  = v => { period = v; draw(); };
    window._aGroup   = v => { grouping = v; draw(); };
    window._aMetric  = v => { metric = v; draw(); };
  }

  draw();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN ANALYTICS — all businesses
// Called from super admin dashboard as a tab
// ═══════════════════════════════════════════════════════════════════════════════
async function renderSAAnalytics(body) {
  body.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 10px"></div><div style="font-size:13px;color:rgba(238,240,248,.35)">Loading analytics…</div></div>';

  // Load all businesses
  let allBiz = [];
  try {
    const r = await fetch('/api/business?listAll=1', {
      headers: { 'Authorization': 'Bearer ' + API.auth.getToken() }
    });
    const d = await r.json();
    allBiz = d.businesses || [];
  } catch(e) {
    body.innerHTML = '<div style="color:var(--red);text-align:center;padding:40px">Failed to load businesses.</div>';
    return;
  }

  if (!allBiz.length) {
    body.innerHTML = '<div style="color:rgba(238,240,248,.35);text-align:center;padding:40px">No businesses yet.</div>';
    return;
  }

  // Load taps for each business
  body.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 10px"></div><div style="font-size:13px;color:rgba(238,240,248,.35)">Loading tap data…</div></div>';

  const bizTaps = {}; // bizId -> taps[]
  await Promise.all(allBiz.map(async biz => {
    try {
      const d = await API.taps.list({ bizId: biz.id });
      bizTaps[biz.id] = d.taps || [];
    } catch(e) { bizTaps[biz.id] = []; }
  }));

  // State
  let period      = 'monthly';
  let grouping    = 'month';
  let metric      = 'taps';
  let visible     = new Set(allBiz.map(b => b.id)); // all visible by default

  const PERIODS = [
    { id:'daily',     label:'Daily' },
    { id:'weekly',    label:'Weekly' },
    { id:'monthly',   label:'Monthly' },
    { id:'quarterly', label:'Quarterly' },
    { id:'yearly',    label:'Yearly' },
    { id:'alltime',   label:'All Time' },
  ];
  const GROUPINGS = [
    { id:'day',     label:'By Day' },
    { id:'week',    label:'By Week' },
    { id:'month',   label:'By Month' },
    { id:'quarter', label:'By Quarter' },
    { id:'year',    label:'By Year' },
  ];
  const METRICS = [
    { id:'taps',      label:'Taps' },
    { id:'fivestar',  label:'5★ Reviews' },
    { id:'avgrating', label:'Avg Rating' },
    { id:'ctr',       label:'CTR %' },
  ];

  function draw() {
    const { start } = _periodRange(period);
    const grp = period === 'alltime' ? grouping : _periodRange(period).grouping;

    // Build series for visible businesses
    const visBiz = allBiz.filter(b => visible.has(b.id));
    const allSeries = visBiz.map((biz, i) => {
      const { labels, data } = _buildSeriesData(bizTaps[biz.id]||[], start, grp, metric);
      return { name: biz.name, id: biz.id, labels, data, color: _PALETTE[i % _PALETTE.length] };
    });

    // Merge all labels
    const labelSet = new Set();
    allSeries.forEach(s => s.labels.forEach(l => labelSet.add(l)));
    const mergedLabels = Array.from(labelSet).sort();

    // Align each series to merged labels
    const datasets = allSeries.map(s => {
      const map = {};
      s.labels.forEach((l,i) => { map[l] = s.data[i]; });
      return {
        label: s.name,
        data: mergedLabels.map(l => map[l] ?? null),
        borderColor: s.color,
        backgroundColor: s.color + '18',
        pointBackgroundColor: s.color,
        pointBorderColor: '#07080c',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: false,
        spanGaps: true,
      };
    });

    body.innerHTML = `
      <div style="font-weight:700;font-size:15px;margin-bottom:14px">📈 Platform Analytics</div>

      ${_statCards(allSeries, metric)}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${PERIODS.map(p => `
          <button onclick="window._saPeriod('${p.id}')"
            style="padding:7px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
              border:1px solid ${period===p.id?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
              background:${period===p.id?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
              color:${period===p.id?'#00e5a0':'rgba(238,240,248,.5)'}">
            ${p.label}
          </button>`).join('')}
      </div>

      ${period === 'alltime' ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${GROUPINGS.map(g => `
            <button onclick="window._saGroup('${g.id}')"
              style="padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
                border:1px solid ${grouping===g.id?'rgba(79,172,254,.4)':'rgba(255,255,255,.08)'};
                background:${grouping===g.id?'rgba(79,172,254,.1)':'rgba(255,255,255,.03)'};
                color:${grouping===g.id?'#4facfe':'rgba(238,240,248,.4)'}">
              ${g.label}
            </button>`).join('')}
        </div>` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
        ${METRICS.map(m => `
          <button onclick="window._saMetric('${m.id}')"
            style="padding:7px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
              border:1px solid ${metric===m.id?'rgba(167,139,250,.4)':'rgba(255,255,255,.1)'};
              background:${metric===m.id?'rgba(167,139,250,.12)':'rgba(255,255,255,.04)'};
              color:${metric===m.id?'#a78bfa':'rgba(238,240,248,.5)'}">
            ${m.label}
          </button>`).join('')}
      </div>

      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;margin-bottom:14px">
        ${mergedLabels.length === 0
          ? '<div style="text-align:center;color:rgba(238,240,248,.3);padding:40px 0">No data for this period.</div>'
          : `<div style="height:260px"><canvas id="sa-chart"></canvas></div>`
        }
      </div>

      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(238,240,248,.35);margin-bottom:10px">
        Filter Businesses
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px">
        <button onclick="window._saToggleAll()"
          style="padding:7px 13px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
            border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:rgba(238,240,248,.6)">
          ${visible.size === allBiz.length ? 'Deselect All' : 'Select All'}
        </button>
        ${allBiz.map((biz, i) => {
          const col = _PALETTE[i % _PALETTE.length];
          const on  = visible.has(biz.id);
          return `<button onclick="window._saTogBiz('${biz.id}')"
            style="padding:7px 13px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;
              border:2px solid ${on?col:'rgba(255,255,255,.1)'};
              background:${on?col+'22':'rgba(255,255,255,.03)'};
              color:${on?col:'rgba(238,240,248,.35)'}">
            ${esc(biz.name)}
          </button>`;
        }).join('')}
      </div>`;

    if (mergedLabels.length > 0) {
      setTimeout(() => _drawLineChart('sa-chart', mergedLabels, datasets, metric), 30);
    }

    window._saPeriod   = v => { period = v; draw(); };
    window._saGroup    = v => { grouping = v; draw(); };
    window._saMetric   = v => { metric = v; draw(); };
    window._saTogBiz   = id => {
      if (visible.has(id)) { if (visible.size > 1) visible.delete(id); }
      else visible.add(id);
      draw();
    };
    window._saToggleAll = () => {
      if (visible.size === allBiz.length) {
        visible = new Set([allBiz[0]?.id].filter(Boolean));
      } else {
        visible = new Set(allBiz.map(b => b.id));
      }
      draw();
    };
  }

  draw();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook into Super Admin dashboard — add Analytics tab
// Called after renderSuperAdminDashboard sets up the tab bar
// ═══════════════════════════════════════════════════════════════════════════════
(function patchSuperAdminAnalytics() {
  // We override window._saT after it's defined by renderSuperAdminDashboard
  // by wrapping the original function
  const _origRoute = window.route;
  if (typeof window !== 'undefined') {
    // Patch _saT whenever super admin dashboard renders
    const _origRenderSA = window.renderSuperAdminDashboard;
    if (typeof _origRenderSA === 'function') {
      window.renderSuperAdminDashboard = function() {
        _origRenderSA();
        _patchSaT();
      };
    }
  }
})();

function _patchSaT() {
  // Add Analytics tab to super admin tab bar
  const tabBar = document.querySelector('.tabs');
  if (!tabBar) return;

  // Check if already added
  if (document.getElementById('sa-analytics-tab')) return;

  const btn = document.createElement('button');
  btn.id = 'sa-analytics-tab';
  btn.className = 'tab';
  btn.textContent = '📈 Analytics';
  btn.onclick = function() {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const body = document.getElementById('sa-body');
    if (body) renderSAAnalytics(body);
  };
  tabBar.appendChild(btn);
}

// Auto-patch on DOMContentLoaded in case SA dashboard is already rendered
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_patchSaT, 500);
});

// Also expose so app.js renderSuperAdminDashboard can call it directly
window.renderSAAnalytics = renderSAAnalytics;
window.renderAnalyticsTab = renderAnalyticsTab;
