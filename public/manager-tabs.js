function _weekTaps(taps){
  const mon=new Date();mon.setDate(mon.getDate()-((mon.getDay()+6)%7));mon.setHours(0,0,0,0);
  return taps.filter(t=>t.ts>=mon.getTime());
}
function _streak(taps){
  const days=new Set(taps.map(t=>{const d=new Date(t.ts);return`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;}));
  let streak=0,d=new Date();
  for(let i=0;i<30;i++){
    const key=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if(days.has(key)){streak++;d.setDate(d.getDate()-1);}else break;
  }
  return streak;
}
function _score(st){
  const rated=st.filter(t=>t.rating);
  const five=rated.filter(t=>t.rating===5).length;
  const reviews=rated.filter(t=>t.rating>=4).length;
  return st.length*10+reviews*15+five*5;
}

function renderTeamTab(body){
  const allStaff = State.staff.filter(s=>s.active);
  const allTaps  = State.taps;
  let view    = 'leaderboard';
  let period  = 'week';
  let chartMode = 'donut';
  // Shifts view state
  const shifts = State.biz?.shifts || [];
  let selShift = 'all';
  let shiftPeriod = 'week';
  let selStaff  = []; // empty = all staff
  let shiftMetric = 'taps';
  const COLORS = ['#00e5a0','#ffd166','#4facfe','#a78bfa','#ff8c42','#ff4455','#02c39a','#f4a261'];
  const medals = ['🥇','🥈','🥉'];

  // ── Helpers ──────────────────────────────────────────────────────────────
  function periodRange(p){
    const now = Date.now();
    const d   = new Date();
    switch(p){
      case 'today':
        d.setHours(0,0,0,0); return { start: d.getTime(), label: 'Today' };
      case 'week':
        d.setDate(d.getDate()-((d.getDay()+6)%7)); d.setHours(0,0,0,0);
        return { start: d.getTime(), label: 'This Week' };
      case 'month':
        d.setDate(1); d.setHours(0,0,0,0);
        return { start: d.getTime(), label: 'This Month' };
      case 'alltime':
        return { start: 0, label: 'All Time' };
      default:
        return { start: 0, label: 'All Time' };
    }
  }

  function filterTaps(taps, p){
    const { start } = periodRange(p);
    return taps.filter(t => (t.ts||0) >= start);
  }

  function shiftLabel(sh){
    if(sh === 'all') return 'All Shifts';
    const s = shifts.find(s=>s.id===sh);
    return s ? s.name : 'Unknown';
  }

  function tapsInShift(taps, shiftId){
    if(shiftId === 'all' || !shifts.length) return taps;
    const sh = shifts.find(s=>s.id===shiftId);
    if(!sh) return taps;
    return taps.filter(t=>{
      const d = new Date(t.ts||0);
      const mins = d.getHours()*60 + d.getMinutes();
      const [sh_h, sh_m] = sh.start.split(':').map(Number);
      const [eh_h, eh_m] = sh.end.split(':').map(Number);
      const startMins = sh_h*60+sh_m;
      const endMins   = eh_h*60+eh_m;
      if(endMins > startMins) return mins >= startMins && mins < endMins;
      return mins >= startMins || mins < endMins; // overnight shift
    });
  }

  function staffStats(s, taps){
    const st    = taps.filter(t=>t.staffId===s.id);
    const rated = st.filter(t=>t.rating);
    const five  = rated.filter(t=>t.rating===5).length;
    const reviews = rated.filter(t=>t.rating>=4).length;
    const avg   = rated.length?(rated.reduce((a,t)=>a+t.rating,0)/rated.length).toFixed(1):'0';
    const ctr   = st.length?Math.round(rated.length/st.length*100):0;
    const score = _score(st);
    const streak= _streak(allTaps.filter(t=>t.staffId===s.id));
    return{...s, st, rated, five, reviews, avg, ctr, score, streak};
  }

  function periodButtons(current, setter){
    return ['today','week','month','alltime'].map(p=>{
      const labels={today:'Today',week:'This Week',month:'This Month',alltime:'All Time'};
      const active = current===p;
      return `<button onclick="${setter}('${p}')"
        style="padding:6px 12px;border-radius:20px;border:1px solid ${active?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
        background:${active?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
        color:${active?'var(--brand)':'rgba(238,240,248,.45)'};
        font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">${labels[p]}</button>`;
    }).join('');
  }

  function subTabBtns(active){
    return ['leaderboard','shifts','analytics'].map(v=>{
      const labels={leaderboard:'🏆 Leaderboard',shifts:'⏱ Shifts',analytics:'📊 Analytics'};
      const on = active===v;
      return `<button onclick="window._teamV('${v}')"
        style="flex:1;padding:9px 6px;border-radius:20px;border:1px solid ${on?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
        background:${on?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
        color:${on?'var(--brand)':'rgba(238,240,248,.45)'};
        font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">${labels[v]}</button>`;
    }).join('');
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(){
    if(!body) return;
    const header = `
      <div style="display:flex;gap:6px;margin-bottom:14px">
        ${subTabBtns(view)}
        <button onclick="window._teamRefresh()"
          style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.04);color:rgba(238,240,248,.5);font-size:16px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">↺</button>
      </div>`;

    if(view === 'leaderboard') drawLeaderboard(header);
    else if(view === 'shifts') drawShifts(header);
    else drawAnalytics(header);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  function drawLeaderboard(header){
    const filtered   = filterTaps(allTaps, period);
    const ranked     = allStaff.map(s=>staffStats(s,filtered)).sort((a,b)=>b.score-a.score);
    const topScore   = ranked[0]?.score||1;
    const { label }  = periodRange(period);

    body.innerHTML = header + `
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
        ${periodButtons(period, 'window._lbPeriod')}
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
        <div style="font-size:28px">🏆</div>
        <div><div style="font-weight:700;font-size:14px">${label}:</div>
        <div style="font-size:12px;color:rgba(238,240,248,.45)">${filtered.length} taps recorded</div></div>
      </div>
      ${ranked.length===0
        ? `<div style="text-align:center;color:rgba(238,240,248,.35);padding:40px">No active staff yet.</div>`
        : ranked.map((s,i)=>{
            const pct = topScore ? Math.round(s.score/topScore*100) : 0;
            const isOnFire = s.streak>=3 || s.st.length>=5;
            const streakDots = Math.min(s.streak,10);
            const barColor = i===0?'linear-gradient(90deg,var(--brand),#00c48a)':i===1?'linear-gradient(90deg,#ffd166,#f4a261)':'linear-gradient(90deg,#4facfe,#a78bfa)';
            return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 16px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <div style="font-size:22px;width:28px;text-align:center">${medals[i]||i+1}</div>
                ${staffAvatar(s,44)}
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <div style="font-weight:800;font-size:15px">${esc(staffDisplay(s))}</div>
                    ${isOnFire?`<span>🔥</span><span style="background:#ff4455;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px">On Fire</span>`:''}
                  </div>
                  <div style="font-size:11px;color:rgba(238,240,248,.4);margin-top:2px">${s.st.length} taps · ${s.reviews} reviews · ${s.avg}⭐ · CTR ${s.ctr}%</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:22px;font-weight:700;color:var(--brand)">${s.score}</div>
                  <div style="font-size:10px;color:rgba(238,240,248,.35);font-weight:700">PTS</div>
                </div>
              </div>
              ${streakDots>0?`<div style="display:flex;gap:4px;margin-bottom:8px">${Array(streakDots).fill(0).map((_,j)=>`<div style="width:10px;height:10px;border-radius:50%;background:var(--brand);opacity:${0.4+j*0.06}"></div>`).join('')}</div>`:''}
              <div style="height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width .4s ease"></div>
              </div>
              <div style="font-size:10px;color:rgba(238,240,248,.25);margin-top:4px;text-align:right">${pct}%</div>
            </div>`;
          }).join('')
      }
      <div style="text-align:center;font-size:11px;color:rgba(238,240,248,.2);margin-top:4px">Score = Taps×10 + Reviews×15 + 5★×5</div>`;

    window._lbPeriod = function(p){ period=p; drawLeaderboard(header); };
  }

  // ── Shifts ────────────────────────────────────────────────────────────────
  function drawShifts(header){
    if(!shifts.length){
      body.innerHTML = header + `
        <div style="text-align:center;padding:48px 20px">
          <div style="font-size:40px;margin-bottom:16px">⏱</div>
          <div style="font-size:17px;font-weight:600;margin-bottom:8px">No shifts created yet</div>
          <div style="font-size:14px;color:var(--lbl3)">Go to Settings to create your shift schedule</div>
        </div>`;
      return;
    }

    // Filter taps by shift + period
    const periodTaps  = filterTaps(allTaps, shiftPeriod);
    const shiftTaps   = tapsInShift(periodTaps, selShift);

    // Staff filter buttons
    const displayStaff = selStaff.length ? allStaff.filter(s=>selStaff.includes(s.id)) : allStaff;
    const stats = allStaff.map(s=>staffStats(s, shiftTaps)).sort((a,b)=>b.score-a.score);

    // Build chart data — group by day
    const days = 7;
    const dayLabels = [];
    const now = new Date();
    for(let i=days-1;i>=0;i--){
      const d = new Date(now);
      d.setDate(d.getDate()-i);
      dayLabels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
    }

    function getMetricVal(t){
      if(shiftMetric==='taps') return 1;
      if(shiftMetric==='fivestar') return t.rating===5?1:0;
      if(shiftMetric==='avgrating') return t.rating||0;
      return 1;
    }

    const chartDatasets = displayStaff.map((s,i)=>{
      const st = shiftTaps.filter(t=>t.staffId===s.id);
      const dayData = dayLabels.map((_,di)=>{
        const d = new Date(now);
        d.setDate(d.getDate()-(days-1-di));
        d.setHours(0,0,0,0);
        const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
        const dayT = st.filter(t=>(t.ts||0)>=d.getTime()&&(t.ts||0)<=dayEnd.getTime());
        if(shiftMetric==='avgrating') return dayT.filter(t=>t.rating).length ? parseFloat((dayT.filter(t=>t.rating).reduce((a,t)=>a+t.rating,0)/dayT.filter(t=>t.rating).length).toFixed(1)) : null;
        return dayT.reduce((a,t)=>a+getMetricVal(t),0);
      });
      return { name: staffDisplay(s), color: COLORS[i%COLORS.length], data: dayData };
    });

    const chartId = 'shifts-chart-' + Date.now();

    body.innerHTML = header + `
      <!-- Shift selector -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${[{id:'all',name:'All Shifts'},...shifts].map(sh=>{
          const on = selShift===sh.id;
          return `<button onclick="window._selShift('${sh.id}')"
            style="padding:7px 14px;border-radius:20px;border:1px solid ${on?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
            background:${on?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
            color:${on?'var(--brand)':'rgba(238,240,248,.45)'};
            font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">${esc(sh.name)}</button>`;
        }).join('')}
      </div>

      <!-- Period selector -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${periodButtons(shiftPeriod, 'window._shiftPeriod')}
      </div>

      <!-- Staff selector (multi-select) -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        <button onclick="window._selStaff('all')"
          style="padding:7px 14px;border-radius:20px;border:1px solid ${selStaff.length===0?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
          background:${selStaff.length===0?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
          color:${selStaff.length===0?'var(--brand)':'rgba(238,240,248,.45)'};
          font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">All Staff</button>
        ${allStaff.map(s=>{
          const on = selStaff.includes(s.id);
          return `<button onclick="window._selStaff('${s.id}')"
            style="padding:7px 14px;border-radius:20px;border:1px solid ${on?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
            background:${on?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
            color:${on?'var(--brand)':'rgba(238,240,248,.45)'};
            font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">${esc(s.firstName)}</button>`;
        }).join('')}
      </div>

      <!-- Metric selector -->
      <div style="display:flex;gap:6px;margin-bottom:14px">
        ${['taps','fivestar','avgrating'].map(m=>{
          const labels={taps:'Taps',fivestar:'5★ Reviews',avgrating:'Avg Rating'};
          const on = shiftMetric===m;
          return `<button onclick="window._shiftMetric('${m}')"
            style="flex:1;padding:7px;border-radius:20px;border:1px solid ${on?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};
            background:${on?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
            color:${on?'var(--brand)':'rgba(238,240,248,.45)'};
            font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">${labels[m]}</button>`;
        }).join('')}
      </div>

      <!-- Line chart -->
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:12px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          ${chartDatasets.map(ds=>`<div style="display:flex;align-items:center;gap:5px"><div style="width:20px;height:2px;background:${ds.color};border-radius:1px"></div><div style="font-size:12px;color:rgba(238,240,248,.6)">${esc(ds.name)}</div></div>`).join('')}
        </div>
        <div style="height:180px"><canvas id="${chartId}"></canvas></div>
      </div>

      <!-- Leaderboard for this shift/period -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(238,240,248,.3);margin-bottom:8px">
        ${shiftLabel(selShift).toUpperCase()} · ${periodRange(shiftPeriod).label.toUpperCase()}
      </div>
      ${stats.filter(s=>displayStaff.find(d=>d.id===s.id)).length===0
        ? `<div style="text-align:center;color:rgba(238,240,248,.35);padding:20px">No taps in this window</div>`
        : stats.filter(s=>!selStaff.length||selStaff.includes(s.id)).map((s,i)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:.5px solid rgba(255,255,255,.06)">
            <div style="font-size:16px;font-weight:700;width:24px;text-align:center;color:${COLORS[i%COLORS.length]}">${i+1}</div>
            ${staffAvatar(s,36)}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600">${esc(staffDisplay(s))}</div>
              <div style="font-size:11px;color:rgba(238,240,248,.4)">${s.st.length} taps · ${s.reviews} reviews · ${s.avg}⭐</div>
            </div>
            <div style="font-size:18px;font-weight:700;color:${COLORS[i%COLORS.length]}">${s.score} <span style="font-size:10px;font-weight:500;color:rgba(238,240,248,.3)">pts</span></div>
          </div>`).join('')
      }

      <!-- AI insight -->
      <div id="shifts-ai" style="margin-top:16px"></div>`;

    // Draw the line chart
    setTimeout(()=>{
      const ctx = document.getElementById(chartId)?.getContext('2d');
      if(!ctx||!window.Chart) return;
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: chartDatasets.map(ds=>({
            label: ds.name,
            data: ds.data,
            borderColor: ds.color,
            backgroundColor: ds.color + '18',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: ds.color,
            tension: 0.4,
            fill: false,
            spanGaps: true,
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1b26',
              borderColor: 'rgba(255,255,255,.1)',
              borderWidth: 1,
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(238,240,248,.35)', font: { size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(238,240,248,.35)', precision: 0, font: { size: 11 } }, beginAtZero: true }
          }
        }
      });
    }, 30);

    // AI insight for shift
    const aiEl = document.getElementById('shifts-ai');
    if(aiEl && shiftTaps.length > 0){
      const topS = stats[0];
      const prompt = `Shift: ${shiftLabel(selShift)}, Period: ${periodRange(shiftPeriod).label}. Total taps: ${shiftTaps.length}. Top performer: ${topS?staffDisplay(topS)+' with '+topS.score+' pts':'none'}. Staff breakdown: ${stats.slice(0,5).map(s=>`${staffDisplay(s)}: ${s.st.length} taps, ${s.avg} avg rating`).join('; ')}. Give 2-3 sentence shift performance insight. Be specific and actionable. Plain text only.`;
      aiEl.innerHTML = '<div class="ai-card"><div style="font-size:12px;color:rgba(238,240,248,.4)">Analyzing shift…</div></div>';
      askAI(prompt, 'shift-'+selShift+'-'+shiftPeriod+'-'+selStaff.join('-')).then(text=>{
        if(text && aiEl) aiEl.innerHTML = `<div class="ai-card"><div class="ai-text">${esc(text)}</div></div>`;
      });
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  function drawAnalytics(header){
    const taps  = allTaps;
    const rated = taps.filter(t=>t.rating);
    const five  = rated.filter(t=>t.rating===5).length;
    const pos   = rated.filter(t=>t.rating>=4).length;
    const neg   = rated.filter(t=>t.rating<=3).length;
    const avg   = rated.length?(rated.reduce((s,t)=>s+t.rating,0)/rated.length).toFixed(1):'0';
    const ctr   = taps.length?Math.round(rated.length/taps.length*100):0;
    const ranked = allStaff.map(s=>staffStats(s,taps)).sort((a,b)=>b.score-a.score);
    const staffLabels  = ranked.map(s=>s.firstName);
    const staffTapData = ranked.map(s=>s.st.length);

    body.innerHTML = header + `
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
        <button onclick="window._teamChart('bar')" style="padding:6px 14px;border-radius:20px;border:1px solid ${chartMode==='bar'?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};background:${chartMode==='bar'?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};color:${chartMode==='bar'?'var(--brand)':'rgba(238,240,248,.45)'};font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Bar</button>
        <button onclick="window._teamChart('donut')" style="padding:6px 14px;border-radius:20px;border:1px solid ${chartMode==='donut'?'rgba(0,229,160,.4)':'rgba(255,255,255,.1)'};background:${chartMode==='donut'?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};color:${chartMode==='donut'?'var(--brand)':'rgba(238,240,248,.45)'};font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Donut</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        ${[['var(--brand)',taps.length,'Total Taps'],['#ffd166',rated.length,'Reviews'],['#ff8c42',avg+'⭐','Avg Rating'],['#a78bfa',ctr+'%','CTR'],['#4facfe',pos,'Positive'],['#ff4455',neg,'Negative']].map(([col,val,lbl])=>`
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px 16px">
            <div style="font-size:26px;font-weight:700;color:${col}">${val}</div>
            <div style="font-size:12px;color:rgba(238,240,248,.4);margin-top:2px">${lbl}</div>
          </div>`).join('')}
      </div>
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px 16px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:rgba(238,240,248,.3);margin-bottom:12px">TAPS PER STAFF</div>
        ${chartMode==='donut'
          ?`<div style="display:flex;align-items:center;gap:16px"><div style="position:relative;width:90px;height:90px;flex-shrink:0"><canvas id="ch-staff"></canvas></div><div style="flex:1">${staffLabels.map((l,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:10px;height:10px;border-radius:50%;background:${COLORS[i%COLORS.length]}"></div><div style="font-size:13px;font-weight:600">${esc(l)}</div><div style="margin-left:auto;font-size:13px;font-weight:800;color:${COLORS[i%COLORS.length]}">${staffTapData[i]}</div></div>`).join('')}</div></div>`
          :`<div style="height:${Math.max(120,staffLabels.length*36)}px"><canvas id="ch-staff"></canvas></div>`
        }
      </div>`;

    setTimeout(()=>{
      if(!window.Chart) return;
      const sctx = document.getElementById('ch-staff')?.getContext('2d');
      if(sctx){
        if(chartMode==='donut'){
          new Chart(sctx,{type:'doughnut',data:{labels:staffLabels,datasets:[{data:staffTapData,backgroundColor:COLORS.slice(0,staffLabels.length).map(c=>c+'33'),borderColor:COLORS.slice(0,staffLabels.length),borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}});
        } else {
          new Chart(sctx,{type:'bar',data:{labels:staffLabels,datasets:[{label:'Taps',data:staffTapData,backgroundColor:COLORS.slice(0,staffLabels.length).map(c=>c+'33'),borderColor:COLORS.slice(0,staffLabels.length),borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.05)'},beginAtZero:true,ticks:{precision:0}},y:{grid:{display:false}}}}});
        }
      }
    },30);
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  window._teamV = function(v){ view=v; draw(); };
  window._teamChart = function(m){ chartMode=m; draw(); };
  window._lbPeriod = function(p){ period=p; draw(); };
  window._selShift = function(id){ selShift=id; draw(); };
  window._shiftPeriod = function(p){ shiftPeriod=p; draw(); };
  window._shiftMetric = function(m){ shiftMetric=m; draw(); };
  window._selStaff = function(id){
    if(id==='all'){ selStaff=[]; }
    else {
      const idx = selStaff.indexOf(id);
      if(idx>=0) selStaff.splice(idx,1);
      else selStaff.push(id);
    }
    draw();
  };
  window._teamRefresh = async function(){
    if(body) body.innerHTML = '<div style="text-align:center;padding:60px"><div class="ripple-loader"><div class="rl rl1"></div><div class="rl rl2"></div><div class="rl rl3"></div><div class="rl rl4"></div><div class="rldot">+</div></div></div>';
    try {
      await loadDashboardData();
      showToast('Data refreshed');
    } catch(e) { showToast('Refresh failed'); }
    draw();
  };

  draw();
}


// ── AI INSIGHTS TAB ───────────────────────────────────────────────────────────
function renderAITab(body){
  const taps=State.taps;
  const staff=State.staff.filter(s=>s.active);
  const rated=taps.filter(t=>t.rating);
  const avg=rated.length?(rated.reduce((s,t)=>s+t.rating,0)/rated.length).toFixed(1):'0';
  const five=rated.filter(t=>t.rating===5).length;
  const fb=taps.filter(t=>t.feedback).slice(0,15).map(t=>`${t.rating}★: "${t.feedback}"`).join('; ');
  const topPerformer=staff.map(s=>{const st=taps.filter(t=>t.staffId===s.id);return{name:s.firstName,score:_score(st)};}).sort((a,b)=>b.score-a.score)[0]?.name||'N/A';

  const prompts={
    summary:`You are a hospitality analytics assistant. Weekly team summary:
- Total taps: ${taps.length}, Avg rating: ${avg}★, 5-star reviews: ${five}
- Staff count: ${staff.length}, Top performer: ${topPerformer}
- Feedback: ${fb||'none'}
Write a concise Weekly Summary with: Team Performance overview, Key Observations (Top Performer, Support Needed, Feedback Patterns, Priority Action). Use **bold** for headers. Under 200 words.`,
    coaching:`You are a hospitality coach. Team: ${staff.length} staff, ${avg}★ avg across ${taps.length} taps. Feedback: ${fb||'none'}. Give 3-4 specific coaching tips the manager can implement this week. Actionable, warm. Under 150 words.`,
    feedback:`Analyze this customer feedback. Identify patterns, complaints, and what customers love. Feedback: ${fb||'No feedback yet.'}. Give: 1) Sentiment overview 2) Top praise themes 3) Top complaint themes 4) One quick win. Under 150 words.`
  };

  let aiView='summary';

  function _renderAIText(elId,text){
    const el=$(elId);if(!el)return;
    const html=text
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/^[-•›]\s+(.+)$/gm,'<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#a78bfa;flex-shrink:0">›</span><span>$1</span></div>')
      .replace(/\n\n/g,'</p><p style="margin-bottom:10px">')
      .replace(/\n/g,'<br/>');
    el.innerHTML=`<div style="font-size:13px;line-height:1.7;color:rgba(238,240,248,.8)">${html}</div>`;
  }

  function _fetchAI(elId,prompt,cacheKey){
    if(_aiCache[cacheKey]){_renderAIText(elId,_aiCache[cacheKey]);return;}
    const el=$(elId);
    if(el)el.innerHTML='<div style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto 10px"><b></b></div><div style="font-size:12px;color:rgba(238,240,248,.35)">Analyzing…</div></div>';
    askAI(prompt,cacheKey).then(text=>{
      if(!text){const el2=$(elId);if(el2)el2.innerHTML='<div style="color:rgba(238,240,248,.35);font-size:13px">AI unavailable.</div>';return;}
      _renderAIText(elId,text);
    });
  }

  function drawView(){
    const vb=$('ai-view-body');if(!vb)return;

    if(aiView==='summary'){
      vb.innerHTML=`
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:36px;height:36px;border-radius:var(--r-sm);background:rgba(138,99,255,.15);display:flex;align-items:center;justify-content:center;font-size:18px">🧠</div>
            <div style="font-weight:800;font-size:15px">Weekly Summary</div>
          </div>
          <div id="ai-v-body"></div>
          <div style="margin-top:12px;text-align:center"><button onclick="window._aiRefresh('summary')" style="background:none;border:none;color:rgba(238,240,248,.25);font-size:11px;cursor:pointer;font-family:inherit">↺ Refresh</button></div>
        </div>`;
      _fetchAI('ai-v-body',prompts.summary,`summary-${taps.length}-${avg}`);

    } else if(aiView==='coaching'){
      vb.innerHTML=`
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:36px;height:36px;border-radius:var(--r-sm);background:rgba(0,229,160,.1);display:flex;align-items:center;justify-content:center;font-size:18px">💬</div>
            <div style="font-weight:800;font-size:15px">Manager Coaching Tips</div>
          </div>
          <div id="ai-v-body"></div>
          <div style="margin-top:12px;text-align:center"><button onclick="window._aiRefresh('coaching')" style="background:none;border:none;color:rgba(238,240,248,.25);font-size:11px;cursor:pointer;font-family:inherit">↺ Refresh</button></div>
        </div>
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:14px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:rgba(238,240,248,.3);margin-bottom:10px">STAFF BREAKDOWN</div>
          ${staff.length===0?'<div style="color:rgba(238,240,248,.3);font-size:13px">No active staff.</div>':
            staff.map(s=>{
              const st=taps.filter(t=>t.staffId===s.id);
              const r2=st.filter(t=>t.rating);
              const a2=r2.length?(r2.reduce((a,t)=>a+t.rating,0)/r2.length).toFixed(1):'—';
              const f2=r2.filter(t=>t.rating===5).length;
              return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                ${staffAvatar(s,36)}
                <div style="flex:1"><div style="font-weight:700;font-size:13px">${esc(staffDisplay(s))}</div><div style="font-size:11px;color:rgba(238,240,248,.35)">${st.length} taps · ${a2}★ · ${f2} five-stars</div></div>
                <div style="font-size:11px;font-weight:700;color:${parseFloat(a2)>=4?'var(--brand)':parseFloat(a2)>=3?'#ffd166':'#ff4455'}">${a2}★</div>
              </div>`;
            }).join('')}
        </div>`;
      _fetchAI('ai-v-body',prompts.coaching,`coaching-${taps.length}`);

    } else if(aiView==='feedback'){
      const fbList=taps.filter(t=>t.feedback).sort((a,b)=>b.ts-a.ts).slice(0,20);
      vb.innerHTML=`
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:36px;height:36px;border-radius:var(--r-sm);background:rgba(255,209,102,.1);display:flex;align-items:center;justify-content:center;font-size:18px">🔍</div>
            <div style="font-weight:800;font-size:15px">Feedback Analysis</div>
          </div>
          <div id="ai-v-body"></div>
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:rgba(238,240,248,.3);margin-bottom:10px">RAW FEEDBACK</div>
        ${fbList.length===0?'<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:24px;text-align:center;color:rgba(238,240,248,.3)">No feedback yet.</div>':
          fbList.map(t=>{
            const s=State.staff.find(x=>x.id===t.staffId);
            return`<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);padding:12px 14px;margin-bottom:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-size:13px;font-weight:700;color:#ffd166">${'★'.repeat(t.rating||0)}${'☆'.repeat(5-(t.rating||0))}</div>
                <div style="font-size:10px;color:rgba(238,240,248,.3)">${timeAgo(t.ts)}${s?' · '+esc(staffDisplay(s)):''}</div>
              </div>
              <div style="font-size:13px;color:rgba(238,240,248,.7);line-height:1.5">${esc(t.feedback)}</div>
            </div>`;
          }).join('')}`;
      _fetchAI('ai-v-body',prompts.feedback,`feedback-${fbList.length}`);

    } else if(aiView==='export'){
      const weekTaps=_weekTaps(taps);
      const weekRated=weekTaps.filter(t=>t.rating);
      const weekAvg=weekRated.length?(weekRated.reduce((s,t)=>s+t.rating,0)/weekRated.length).toFixed(1):'—';
      const staffRows=staff.map(s=>{const st=taps.filter(t=>t.staffId===s.id);const r2=st.filter(t=>t.rating);const a2=r2.length?(r2.reduce((a,t)=>a+t.rating,0)/r2.length).toFixed(1):'—';const f2=r2.filter(t=>t.rating===5).length;return`${staffDisplay(s)},${st.length},${a2},${f2},${_score(st)}`;}).join('\n');
      const csv=`tap+ Performance Export\nGenerated: ${new Date().toLocaleDateString()}\n\nOVERALL\nTotal Taps,${taps.length}\nAvg Rating,${avg}\n5-Star Reviews,${five}\nFeedback Count,${taps.filter(t=>t.feedback).length}\n\nTHIS WEEK\nWeek Taps,${weekTaps.length}\nWeek Avg Rating,${weekAvg}\n\nSTAFF PERFORMANCE\nName,Taps,Avg Rating,5-Stars,Score\n${staffRows}`;
      vb.innerHTML=`
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <div style="width:36px;height:36px;border-radius:var(--r-sm);background:rgba(79,172,254,.1);display:flex;align-items:center;justify-content:center;font-size:18px">📄</div>
            <div style="font-weight:800;font-size:15px">Export Report</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
            ${[['var(--brand)',taps.length,'Total Taps'],['#ffd166',avg+'★','Avg Rating'],['#4facfe',five,'5-Stars'],['#a78bfa',taps.filter(t=>t.feedback).length,'Feedback']].map(([col,val,lbl])=>`
              <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:var(--r-sm);padding:12px">
                <div style="font-size:22px;font-weight:700;color:${col}">${val}</div>
                <div style="font-size:11px;color:rgba(238,240,248,.35);margin-top:2px">${lbl}</div>
              </div>`).join('')}
          </div>
          <button onclick="window._exportCSV()" style="width:100%;padding:13px;border-radius:var(--r-md);border:none;background:var(--brand);color:#07080c;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:10px">⬇ Download CSV</button>
          <button onclick="window._copyReport()" style="width:100%;padding:13px;border-radius:var(--r-md);border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(238,240,248,.7);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">📋 Copy to Clipboard</button>
        </div>`;
      window._exportCSV=function(){const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tapplus-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);showToast('CSV downloaded ✓');};
      window._copyReport=function(){navigator.clipboard?.writeText(csv).then(()=>showToast('Copied ✓'));};
    }
  }

  function draw(){
    if(!body)return;
    const tabDefs=[{id:'summary',label:'📋 Summary'},{id:'coaching',label:'💬 Coaching'},{id:'feedback',label:'🔍 Feedback'},{id:'export',label:'📄 Export'}];
    body.innerHTML=`
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        ${tabDefs.map(t=>`<button onclick="window._aiV('${t.id}')" style="padding:9px 14px;border-radius:20px;border:1px solid ${aiView===t.id?'rgba(138,99,255,.5)':'rgba(255,255,255,.1)'};background:${aiView===t.id?'rgba(138,99,255,.15)':'rgba(255,255,255,.04)'};color:${aiView===t.id?'#a78bfa':'rgba(238,240,248,.45)'};font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">${t.label}</button>`).join('')}
      </div>
      <div id="ai-view-body"></div>`;
    window._aiV=function(v){aiView=v;draw();};
    window._aiRefresh=function(type){Object.keys(_aiCache).filter(k=>k.startsWith(type)).forEach(k=>delete _aiCache[k]);drawView();};
    drawView();
  }

  draw();
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────
function renderStaffTab(body){
  function draw(){
    body.innerHTML=`<button class="btn btn-primary btn-full" style="margin-bottom:14px" onclick="window._addS()">+ Add Staff Member</button>
    ${State.staff.length===0?`<div class="card" style="text-align:center;color:var(--lbl2);padding:40px">No staff yet.</div>`:State.staff.map(s=>{var tapUrl='/'+State.biz.slug+'/tap/'+s.id;return`<div class="plain-card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">${staffAvatar(s,44)}<div style="flex:1;min-width:0"><div style="font-weight:700">${esc(staffDisplay(s))}</div><div style="font-size:12px;color:var(--lbl2)">${esc(s.title||'Staff')}</div></div><div style="display:flex;gap:6px"><button onclick="window._editS('${s.id}')" class="btn btn-ghost btn-sm">Edit</button><button onclick="window._togS('${s.id}',${s.active})" class="btn btn-sm" style="background:${s.active?'rgba(255,68,85,.1)':'rgba(0,229,160,.1)'};color:${s.active?'var(--red)':'var(--brand)'};border:1px solid ${s.active?'rgba(255,68,85,.2)':'rgba(0,229,160,.2)'}">${s.active?'Deactivate':'Activate'}</button></div></div><div style="font-size:11px;color:var(--lbl2);background:rgba(255,255,255,.03);border-radius:var(--r-xs);padding:6px 10px;font-family:monospace;display:flex;align-items:center;justify-content:space-between"><span>${esc(tapUrl)}</span><button onclick="navigator.clipboard&&navigator.clipboard.writeText(window.location.origin+'${esc(tapUrl)}').then(()=>showToast('URL copied!'))" style="background:none;border:none;color:var(--brand);font-size:11px;cursor:pointer;font-family:inherit;font-weight:700">Copy</button></div></div>`;}).join('')}`;
  }
  window._addS=function(){
    showModal(`<div class="modal-head"><div class="modal-title">Add Staff</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><div class="field-lbl">First Name</div><input class="inp" id="ns-fn" placeholder="Alisha"/></div>
        <div><div class="field-lbl">Last Initial</div><input class="inp" id="ns-li" placeholder="S" maxlength="1"/></div>
        <div><div class="field-lbl">Title</div><input class="inp" id="ns-ti" placeholder="Server, Bartender"/></div>
        <div><div class="field-lbl">Passcode (4 digits)</div><input class="inp" id="ns-pa" type="number" inputmode="numeric" placeholder="1234" maxlength="4"/></div>
        <button class="btn btn-primary btn-full" onclick="window._saveS()">Add</button>
      </div>`);
    window._saveS=async function(){
      const fn=$('ns-fn')?.value?.trim(),li=$('ns-li')?.value?.trim().toUpperCase(),ti=$('ns-ti')?.value?.trim(),pa=$('ns-pa')?.value?.trim();
      if(!fn){showToast('Enter first name');return;}if(!li){showToast('Enter last initial');return;}
      if(!pa||pa.length!==4){showToast('Passcode must be 4 digits');return;}
      closeModal();
      try{const d=await API.staff.create(State.session?.bizId||State.biz?.id,{firstName:fn,lastInitial:li,title:ti,passcode:pa});State.staff.push(d.staff);showToast(fn+' added ✓');draw();}
      catch(e){showToast(e.message||'Failed');draw();}
    };
  };
  window._togS=async function(id,active){
    try{await API.staff.update(State.session?.bizId||State.biz?.id,id,{active:!active});const i=State.staff.findIndex(s=>s.id===id);if(i>=0)State.staff[i].active=!active;draw();}
    catch(e){showToast(e.message||'Failed');}
  };
  window._editS=function(id){
    const s=State.staff.find(x=>x.id===id);if(!s)return;
    showModal(`<div class="modal-head"><div class="modal-title">Edit ${esc(staffDisplay(s))}</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><div class="field-lbl">First Name</div><input class="inp" id="es-fn" value="${esc(s.firstName)}"/></div>
        <div><div class="field-lbl">Last Initial</div><input class="inp" id="es-li" value="${esc(s.lastInitial)}" maxlength="1"/></div>
        <div><div class="field-lbl">Title</div><input class="inp" id="es-ti" value="${esc(s.title||'')}"/></div>
        <div><div class="field-lbl">New Passcode (blank to keep)</div><input class="inp" id="es-pa" type="number" inputmode="numeric" placeholder="Leave blank" maxlength="4"/></div>
        <button class="btn btn-primary btn-full" onclick="window._updateS('${id}')">Save</button>
        <button class="btn btn-danger btn-full" onclick="window._delS('${id}')">Delete</button>
      </div>`);
    window._updateS=async function(sid){
      const u={firstName:$('es-fn')?.value?.trim(),lastInitial:$('es-li')?.value?.trim().toUpperCase(),title:$('es-ti')?.value?.trim()};
      const np=$('es-pa')?.value?.trim();if(np){if(np.length!==4){showToast('Passcode must be 4 digits');return;}u.passcode=np;}
      closeModal();
      try{const d=await API.staff.update(State.session?.bizId||State.biz?.id,sid,u);const i=State.staff.findIndex(x=>x.id===sid);if(i>=0)State.staff[i]={...State.staff[i],...d.staff};showToast('Saved ✓');draw();}
      catch(e){showToast(e.message||'Failed');}
    };
    window._delS=async function(sid){
      if(!confirm('Delete this staff member?'))return;closeModal();
      try{await API.staff.delete(State.session?.bizId||State.biz?.id,sid);State.staff=State.staff.filter(x=>x.id!==sid);showToast('Deleted');draw();}
      catch(e){showToast(e.message||'Failed');}
    };
  };
  draw();
}


// ── Estimator Tab ─────────────────────────────────────────────────────────────
function renderEstimatorTab(){
  setTimeout(()=>{
    window._calcEst=function(){
      const c=parseInt($('ec')?.value)||0,cur=parseFloat($('ecur')?.value)||0,tgt=parseFloat($('etgt')?.value)||0;
      const el=$('eres');if(!el)return;
      if(!c||!cur||!tgt){el.innerHTML=`<div style="color:var(--red);font-size:13px">Fill all fields</div>`;return;}
      if(tgt<=cur){el.innerHTML=`<div style="color:var(--brand);font-weight:700;text-align:center;padding:12px">✓ Already at target!</div>`;return;}
      if(tgt>5){el.innerHTML=`<div style="color:var(--red);font-size:13px">Target can't exceed 5.0</div>`;return;}
      const n=Math.max(1,Math.ceil((c*(tgt-cur))/(5-tgt)));
      const taps=Math.ceil(n/0.65);
      const wks=Math.ceil(taps/(Math.max(1,State.staff.filter(s=>s.active).length)*3));
      el.innerHTML=`<div class="stat-grid"><div class="stat-box"><div class="stat-val">${n}</div><div class="stat-lbl">5★ Needed</div></div><div class="stat-box"><div class="stat-val">${taps}</div><div class="stat-lbl">Taps Needed</div></div><div class="stat-box"><div class="stat-val">${wks}w</div><div class="stat-lbl">Est. Time</div></div><div class="stat-box"><div class="stat-val">${cur}→${tgt}</div><div class="stat-lbl">Jump</div></div></div>`;
    };
  },0);
  return`<div class="plain-card">
    <div style="font-weight:700;font-size:16px;margin-bottom:14px">📈 Rating Estimator</div>
    <div class="field-lbl">Platform</div><select class="sel" id="ep" style="margin-bottom:10px"><option>Google</option><option>Yelp</option><option>TripAdvisor</option></select>
    <div class="field-lbl">Current Review Count</div><input class="inp" id="ec" type="number" value="71" style="margin-bottom:8px"/>
    <div class="field-lbl">Current Rating</div><input class="inp" id="ecur" type="number" step="0.1" value="4.2" style="margin-bottom:8px"/>
    <div class="field-lbl">Target Rating</div><input class="inp" id="etgt" type="number" step="0.1" value="4.5" style="margin-bottom:14px"/>
    <button class="btn btn-primary btn-full" onclick="window._calcEst()">Calculate</button>
    <div id="eres" style="margin-top:14px"></div>
  </div>`;
}

// ── Branding & Settings Tab (bizAdmin) ───────────────────────────────────────