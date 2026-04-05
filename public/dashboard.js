function renderDashboard(){
  const {session:sess,biz,staff,taps,layout}=State;
  const role=sess?.role;
  const me=role==='staff'?staff.find(s=>s.id===sess?.staffId):null;
  const defaults={staff:['coaching','feedback','goals','stats','branding'],manager:['ai','analytics','team','staff','goals','estimator','branding2'],bizAdmin:['ai','analytics','team','staff','goals','branding2']};
  const sections=layout?.[role]||defaults[role]||defaults.staff;
  const LABELS={coaching:'Coaching',feedback:'Feedback',goals:'Goals',stats:'Stats',branding:'Branding',ai:'AI Insights',team:'Team',staff:'Staff',links:'Links',estimator:'Estimator',settings:'Settings',branding2:'Branding',analytics:'Analytics',analytics:'Analytics'};
  let active=sections[0];

  app().innerHTML=`
    <div style="max-width:480px;margin:0 auto;padding:16px 16px 96px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-top:env(safe-area-inset-top,0)">
        <div style="min-width:0;flex:1">
          ${biz.branding?.logoUrl
            ? `<img src="${esc(biz.branding.logoUrl)}" style="height:28px;max-width:120px;object-fit:contain;border-radius:6px;display:block"/>`
            : `<div style="display:flex;align-items:center;gap:10px"><img src="data:image/png;base64,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" height="22" style="display:block;opacity:.95"/><div style="font-size:14px;font-weight:500;color:var(--lbl2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(biz.name)}</div></div>`}
          <div style="font-size:12px;color:var(--lbl3);margin-top:2px;font-weight:400">${role==='staff'&&me?esc(staffDisplay(me)):({staff:'Staff',manager:'Manager',bizAdmin:'Admin',superAdmin:'Super Admin'}[role]||role)}</div>
        </div>
        <button onclick="window._logout()" style="background:var(--fill-ultra);border:none;border-radius:var(--r-sm);padding:7px 14px;color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0;margin-left:12px">Sign Out</button>
      </div>
      <div class="tabs">${sections.map(s=>`<button class="tab${s===active?' active':''}" onclick="window._tab('${s}')" id="tab-${s}">${LABELS[s]||s}</button>`).join('')}</div>
      <div id="dash-body" class="fade-up"></div>
    </div>
    <div class="nav-bar">
      <div class="nav-item active" style="color:var(--brand)">
        <div class="nav-icon">⊞</div>
        <div>Dashboard</div>
      </div>
      <div class="nav-item" onclick="window._preview()">
        <div class="nav-icon">◎</div>
        <div>Preview</div>
      </div>
      <div class="nav-item" onclick="window._logout()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <div>Sign Out</div>
      </div>
    </div>`;

  window._tab=function(s){
    active=s;
    sections.forEach(x=>{const b=$('tab-'+x);if(b)b.className='tab'+(x===s?' active':'');});
    const body=$('dash-body');if(!body)return;
    body.classList.remove('fade-up');void body.offsetWidth;body.classList.add('fade-up');
    switch(s){
      case 'coaching':  body.innerHTML=renderCoachingTab(me);break;
      case 'feedback':  body.innerHTML=renderFeedbackTab(me);break;
      case 'goals':     body.innerHTML=renderGoalsTab(me);break;
      case 'stats':     body.innerHTML=renderStatsTab(me);break;
      case 'branding':  renderBrandingTab(body,me);break;
      case 'ai':        renderAITab(body);break;
      case 'team':      renderTeamTab(body);break;
      case 'staff':     renderStaffTab(body);break;
      case 'estimator': body.innerHTML=renderEstimatorTab();break;
      case 'settings':  renderSettingsTab(body);break;
      case 'branding2': renderSettingsTab(body);break;
      case 'analytics': renderAnalyticsTab(body);break;
      default:          body.innerHTML=`<div style="color:var(--gray);text-align:center;padding:40px">Coming soon</div>`;
    }
  };
  window._logout=function(){
    API.auth.logout();
    State.session=null;
    State.staff=[];
    State.taps=[];
    // Keep State.biz so role select shows the right business
    renderRoleSelect();
  };
  window._saveLocation=function(){
    if(State.biz) {
      saveLocation(State.biz);
      showToast('Location saved ✓');
    }
  };
  function _previewLinkRow(l,b){
    var url=l.url||'';
    if(l.type==='text')return`<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 18px;margin-bottom:10px"><div style="font-weight:700;font-size:14px">${esc(l.label)}</div>${l.sublabel?`<div style="font-size:12px;opacity:.5;margin-top:4px">${esc(l.sublabel)}</div>`:''}</div>`;
    if(l.type==='spotify'){var ms=url.match(/spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);if(ms)return`<div style="width:100%;border-radius:14px;overflow:hidden;margin-bottom:10px"><iframe src="https://open.spotify.com/embed/${ms[1]}/${ms[2]}?utm_source=generator&theme=0" width="100%" height="80" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture" style="border-radius:14px;display:block"></iframe></div>`;}
    var ytL=url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/),ytS=url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/),ytId=(ytL||ytS)?.[1];
    if(ytId)return`<div style="width:100%;border-radius:14px;overflow:hidden;margin-bottom:10px;position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:14px;display:block"></iframe></div>`;
    var vmId=url.match(/vimeo\.com\/([0-9]+)/)?.[1];
    if(vmId)return`<div style="width:100%;border-radius:14px;overflow:hidden;margin-bottom:10px;position:relative;padding-top:56.25%"><iframe src="https://player.vimeo.com/video/${vmId}?color=00e5a0&byline=0&portrait=0" frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:14px;display:block"></iframe></div>`;
    var ICONS={google:'🔍',yelp:'⭐',tripadvisor:'🦉',custom:'🔗',spotify:'🎵',phone:'📞',email:'✉️',instagram:'📸',tiktok:'🎵'};
    var icon=ICONS[(l.type||'').toLowerCase()]||'🔗';
    var href=l.type==='phone'?'tel:'+url:l.type==='email'?'mailto:'+url:url||'#';
    return`<a href="${esc(href)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 16px;text-decoration:none;margin-bottom:10px"><div style="width:42px;height:42px;border-radius:12px;background:${esc((b&&b.brandColor)||'#00e5a0')}18;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icon}</div><div style="flex:1;text-align:left"><div style="font-weight:700;font-size:14px;color:${esc((b&&b.textColor)||'#fff')}">${esc(l.label||'Link')}</div>${l.sublabel?`<div style="font-size:11px;opacity:.45;margin-top:2px">${esc(l.sublabel)}</div>`:''}</div></a>`;
  }
  window._preview=function(){
    var biz=State.biz;if(!biz)return;
    var b=biz.branding||{},links=biz.links||[],bulletinLinks=b.bulletinLinks||[];
    app().innerHTML=`
      <div style="position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(7,8,12,.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;gap:12px">
        <button onclick="renderDashboard()" style="background:rgba(255,255,255,.08);border:1px solid var(--border);border-radius:8px;padding:7px 14px;color:var(--white);font-size:13px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">← Back</button>
        <div style="font-size:13px;font-weight:700;color:var(--gray)">Preview Mode</div>
      </div>
      <div style="padding-top:56px"><div class="tap-page">
        <div style="margin-top:16px;margin-bottom:24px;text-align:center">
          ${b.logoUrl?`<img src="${esc(b.logoUrl)}" style="height:80px;max-width:220px;object-fit:contain;border-radius:16px"/>`:`<div style="font-size:28px;font-weight:900">${esc(b.name||'Your Business')}</div>`}
          ${b.tagline?`<div style="font-size:13px;opacity:.4;margin-top:8px">${esc(b.tagline)}</div>`:''}
        </div>
        <div style="text-align:center;margin-bottom:28px;width:100%">
          <div style="font-size:20px;font-weight:900;margin-bottom:20px">${esc(b.ratingQuestion||'How was your experience today?')}</div>
          <div style="display:flex;gap:10px;justify-content:center">
            ${[1,2,3,4,5].map(i=>`<div id="pcs${i}" style="font-size:42px;cursor:pointer;transition:transform .15s;filter:grayscale(1);opacity:.3" onclick="window._pStar(${i})">★</div>`).join('')}
          </div>
        </div>
        <div id="p-after" style="width:100%"></div>
        ${bulletinLinks.length?`<div style="width:100%;margin-top:16px"><div style="font-size:10px;font-weight:700;opacity:.3;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;text-align:center">${esc(b.name)}</div>${bulletinLinks.map(l=>_previewLinkRow(l,b)).join('')}</div>`:''}
        ${links.length?`<div style="width:100%;margin-top:8px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;color:var(--gray);font-size:13px">${links.length} review link${links.length>1?'s':''} configured</div>`:''}
        <div style="position:fixed;bottom:10px;left:0;right:0;text-align:center;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;opacity:.08;pointer-events:none">POWERED BY TAP+</div>
      </div></div>`;
    window._pStar=function(r){
      for(var i=1;i<=5;i++){var el=document.getElementById('pcs'+i);if(el){el.style.filter=i<=r?'none':'grayscale(1)';el.style.opacity=i<=r?'1':'.3';}}
      var after=document.getElementById('p-after');if(!after)return;
      if(r>=4){
        var rp=esc(b.reviewPrompt||"Share your experience!");
        var lh=links.length?links.map(function(l){return'<div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 16px;margin-bottom:10px"><div style="width:42px;height:42px;border-radius:12px;background:rgba(0,229,160,.1);display:flex;align-items:center;justify-content:center;font-size:20px">⭐</div><div style="flex:1;font-weight:700">'+esc(l.label||l.platform)+'</div></div>';}).join(""):"<div style='padding:16px;text-align:center;color:rgba(238,240,248,.5);font-size:14px'>No review links configured yet</div>";
        after.innerHTML='<div style="text-align:center;margin-bottom:16px"><div style="font-size:16px;font-weight:800;margin-bottom:8px">'+rp+'</div></div>'+lh;
      }else if(r<=3){
        var lm=esc(b.lowRatingMsg||"We're sorry to hear that.");
        after.innerHTML='<div style="text-align:center;margin-bottom:12px"><div style="font-size:16px;font-weight:800">'+lm+'</div></div><textarea style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;color:#eef0f8;font-family:Nunito,sans-serif;outline:none;resize:none;min-height:90px;font-size:14px" placeholder="Tell us what happened…"></textarea><div style="margin-top:10px;text-align:center;font-size:13px;color:rgba(238,240,248,.45)">(Preview only)</div>';
      }
    };
  };
  window._tab(sections[0]);
}

// ── Staff Tabs ────────────────────────────────────────────────────────────────