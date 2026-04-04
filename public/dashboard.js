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
            : `<div style="display:flex;align-items:center;gap:10px"><img src="${window._tapPlusLogo||''}" style="height:22px;opacity:.9;display:block"/><div style="font-size:14px;font-weight:500;color:var(--lbl2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(biz.name)}</div></div>`}
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
