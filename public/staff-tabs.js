function renderCoachingTab(me){
  if(!me)return`<div class="card" style="text-align:center;color:var(--lbl2)">No staff profile found</div>`;
  const myT=State.taps.filter(t=>t.staffId===me.id);
  const rated=myT.filter(t=>t.rating);
  const avg=rated.length?(rated.reduce((s,t)=>s+t.rating,0)/rated.length).toFixed(1):'—';
  const five=rated.filter(t=>t.rating===5).length;
  const fb=myT.filter(t=>t.feedback).slice(0,5);
  const prompt=`You are a hospitality coach. ${me.firstName} has ${myT.length} taps, ${avg} avg stars, ${five} five-star reviews. Feedback: ${fb.map(t=>`"${t.feedback}"`).join('; ')||'none'}. Give 3 specific coaching points. Warm, actionable. Under 120 words.`;
  setTimeout(()=>renderAIBlock('ai-coach',prompt,`coach-${me.id}-${myT.length}`),0);
  return`<div class="stat-grid">
    <div class="stat-box"><div class="stat-val">${myT.length}</div><div class="stat-lbl">Taps</div></div>
    <div class="stat-box"><div class="stat-val">${avg}</div><div class="stat-lbl">Avg Rating</div></div>
    <div class="stat-box"><div class="stat-val">${five}</div><div class="stat-lbl">5-Stars</div></div>
    <div class="stat-box"><div class="stat-val">${rated.length?Math.round(five/rated.length*100):0}%</div><div class="stat-lbl">5★ Rate</div></div>
  </div>
  <div style="margin-top:20px;display:flex;align-items:center;gap:10px;margin-bottom:12px">
    <div style="width:32px;height:32px;border-radius:var(--r-sm);background:rgba(138,99,255,.15);display:flex;align-items:center;justify-content:center;font-size:16px">🤖</div>
    <div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:rgba(138,99,255,.8)">AI Coaching</div>
  </div>
  <div id="ai-coach"></div>`;
}

function renderFeedbackTab(me){
  const fb=State.taps.filter(t=>(!me||t.staffId===me.id)&&t.feedback&&t.feedback.trim()).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,50);
  if(!fb.length)return`<div class="card" style="text-align:center;color:var(--lbl2);padding:40px">No feedback yet.</div>`;
  return fb.map(t=>`<div class="fb-item"><div class="fb-stars">${'★'.repeat(t.rating||0)}${'☆'.repeat(5-(t.rating||0))}</div><div class="fb-text">${esc(t.feedback)}</div>${t.feedbackPhoto?`<img src="${esc(t.feedbackPhoto)}" style="width:100%;border-radius:var(--r-xs);margin-top:8px;max-height:200px;object-fit:cover"/>`:''}<div class="fb-meta">${timeAgo(t.ts)}</div></div>`).join('');
}

// ── Goals Tab ─────────────────────────────────────────────────────────────────
// Works for staff (read-only progress), manager & bizAdmin (full create/edit)

