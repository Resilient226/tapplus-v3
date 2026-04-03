function renderOwnerDashboard(){
  const sess=State.session,bizs=sess?.businesses||[];
  app().innerHTML=`
    <div style="max-width:480px;margin:0 auto;padding:20px 16px 80px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-top:8px">
        <div style="font-size:22px;font-weight:700">Tap<span style="color:var(--brand)">+</span> Owner</div>
        <button onclick="API.auth.logout();renderHome()" style="background:rgba(255,255,255,.06);border:none;border-radius:var(--r-xs);padding:6px 12px;color:var(--lbl2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Sign Out</button>
      </div>
      ${bizs.length===0?`<div class="card" style="text-align:center;padding:40px"><div style="font-size:32px;margin-bottom:12px">🏪</div><div style="font-weight:700;margin-bottom:8px">No businesses yet</div><div style="font-size:13px;color:var(--lbl2);margin-bottom:20px">Create your first location</div><button class="btn btn-primary" onclick="renderCreateBusiness('${esc(sess.token)}')">Create Business</button></div>`:`
        <div class="sec-lbl">Your Locations</div>
        ${bizs.map(b=>`<div class="plain-card" style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="window._openBiz('${b.id}')"><div style="width:44px;height:44px;border-radius:var(--r-sm);background:var(--green-dim);display:flex;align-items:center;justify-content:center;font-size:20px">🏪</div><div style="flex:1"><div style="font-weight:700">${esc(b.name)}</div><div style="font-size:12px;color:var(--lbl2)">${esc(b.slug)}</div></div><div style="color:var(--lbl2);font-size:18px">›</div></div>`).join('')}
        <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="renderCreateBusiness('${esc(sess.token)}')">+ Add Location</button>`}
    </div>`;
  window._openBiz=async function(id){
    showLoading();
    try{const d=await API.business.getById(id);State.biz=d.business;State.session={...sess,bizId:id,role:'bizAdmin'};await loadDashboardData();renderDashboard();}
    catch(e){showError(e.message);}
  };
}

// ── Super Admin ───────────────────────────────────────────────────────────────
function renderSuperAdminDashboard(){
  app().innerHTML=`
    <div style="max-width:480px;margin:0 auto;padding:20px 16px 80px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-top:8px">
        <div style="font-size:20px;font-weight:700">⚡ Super Admin</div>
        <button onclick="API.auth.logout();renderHome()" style="background:rgba(255,255,255,.06);border:none;border-radius:var(--r-xs);padding:6px 12px;color:var(--lbl2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Sign Out</button>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="window._saT('layout')" id="sa-layout">Layout</button>
        <button class="tab" onclick="window._saT('biz')" id="sa-biz">Businesses</button>
        <button class="tab" onclick="window._saT('analytics')" id="sa-analytics">📈 Analytics</button>
      </div>
      <div id="sa-body"></div>
    </div>`;
  function saLayout(){
    $('sa-body').innerHTML=`<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;
    API.layout.get().then(data=>{
      const L=data.layouts;
      const SECTIONS={staff:['coaching','feedback','goals','stats','branding'],manager:['ai','analytics','team','staff','goals','estimator','branding2'],bizAdmin:['ai','analytics','team','staff','goals','branding2']};
      const SLABELS={coaching:'🤖 Coaching',feedback:'💬 Feedback',goals:'🎯 Goals',stats:'📊 Stats',branding:'✨ Branding',ai:'🤖 AI Insights',team:'🏆 Team',staff:'👥 Staff',links:'🔗 Links',estimator:'📈 Estimator',settings:'⚙️ Settings',branding2:'🎨 Branding',analytics:'📈 Analytics'};
      const layouts={staff:[...(L.staff||SECTIONS.staff)],manager:[...(L.manager||SECTIONS.manager)],bizAdmin:[...(L.bizAdmin||SECTIONS.bizAdmin)]};
      function drawLayouts(){
        $('sa-body').innerHTML=Object.entries(layouts).map(([role,order])=>`
          <div class="plain-card" style="margin-bottom:12px">
            <div style="font-weight:700;font-size:14px;margin-bottom:12px;text-transform:capitalize">${role} Dashboard</div>
            ${order.map((s,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;background:var(--sys-bg2);border:none;border-radius:var(--r-xs);padding:8px 12px"><span style="font-size:14px;flex:1">${SLABELS[s]||s}</span><button onclick="window._mvUp('${role}',${i})" style="background:none;border:none;color:var(--lbl2);cursor:pointer;font-size:16px;padding:2px 6px">↑</button><button onclick="window._mvDn('${role}',${i})" style="background:none;border:none;color:var(--lbl2);cursor:pointer;font-size:16px;padding:2px 6px">↓</button></div>`).join('')}
          </div>`).join('')+`<button class="btn btn-primary btn-full" onclick="window._saveLayout()">Save Layout</button>`;
      }
      drawLayouts();
      window._mvUp=function(role,i){if(i===0)return;const a=layouts[role];[a[i-1],a[i]]=[a[i],a[i-1]];drawLayouts();};
      window._mvDn=function(role,i){const a=layouts[role];if(i>=a.length-1)return;[a[i],a[i+1]]=[a[i+1],a[i]];drawLayouts();};
      window._saveLayout=async function(){showLoading('Saving…');try{await API.layout.update(layouts);showToast('Layout saved ✓');renderSuperAdminDashboard();}catch(e){showToast(e.message||'Failed');renderSuperAdminDashboard();}};
    }).catch(function(e){
      $('sa-body').innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--red)"><div style="font-size:14px;font-weight:700;margin-bottom:8px">Failed to load layouts</div><div style="font-size:12px;color:var(--lbl2)">'+esc(e.message||'Server error')+'</div></div>';
    });
  }
  window._saT=function(t){
    ['layout','biz'].forEach(x=>{const b=$('sa-'+x);if(b)b.className='tab'+(x===t?' active':'');});
    if(t==='layout')saLayout();else if(t==='analytics'){const sb=$('sa-body');if(sb)renderSAAnalytics(sb);}else saBiz();
  };
  window._saT('layout');
}

async function saBiz() {
  var body = $('sa-body');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>';

  var EMOJIS = ['🔍','⭐','🦉','🍽️','👍','📘','🔗','📍','🏆','💬','📱','🌐','🎯','✨','🏅'];
  var allBiz    = [];
  var openBizId = null;
  var bizLinks  = {};

  try {
    var saR = await fetch('/api/business?listAll=1', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } });
    var saD = await saR.json();
    if (saD.businesses) allBiz = saD.businesses;
  } catch(e) {}

  // ── Shell ─────────────────────────────────────────────────────────────────
  function draw(businesses) {
    body.innerHTML = `
      <button class="btn btn-primary btn-full" style="margin-bottom:16px" onclick="window._saCreateBiz()">+ Create New Business</button>
      <input class="inp" id="sa-biz-search" placeholder="Search by slug…" style="margin-bottom:16px" oninput="window._saSearch(this.value)"/>
      <div id="sa-biz-list"></div>`;
    renderList(businesses);
  }

  // ── Business list ─────────────────────────────────────────────────────────
  function renderList(businesses) {
    var el = $('sa-biz-list');
    if (!el) return;
    if (businesses.length === 0) {
      el.innerHTML = '<div class="card" style="text-align:center;color:var(--lbl2);padding:30px">No businesses yet.</div>';
      return;
    }
    el.innerHTML = businesses.map(b => `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);margin-bottom:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:14px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:15px">${esc(b.name)}</div>
            <div style="font-size:12px;color:var(--lbl2);margin-top:2px">
              Code: <span style="color:var(--brand);font-weight:700">${esc(b.storeCode)}</span> · ${esc(b.slug)}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            <button onclick="window._saTogLinks('${b.id}')"
              id="btn-links-${b.id}"
              style="padding:7px 12px;border-radius:var(--r-sm);border:1px solid rgba(255,255,255,.1);
                background:rgba(255,255,255,.04);color:rgba(238,240,248,.6);font-size:12px;
                font-weight:700;cursor:pointer;font-family:inherit">
              🔗 Links
            </button>
            <button onclick="window._saEditBiz('${b.id}','${esc(b.name)}')"
              style="padding:7px 12px;border-radius:var(--r-sm);border:1px solid rgba(0,229,160,.25);
                background:rgba(0,229,160,.08);color:var(--brand);font-size:12px;
                font-weight:700;cursor:pointer;font-family:inherit">✏️ Edit</button>
            <button onclick="window._saViewBiz('${b.id}')" class="btn btn-ghost btn-sm">View</button>
            <button onclick="window._saDeleteBiz('${b.id}','${esc(b.name)}')"
              style="padding:7px 10px;border-radius:var(--r-sm);border:1px solid rgba(255,68,85,.2);
                background:rgba(255,68,85,.1);color:var(--red);font-size:12px;font-weight:700;
                cursor:pointer;font-family:inherit">Del</button>
          </div>
        </div>
        <div id="accordion-${b.id}" style="display:none;border-top:1px solid rgba(255,255,255,.06);padding:14px">
          <div id="links-body-${b.id}">
            <div style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></div>
          </div>
        </div>
      </div>`).join('');
  }

  // ── Edit Business modal ───────────────────────────────────────────────────
  window._saEditBiz = function(bizId, bizName) {

    // Toggle state — scoped per modal open
    var _s = {
      notify:              true,
      force:               false,
      'notif-reviews':     true,
      'notif-leaderboard': true,
      'notif-coaching':    true,
      'notif-mute':        false,
    };

    function toggleHtml(key, on) {
      return `<div class="toggle${on?' on':''}" id="seb-${key}" onclick="window._sebToggle('${key}')"><div class="toggle-thumb"></div></div>`;
    }

    showModal(`
      <div class="modal-head">
        <div class="modal-title">Edit Business</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 24px;display:flex;flex-direction:column;gap:20px">

        <!-- Business Name -->
        <div>
          <div class="field-lbl">Business Name</div>
          <input class="inp" id="seb-name" value="${esc(bizName)}" placeholder="Business name"/>
        </div>

        <!-- PIN Management -->
        <div style="background:rgba(255,209,102,.06);border:1px solid rgba(255,209,102,.18);border-radius:var(--r-md);padding:16px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ffd166;margin-bottom:14px">🔑 PIN Management</div>

          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <div class="field-lbl">New Admin PIN (4–6 digits)</div>
              <input class="inp" id="seb-admin-pin" type="number" inputmode="numeric" placeholder="Leave blank to keep current"/>
            </div>
            <div>
              <div class="field-lbl">New Manager PIN (4–6 digits)</div>
              <input class="inp" id="seb-mgr-pin" type="number" inputmode="numeric" placeholder="Leave blank to keep current"/>
            </div>
          </div>

          <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.06);padding-top:4px">

            <!-- Notify owner toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
              <div style="flex:1;min-width:0;padding-right:12px">
                <div style="font-size:14px;font-weight:500">Notify owner of PIN change</div>
                <div style="font-size:12px;color:var(--lbl2);margin-top:2px">Email sent to owner's signup address only</div>
              </div>
              ${toggleHtml('notify', _s.notify)}
            </div>

            <!-- Force reset toggle -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0">
              <div style="flex:1;min-width:0;padding-right:12px">
                <div style="font-size:14px;font-weight:500">Force owner to reset PIN</div>
                <div style="font-size:12px;color:var(--lbl2);margin-top:2px">Owner must reset on next login</div>
              </div>
              ${toggleHtml('force', _s.force)}
            </div>

          </div>

          <!-- Send reset email now -->
          <button onclick="window._sebSendReset('${bizId}')"
            style="width:100%;margin-top:4px;padding:11px;border-radius:var(--r-sm);
              border:1px solid rgba(255,209,102,.25);background:rgba(255,209,102,.08);
              color:#ffd166;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
            📧 Send Reset Email to Owner Now
          </button>
        </div>

        <!-- Notification Settings -->
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-md);padding:16px">
          <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--lbl2);margin-bottom:14px">🔔 Notification Settings</div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <div style="flex:1;padding-right:12px">
              <div style="font-size:14px;font-weight:500">Review notifications</div>
              <div style="font-size:12px;color:var(--lbl2);margin-top:2px">New tap reviews trigger alerts</div>
            </div>
            ${toggleHtml('notif-reviews', _s['notif-reviews'])}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <div style="flex:1;padding-right:12px">
              <div style="font-size:14px;font-weight:500">Leaderboard & performance alerts</div>
              <div style="font-size:12px;color:var(--lbl2);margin-top:2px">Staff ranking updates</div>
            </div>
            ${toggleHtml('notif-leaderboard', _s['notif-leaderboard'])}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <div style="flex:1;padding-right:12px">
              <div style="font-size:14px;font-weight:500">AI coaching insights</div>
              <div style="font-size:12px;color:var(--lbl2);margin-top:2px">Weekly AI summaries to manager</div>
            </div>
            ${toggleHtml('notif-coaching', _s['notif-coaching'])}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0">
            <div style="flex:1;padding-right:12px">
              <div style="font-size:14px;font-weight:500;color:var(--ios-red)">Mute all notifications</div>
              <div style="font-size:12px;color:var(--lbl2);margin-top:2px">Overrides all settings above</div>
            </div>
            ${toggleHtml('notif-mute', _s['notif-mute'])}
          </div>
        </div>

        <!-- Save -->
        <button class="btn btn-primary btn-full" onclick="window._sebSave('${bizId}')">
          Save Changes
        </button>

      </div>`);

    // Toggle handler — reads/writes _s which is scoped to this modal open
    window._sebToggle = function(key) {
      _s[key] = !_s[key];
      var el = document.getElementById('seb-' + key);
      if (el) el.className = 'toggle' + (_s[key] ? ' on' : '');
    };

    // Send reset email immediately — goes to owner signup email only
    window._sebSendReset = async function(bId) {
      try {
        await API.business.update(bId, { sendPinReset: true });
        showToast('Reset email sent to owner ✓');
      } catch(e) {
        showToast(e.message || 'Failed to send reset email');
      }
    };

    // Save all changes
    window._sebSave = async function(bId) {
      var newName  = document.getElementById('seb-name')?.value?.trim();
      var adminPin = document.getElementById('seb-admin-pin')?.value?.trim();
      var mgrPin   = document.getElementById('seb-mgr-pin')?.value?.trim();

      if (!newName)                               { showToast('Business name cannot be empty'); return; }
      if (adminPin && adminPin.length < 4)        { showToast('Admin PIN must be 4+ digits'); return; }
      if (mgrPin   && mgrPin.length < 4)          { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin && mgrPin && adminPin===mgrPin) { showToast('PINs must be different'); return; }

      var updates = {
        name: newName,
        pinChange: {
          notifyOwner: _s['notify'],
          forceReset:  _s['force'],
        },
        notifications: {
          reviews:     _s['notif-reviews'],
          leaderboard: _s['notif-leaderboard'],
          coaching:    _s['notif-coaching'],
          muteAll:     _s['notif-mute'],
        },
      };
      if (adminPin) updates.adminPin   = adminPin;
      if (mgrPin)   updates.managerPin = mgrPin;

      closeModal();
      showLoading('Saving…');
      try {
        await API.business.update(bId, updates);
        // Update local list cache so name reflects immediately without full reload
        var biz = allBiz.find(b => b.id === bId);
        if (biz) biz.name = newName;
        showToast('Business updated ✓');
      } catch(e) {
        showToast(e.message || 'Save failed');
      }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };
  };

  // ── Links accordion ───────────────────────────────────────────────────────
  window._saTogLinks = async function(bizId) {
    var acc = document.getElementById('accordion-'+bizId);
    var btn = document.getElementById('btn-links-'+bizId);
    if (!acc) return;

    if (openBizId === bizId) {
      acc.style.display = 'none';
      btn.style.background  = 'rgba(255,255,255,.04)';
      btn.style.color       = 'rgba(238,240,248,.6)';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      openBizId = null;
      return;
    }

    if (openBizId) {
      var prev    = document.getElementById('accordion-'+openBizId);
      var prevBtn = document.getElementById('btn-links-'+openBizId);
      if (prev) prev.style.display = 'none';
      if (prevBtn) {
        prevBtn.style.background  = 'rgba(255,255,255,.04)';
        prevBtn.style.color       = 'rgba(238,240,248,.6)';
        prevBtn.style.borderColor = 'rgba(255,255,255,.1)';
      }
    }

    openBizId = bizId;
    acc.style.display = 'block';
    btn.style.background  = 'rgba(0,229,160,.12)';
    btn.style.color       = 'var(--brand)';
    btn.style.borderColor = 'rgba(0,229,160,.4)';

    if (!bizLinks[bizId]) {
      try {
        var r = await API.business.getById(bizId);
        bizLinks[bizId] = (r.business.platformLinks || []).map(p => ({...p}));
      } catch(e) {
        bizLinks[bizId] = [];
      }
    }
    renderAccordion(bizId);
  };

  function renderAccordion(bizId) {
    var el = document.getElementById('links-body-'+bizId);
    if (!el) return;
    el.innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--lbl2);margin-bottom:12px">
        Review Platforms for this business
      </div>
      <div id="lk-items-${bizId}"></div>
      <button onclick="window._saAddLk('${bizId}')"
        style="width:100%;padding:11px;border-radius:var(--r-sm);border:1px dashed rgba(0,229,160,.4);
          background:rgba(0,229,160,.05);color:var(--brand);font-size:13px;font-weight:700;
          cursor:pointer;font-family:inherit;margin-bottom:12px">
        + Add Platform
      </button>
      <button onclick="window._saSaveLk('${bizId}')"
        class="btn btn-primary btn-full" style="padding:11px;font-size:13px">
        Save
      </button>`;
    renderLkItems(bizId);
  }

  function renderLkItems(bizId) {
    var el = document.getElementById('lk-items-'+bizId);
    if (!el) return;
    var links = bizLinks[bizId] || [];
    if (links.length === 0) {
      el.innerHTML = '<div style="color:var(--lbl2);font-size:13px;text-align:center;padding:12px 0;margin-bottom:10px">No platforms yet.</div>';
      return;
    }
    el.innerHTML = links.map((l, i) => `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-md);padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:24px;width:38px;height:38px;background:rgba(255,255,255,.06);border-radius:var(--r-xs);display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(l.icon||'🔗')}</div>
          <div style="flex:1;font-weight:700;font-size:14px;color:var(--white)">${esc(l.name||'New Platform')}</div>
          <button onclick="window._saRmLk('${bizId}',${i})"
            style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:7px;
              padding:4px 9px;font-size:12px;font-weight:700;color:var(--red);cursor:pointer;font-family:inherit">✕</button>
        </div>
        <div class="field-lbl">Name</div>
        <input class="inp" value="${esc(l.name||'')}" placeholder="e.g. Google"
          oninput="window._saLkField('${bizId}',${i},'name',this.value)"
          style="margin-bottom:8px;font-size:13px;padding:9px 12px"/>
        <div class="field-lbl">URL</div>
        <input class="inp" value="${esc(l.url||'')}" placeholder="https://…"
          oninput="window._saLkField('${bizId}',${i},'url',this.value)"
          style="margin-bottom:10px;font-size:13px;padding:9px 12px"/>
        <div class="field-lbl">Icon</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${EMOJIS.map(em=>`
            <button onclick="window._saLkIcon('${bizId}',${i},'${em}')"
              style="width:36px;height:36px;border-radius:var(--r-xs);font-size:18px;
                border:2px solid ${(l.icon||'🔗')===em?'var(--brand)':'rgba(255,255,255,.1)'};
                background:${(l.icon||'🔗')===em?'rgba(0,229,160,.12)':'rgba(255,255,255,.04)'};
                cursor:pointer">${em}</button>`).join('')}
        </div>
      </div>`).join('');
  }

  window._saAddLk = function(bizId) {
    if (!bizLinks[bizId]) bizLinks[bizId] = [];
    bizLinks[bizId].push({ name: '', icon: '🔗', url: '', enabled: true });
    renderLkItems(bizId);
  };

  window._saRmLk = function(bizId, i) {
    if (bizLinks[bizId]) bizLinks[bizId].splice(i, 1);
    renderLkItems(bizId);
  };

  window._saLkField = function(bizId, i, field, val) {
    if (bizLinks[bizId] && bizLinks[bizId][i]) bizLinks[bizId][i][field] = val;
  };

  window._saLkIcon = function(bizId, i, emoji) {
    if (bizLinks[bizId] && bizLinks[bizId][i]) {
      bizLinks[bizId][i].icon = emoji;
      renderLkItems(bizId);
    }
  };

  window._saSaveLk = async function(bizId) {
    var links = bizLinks[bizId] || [];
    for (var i = 0; i < links.length; i++) {
      if (!links[i].name) { showToast('Enter a name for each platform'); return; }
      if (!links[i].url)  { showToast('Enter a URL for each platform'); return; }
    }
    var toSave = links.map(l => ({
      platform: l.name.toLowerCase().replace(/\s+/g, '-'),
      name: l.name, label: l.name,
      icon: l.icon || '🔗',
      url: l.url, enabled: true
    }));
    try {
      await API.business.update(bizId, { platformLinks: toSave });
      showToast('Saved ✓');
    } catch(e) { showToast(e.message || 'Save failed'); }
  };

  // ── View / Delete / Search / Create (unchanged) ───────────────────────────
  window._saViewBiz = async function(id) {
    showLoading('Loading…');
    try {
      var d = await API.business.getById(id);
      State.biz = d.business;
      State.session = { ...State.session, bizId: id, role: 'bizAdmin' };
      await loadDashboardData();
      renderDashboard();
    } catch(e) { showToast(e.message || 'Failed'); renderSuperAdminDashboard(); }
  };

  window._saDeleteBiz = async function(id, name) {
    if (!confirm('Delete ' + name + '? This cannot be undone.')) return;
    showLoading('Deleting…');
    try {
      await API.business.delete(id);
      showToast(name + ' deleted');
      renderSuperAdminDashboard();
    } catch(e) { showToast(e.message || 'Delete failed'); renderSuperAdminDashboard(); }
  };

  window._saSearch = async function(q) {
    if (!q || q.length < 2) { renderList(allBiz); return; }
    try {
      var d = await API.business.getBySlug(q.trim().toLowerCase());
      if (d.business) renderList([d.business]);
    } catch(e) { renderList([]); }
  };

  window._saCreateBiz = function() {
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Create Business</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 20px;display:flex;flex-direction:column;gap:12px">
        <div><div class="field-lbl">Owner Email</div><input class="inp" id="sa-cb-email" type="email" placeholder="owner@business.com"/></div>
        <div><div class="field-lbl">Owner Password</div><input class="inp" id="sa-cb-pass" type="password" placeholder="Min 6 characters"/></div>
        <div><div class="field-lbl">Business Name</div><input class="inp" id="sa-cb-name" placeholder="The James Room"/></div>
        <div><div class="field-lbl">Admin PIN (4–6 digits)</div><input class="inp" id="sa-cb-admin" type="number" inputmode="numeric" placeholder="e.g. 1234"/></div>
        <div><div class="field-lbl">Manager PIN (4–6 digits)</div><input class="inp" id="sa-cb-mgr" type="number" inputmode="numeric" placeholder="e.g. 5678"/></div>
        <button class="btn btn-primary btn-full" onclick="window._saDoCreate()">Create Business</button>
      </div>`);
    window._saDoCreate = async function() {
      var email    = $('sa-cb-email')?.value?.trim();
      var pass     = $('sa-cb-pass')?.value;
      var name     = $('sa-cb-name')?.value?.trim();
      var adminPin = $('sa-cb-admin')?.value?.trim();
      var mgrPin   = $('sa-cb-mgr')?.value?.trim();
      if (!email)                       { showToast('Enter owner email'); return; }
      if (!pass || pass.length < 6)     { showToast('Password must be 6+ characters'); return; }
      if (!name)                        { showToast('Enter business name'); return; }
      if (!adminPin||adminPin.length<4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (!mgrPin||mgrPin.length<4)     { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin === mgrPin)          { showToast('PINs must be different'); return; }
      closeModal(); showLoading('Creating…');
      try {
        var cred    = await fbAuth.createUserWithEmailAndPassword(email, pass);
        var idToken = await cred.user.getIdToken();
        sessionStorage.setItem('tp_session', JSON.stringify({ token: idToken }));
        var d = await API.business.create({ name, adminPin, managerPin: mgrPin });
        sessionStorage.setItem('tp_session', JSON.stringify(State.session));
        showToast(name + ' created! Code: ' + d.business.storeCode, 4000);
        renderSuperAdminDashboard();
        setTimeout(() => window._saT('biz'), 500);
      } catch(e) {
        sessionStorage.setItem('tp_session', JSON.stringify(State.session));
        showToast(e.message || 'Failed');
        renderSuperAdminDashboard();
      }
    };
  };

  draw(allBiz);
}


// ── Customer Tap Page ─────────────────────────────────────────────────────────