function renderGoalsTab(me) {
  const role   = State.session?.role;
  const isManager = role === 'manager' || role === 'bizAdmin' || role === 'superAdmin';
  let goalView = 'team'; // 'team' | 'individual'
  let selStaffId = State.staff.filter(s => s.active)[0]?.id || null;

  // ── Metric helpers ──────────────────────────────────────────────────────
  function getTapsInRange(taps, startTs, endTs) {
    return taps.filter(t => t.ts >= startTs && t.ts <= endTs);
  }

  function calcMetric(metric, taps) {
    const rated = taps.filter(t => t.rating);
    switch (metric) {
      case 'taps':    return taps.length;
      case 'fivestar': return rated.filter(t => t.rating === 5).length;
      case 'avgrating': {
        if (!rated.length) return 0;
        return parseFloat((rated.reduce((s,t) => s+t.rating, 0) / rated.length).toFixed(2));
      }
      case 'ctr': {
        if (!taps.length) return 0;
        return Math.round(rated.length / taps.length * 100);
      }
      default: return 0;
    }
  }

  function metricLabel(metric) {
    return { taps:'Taps', fivestar:'5★ Reviews', avgrating:'Avg Rating', ctr:'CTR %' }[metric] || metric;
  }

  function metricUnit(metric) {
    return { taps:'taps', fivestar:'reviews', avgrating:'stars', ctr:'%' }[metric] || '';
  }

  function goalProgress(g, staffId) {
    const now = Date.now();
    const start = g.startDate ? new Date(g.startDate).getTime() : 0;
    const end   = g.endDate   ? new Date(g.endDate).setHours(23,59,59,999) : now;
    const srcTaps = staffId
      ? State.taps.filter(t => t.staffId === staffId)
      : State.taps;
    const rangeTaps = getTapsInRange(srcTaps, start, end);
    const val = calcMetric(g.metric, rangeTaps);
    const pct = g.metric === 'avgrating'
      ? Math.min(100, Math.round((val / g.target) * 100))
      : Math.min(100, Math.round((val / g.target) * 100));
    return { val, pct };
  }

  // ── Goal card renderer ──────────────────────────────────────────────────
  function goalCard(g, i, staffId, showEdit) {
    const { val, pct } = goalProgress(g, staffId || null);
    const isComplete = pct >= 100;
    const barColor = isComplete ? 'var(--brand)' : pct >= 60 ? '#ffd166' : '#4facfe';
    const dateRange = g.startDate && g.endDate
      ? `${g.startDate} → ${g.endDate}`
      : g.startDate ? `From ${g.startDate}` : 'Ongoing';

    return `
      <div style="background:rgba(255,255,255,.04);border:1px solid ${isComplete?'rgba(0,229,160,.3)':'rgba(255,255,255,.07)'};border-radius:var(--r-lg);padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:15px">${esc(g.label)}</div>
            <div style="font-size:11px;color:var(--lbl2);margin-top:2px">${metricLabel(g.metric)} · ${esc(dateRange)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:10px">
            ${isComplete ? '<span style="font-size:16px">✅</span>' : ''}
            ${showEdit ? `
              <button onclick="window._editGoal(${i},'${goalView}','${staffId||''}')"
                style="background:var(--fill);border:none;border-radius:var(--r-sm);
                       padding:5px 12px;font-size:12px;font-weight:500;color:var(--lbl2);
                       cursor:pointer;font-family:inherit">Edit</button>
              <button onclick="window._deleteGoal(${i},'${goalView}','${staffId||''}')"
                style="background:rgba(255,77,106,.1);border:none;border-radius:var(--r-sm);
                       padding:5px 10px;font-size:12px;font-weight:600;color:var(--ios-red);
                       cursor:pointer;font-family:inherit">✕</button>
            ` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width .5s ease"></div>
          </div>
          <div style="font-size:13px;font-weight:700;color:${barColor};width:36px;text-align:right">${pct}%</div>
        </div>
        <div style="font-size:12px;color:var(--lbl2)">${val} / ${g.target} ${metricUnit(g.metric)}</div>
      </div>`;
  }

  // ── Add/Edit modal ──────────────────────────────────────────────────────
  function showGoalModal(existing, onSave) {
    const g = existing || { label:'', metric:'taps', target: 10, startDate:'', endDate:'' };
    const today = new Date().toISOString().slice(0,10);

    showModal(`
      <div class="modal-head">
        <div class="modal-title">${existing ? 'Edit Goal' : 'Add Goal'}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 8px;display:flex;flex-direction:column;gap:12px">
        <div>
          <div class="field-lbl">Goal Label</div>
          <input class="inp" id="gl-label" value="${esc(g.label)}" placeholder="e.g. 50 Taps This Month" style="border-radius:var(--r-md)"/>
        </div>
        <div>
          <div class="field-lbl">Metric</div>
          <select class="sel" id="gl-metric" style="border-radius:var(--r-md)">
            <option value="taps"      ${g.metric==='taps'?'selected':''}>Taps</option>
            <option value="fivestar"  ${g.metric==='fivestar'?'selected':''}>5★ Reviews</option>
            <option value="avgrating" ${g.metric==='avgrating'?'selected':''}>Avg Star Rating</option>
            <option value="ctr"       ${g.metric==='ctr'?'selected':''}>CTR %</option>
          </select>
        </div>
        <div>
          <div class="field-lbl">Target</div>
          <input class="inp" id="gl-target" type="number" value="${g.target}" placeholder="e.g. 50" min="1" style="border-radius:var(--r-md)"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div class="field-lbl">Start Date</div>
            <input class="inp" id="gl-start" type="date" value="${g.startDate||today}" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">End Date</div>
            <input class="inp" id="gl-end" type="date" value="${g.endDate||''}" style="border-radius:var(--r-md)"/>
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="window._saveGoalModal()" style="border-radius:var(--r-lg);padding:16px;font-size:16px;margin-top:4px">
          ${existing ? 'Save Changes' : 'Add Goal'}
        </button>
      </div>`);

    window._saveGoalModal = function() {
      const label  = $('gl-label')?.value?.trim();
      const metric = $('gl-metric')?.value;
      const target = parseFloat($('gl-target')?.value);
      const startDate = $('gl-start')?.value;
      const endDate   = $('gl-end')?.value;
      if (!label)         { showToast('Enter a goal label'); return; }
      if (!target || target <= 0) { showToast('Enter a valid target'); return; }
      if (!startDate)     { showToast('Pick a start date'); return; }
      closeModal();
      onSave({ label, metric, target, startDate, endDate });
    };
  }

  // ── Save goals to backend ───────────────────────────────────────────────
  async function persistGoals(teamGoals) {
    const bizId = State.session?.bizId || State.biz?.id;
    if (!bizId) { showToast('No business ID — try logging out and back in'); return; }
    console.log('[Goals] bizId:', bizId, 'session.bizId:', State.session?.bizId, 'biz.id:', State.biz?.id, 'role:', State.session?.role);
    try {
      const result = await API.business.update(bizId, { teamGoals });
      console.log('[Goals] save result:', JSON.stringify(result).slice(0, 200));
      State.biz = { ...State.biz, teamGoals };
      showToast('Goals saved ✓');
    } catch(e) {
      console.error('[Goals] save error:', e.message);
      showToast(e.message || 'Save failed');
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────
  function draw() {
    const body = $('dash-body');
    if (!body) return;

    const activeStaff = State.staff.filter(s => s.active);
    const teamGoals   = State.biz?.teamGoals || [];

    // Individual goals are stored as g.staffId on the goal object
    // Team goals have no staffId
    const tGoals = teamGoals.filter(g => !g.staffId);
    const iGoals = staffId => teamGoals.filter(g => g.staffId === staffId);

    if (!selStaffId && activeStaff.length) selStaffId = activeStaff[0].id;

    body.innerHTML = `
      <div class="tabs" style="margin-bottom:16px">
        <button class="tab${goalView==='team'?' active':''}" onclick="window._goalView('team')">Team</button>
        <button class="tab${goalView==='individual'?' active':''}" onclick="window._goalView('individual')">Individual</button>
      </div>

      ${goalView === 'team' ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:12px;color:var(--lbl2)">Goals for the whole team</div>
          ${isManager ? `<button onclick="window._addGoal('team','')"
            style="background:var(--brand);color:#000;border:none;border-radius:100px;
                   padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
            + Add</button>` : ''}
        </div>
        <div id="goals-list">
          ${tGoals.length === 0
            ? '<div style="text-align:center;color:var(--lbl2);padding:40px 0">No team goals yet.</div>'
            : tGoals.map((g, i) => goalCard(g, i, null, isManager)).join('')}
        </div>
      ` : `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          ${activeStaff.map(s => `
            <button onclick="window._selStaff('${s.id}')"
              style="display:flex;align-items:center;gap:7px;padding:7px 14px;
                border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;
                border:none;
                background:${selStaffId===s.id?'rgba(0,229,160,.15)':'var(--fill)'};
                color:${selStaffId===s.id?'var(--brand)':'var(--lbl2)'}">
              ${staffAvatar(s, 22)} ${esc(staffDisplay(s))}
            </button>`).join('')}
        </div>
        ${selStaffId ? `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--lbl2)">Goals For</div>
            ${isManager ? `<button onclick="window._addGoal('individual','${selStaffId}')"
              style="background:var(--brand);color:#000;border:none;border-radius:100px;
                     padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
              + Add</button>` : ''}
          </div>
          <div id="goals-list">
            ${iGoals(selStaffId).length === 0
              ? '<div style="text-align:center;color:var(--lbl2);padding:40px 0">No goals set yet.</div>'
              : iGoals(selStaffId).map((g, i) => {
                  const realIdx = teamGoals.indexOf(g);
                  return goalCard(g, realIdx, selStaffId, isManager);
                }).join('')}
          </div>
        ` : '<div style="text-align:center;color:var(--lbl2);padding:40px 0">No active staff.</div>'}
      `}`;

    // ── Handlers ────────────────────────────────────────────────────────
    window._goalView = function(v) { goalView = v; draw(); };
    window._selStaff = function(id) { selStaffId = id; draw(); };

    window._addGoal = function(type, staffId) {
      showGoalModal(null, async function(newGoal) {
        if (type === 'individual' && staffId) newGoal.staffId = staffId;
        const updated = [...(State.biz?.teamGoals || []), newGoal];
        await persistGoals(updated);
        draw();
      });
    };

    window._editGoal = function(idx, type, staffId) {
      const goals = State.biz?.teamGoals || [];
      const g = goals[idx];
      if (!g) return;
      showGoalModal(g, async function(updated) {
        if (type === 'individual' && staffId) updated.staffId = staffId;
        const newGoals = [...goals];
        newGoals[idx] = updated;
        await persistGoals(newGoals);
        draw();
      });
    };

    window._deleteGoal = function(idx, type, staffId) {
      if (!confirm('Delete this goal?')) return;
      const goals = [...(State.biz?.teamGoals || [])];
      goals.splice(idx, 1);
      persistGoals(goals).then(() => draw());
    };
  }

  // Staff view — read only progress
  if (!isManager) {
    const teamGoals = State.biz?.teamGoals || [];
    const myGoals   = teamGoals.filter(g => !g.staffId || g.staffId === (me?.id));
    if (!myGoals.length) return `
      <div style="text-align:center;padding:60px 20px;color:var(--lbl3)">
        <div style="font-size:36px;margin-bottom:16px">🎯</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px">No goals yet</div>
        <div style="font-size:14px">Your manager will set goals for you</div>
      </div>`;
    return myGoals.map((g, i) => goalCard(g, i, me?.id || null, false)).join('');
  }

  // Manager / bizAdmin — full interactive view
  draw();
  return '';
}


function renderStatsTab(me){
  const myT=me?State.taps.filter(t=>t.staffId===me.id):State.taps;
  const rated=myT.filter(t=>t.rating);
  const avg=rated.length?(rated.reduce((s,t)=>s+t.rating,0)/rated.length).toFixed(1):'—';
  const now=Date.now();
  const dist=[1,2,3,4,5].map(r=>rated.filter(t=>t.rating===r).length);
  const mx=Math.max(...dist,1);
  return`<div class="stat-grid">
    <div class="stat-box"><div class="stat-val">${myT.length}</div><div class="stat-lbl">Total Taps</div></div>
    <div class="stat-box"><div class="stat-val">${avg}</div><div class="stat-lbl">Avg Rating</div></div>
    <div class="stat-box"><div class="stat-val">${myT.filter(t=>t.ts>now-604800000).length}</div><div class="stat-lbl">This Week</div></div>
    <div class="stat-box"><div class="stat-val">${myT.filter(t=>t.ts>now-2592000000).length}</div><div class="stat-lbl">This Month</div></div>
  </div>
  <div class="plain-card" style="margin-top:4px">
    <div class="sec-lbl">Rating Distribution</div>
    ${[5,4,3,2,1].map(r=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:16px;font-size:12px;font-weight:700;color:var(--lbl2)">${r}★</div><div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(dist[r-1]/mx*100)}%;background:var(--brand);border-radius:4px"></div></div><div style="width:20px;font-size:12px;color:var(--lbl2);text-align:right">${dist[r-1]}</div></div>`).join('')}
  </div>`;
}

// ── Branding Tab (staff) ──────────────────────────────────────────────────────
function renderBrandingTab(body,me){
  if(!me){body.innerHTML=`<div class="card" style="color:var(--lbl2);text-align:center">No staff profile</div>`;return;}
  const allowed=State.biz?.branding?.allowedStaffLinks||{};
  const types=Object.entries(allowed).filter(([,v])=>v).map(([k])=>k);
  const LABELS={spotify:'Spotify',phone:'Phone',email:'Email',instagram:'Instagram',tiktok:'TikTok',custom:'Custom'};
  let photoData=undefined,links=[...(me.links||[])];
  body.innerHTML=`<div class="plain-card">
    <div style="font-weight:700;font-size:15px;margin-bottom:16px">My Tap Page</div>
    <div class="field-lbl">Profile Photo</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div id="br-av">${staffAvatar(me,64)}</div>
      <button onclick="window._pickPhoto()" class="btn btn-ghost btn-sm">Upload Photo</button>
    </div>
    <div class="field-lbl">My Title</div>
    <input class="inp" id="br-title" value="${esc(me.title||'')}" placeholder="Server, Bartender" style="margin-bottom:14px"/>
    ${types.length?`
      <div class="sec-lbl">My Links</div>
      <div style="font-size:11px;color:var(--lbl2);margin-bottom:10px">Show when customers tap your photo</div>
      <div id="br-links"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <select class="sel" id="br-ltype">${types.map(t=>`<option value="${t}">${LABELS[t]||t}</option>`).join('')}</select>
        <input class="inp" id="br-llabel" placeholder="Label"/>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input class="inp" id="br-lurl" placeholder="URL or @username" style="flex:1"/>
        <button onclick="window._addBrLink()" style="background:var(--brand);color:var(--black);border:none;border-radius:var(--r-sm);padding:0 16px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit">+</button>
      </div>`:`<div style="background:var(--sys-bg2);border-radius:var(--r-sm);padding:12px;font-size:12px;color:var(--lbl2);margin-bottom:14px">No link types enabled by admin.</div>`}
    <button onclick="window._saveBr()" class="btn btn-primary btn-full">Save My Branding</button>
  </div>`;
  function renderLinks(){
    const el=$('br-links');if(!el)return;
    el.innerHTML=links.length?links.map((l,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;background:var(--sys-bg2);border:none;border-radius:var(--r-sm);padding:10px 12px"><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700">${esc(l.label||l.type)}</div><div style="font-size:11px;color:var(--lbl2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div></div><button onclick="window._rmBrLink(${i})" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:7px;padding:4px 8px;font-size:11px;font-weight:700;color:var(--red);cursor:pointer;font-family:inherit">✕</button></div>`).join(''):`<div style="font-size:12px;color:var(--lbl2);margin-bottom:8px">No links yet.</div>`;
  }
  renderLinks();
  window._pickPhoto=function(){
    const i=document.createElement('input');i.type='file';i.accept='image/*';
    i.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const reader=new FileReader();
      reader.onload=function(ev){
        const dataUrl=ev.target.result;
        // Compress via canvas
        const img=new Image();
        img.onload=function(){
          const MAX=400;
          let w=img.width,h=img.height;
          if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
          if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
          const canvas=document.createElement('canvas');
          canvas.width=w;canvas.height=h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          const compressed=canvas.toDataURL('image/jpeg',0.75);
          photoData=compressed;
          const a=$('br-av');
          if(a)a.innerHTML=`<img src="${compressed}" style="width:64px;height:64px;border-radius:50%;object-fit:cover"/>`;
        };
        img.onerror=function(){
          // Fallback: use raw data if canvas fails
          photoData=dataUrl;
          const a=$('br-av');
          if(a)a.innerHTML=`<img src="${dataUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover"/>`;
        };
        img.src=dataUrl;
      };
      reader.readAsDataURL(f);
    };i.click();
  };
  window._rmBrLink=function(i){links.splice(i,1);renderLinks();};
  window._addBrLink=function(){
    const type=($('br-ltype')||{}).value||'custom';
    const label=($('br-llabel')||{}).value?.trim()||LABELS[type]||type;
    let url=($('br-lurl')||{}).value?.trim()||'';
    if(!url){showToast('Enter a URL');return;}
    if(type!=='phone'&&type!=='email'&&!url.startsWith('http')){
      if(type==='instagram')url='https://instagram.com/'+url.replace(/^@/,'');
      else if(type==='tiktok')url='https://tiktok.com/@'+url.replace(/^@/,'');
      else url='https://'+url.replace(/^@/,'').replace(/^\/+/,'');
    }
    links.push({type,label,url});
    const u=$('br-lurl');if(u)u.value='';
    const ll=$('br-llabel');if(ll)ll.value='';
    renderLinks();showToast('Link added ✓');
  };
  window._saveBr=async function(){
    const title=($('br-title')||{}).value?.trim()||'';
    const photo=photoData!==undefined?photoData:me.photo;
    const bizId=State.session?.bizId||State.biz?.id;
    const staffId=me.id;
    if(!bizId){showToast('No business ID — try logging out and back in');return;}
    if(!staffId){showToast('No staff ID found');return;}
    const payload={title,photo,links:[...links]};
    try{
      const d=await API.staff.update(bizId,staffId,payload);
      const saved=d?.staff||payload;
      const idx=State.staff.findIndex(s=>s.id===staffId);
      if(idx>=0)State.staff[idx]={...State.staff[idx],...saved};
      showToast('Saved ✨');
      renderDashboard();
    }
    catch(e){showToast(e.message||'Save failed');}
  };
}

// ── TEAM TAB ──────────────────────────────────────────────────────────────────