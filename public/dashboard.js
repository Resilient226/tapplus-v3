function renderDashboard(){
  const {session:sess,biz,staff,taps,layout}=State;
  const role=sess?.role;
  const me=role==='staff'?staff.find(s=>s.id===sess?.staffId):null;
  const defaults={staff:['coaching','feedback','goals','stats','branding'],manager:['ai','analytics','team','staff','goals','estimator','branding2'],bizAdmin:['ai','analytics','team','staff','goals','branding2']};
  const sections=layout?.[role]||defaults[role]||defaults.staff;
  const LABELS={coaching:'Coaching',feedback:'Feedback',goals:'Goals',stats:'Stats',branding:'Branding',ai:'AI Insights',team:'Team',staff:'Staff',links:'Links',estimator:'Estimator',settings:'Settings',branding2:'Branding',analytics:'Analytics',analytics:'Analytics'};
  let active=sections[0];

  const greeting=role==='staff'&&me?`Hey, ${esc(me.firstName)} 👋`:(role==='manager'?'Team Dashboard':role==='bizAdmin'?'Admin Panel':'Dashboard');
  app().innerHTML=`
    <div style="max-width:480px;margin:0 auto;padding:16px 16px 96px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-top:max(8px,env(safe-area-inset-top,0px))">
        <div style="min-width:0;flex:1">
          <div style="font-size:24px;font-weight:700;letter-spacing:-.04em;line-height:1.1">${greeting}</div>
          <div style="font-size:13px;color:var(--lbl3);margin-top:4px;font-weight:400">${esc(biz.name)}</div>
        </div>
        <button onclick="window._logout()"
          style="background:var(--fill);border:none;border-radius:100px;padding:7px 16px;
                 color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;
                 font-family:inherit;flex-shrink:0;margin-left:12px">
          Sign Out
        </button>
      </div>
      <div class="tabs">${sections.map(s=>`<button class="tab${s===active?' active':''}" onclick="window._tab('${s}')" id="tab-${s}">${LABELS[s]||s}</button>`).join('')}</div>
      <div id="dash-body" class="fade-up"></div>
    </div>
    <div class="nav-bar">
      <div class="nav-item active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2" opacity=".5"/><rect x="3" y="14" width="7" height="7" rx="2" opacity=".5"/><rect x="14" y="14" width="7" height="7" rx="2" opacity=".3"/></svg>
        <div>Home</div>
      </div>
      <div class="nav-item" onclick="window._preview()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.5"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/></svg>
        <div>Preview</div>
      </div>
      <div class="nav-item" onclick="window._logout()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
    var b=biz.branding||{};
    var reviewLinks=biz.reviewLinks||biz.links||[];
    var bulletinLinks=b.bulletinLinks||[];
    var brandColor=b.brandColor||'#00e5a0';
    var bgColor=b.bgColor||'#000000';
    var textColor=b.textColor||'#ffffff';

    // Build a review link row identical to real tap page
    function reviewLinkRow(l){
      var ICONS={google:'🔍',yelp:'⭐',tripadvisor:'🦉',custom:'🔗',spotify:'🎵',phone:'📞',email:'✉️',instagram:'📸',tiktok:'🎵'};
      var icon=ICONS[(l.type||l.platform||'').toLowerCase()]||'🔗';
      var url=l.url||'#';
      var href=l.type==='phone'?'tel:'+url:l.type==='email'?'mailto:'+url:url;
      // Mark first as redirect target if 5★ redirect
      var badge=l.redirectOn5Star?`<span style="background:${brandColor};color:#000;font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px;letter-spacing:.04em;margin-left:8px">5★</span>`:'';
      return`<a href="${esc(href)}" target="_blank" rel="noreferrer"
        style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);
               border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px 16px;
               text-decoration:none;margin-bottom:10px">
        <div style="width:44px;height:44px;border-radius:12px;background:${esc(brandColor)}18;
             display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icon}</div>
        <div style="flex:1;text-align:left">
          <div style="font-weight:600;font-size:15px;color:${esc(textColor)}">${esc(l.label||l.platform||'Review Link')}${badge}</div>
          ${l.sublabel?`<div style="font-size:12px;opacity:.4;margin-top:2px">${esc(l.sublabel)}</div>`:''}
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M8 5l5 5-5 5" stroke="${esc(brandColor)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>`;
    }

    app().innerHTML=`
      <!-- Preview bar -->
      <div style="position:fixed;top:0;left:0;right:0;z-index:100;
        background:rgba(0,0,0,.92);backdrop-filter:blur(20px);
        border-bottom:.5px solid rgba(255,255,255,.1);
        padding:12px 16px;display:flex;align-items:center;gap:12px">
        <button onclick="renderDashboard()"
          style="background:var(--fill);border:none;border-radius:100px;
                 padding:7px 16px;color:var(--lbl2);font-size:13px;font-weight:500;
                 cursor:pointer;font-family:inherit">← Back</button>
        <div style="font-size:13px;font-weight:500;color:var(--lbl3)">Customer View Preview</div>
      </div>

      <!-- Tap page simulation -->
      <div style="padding-top:56px;min-height:100vh;background:${esc(bgColor)};color:${esc(textColor)}">
        <div style="max-width:420px;margin:0 auto;padding:28px 24px 60px;display:flex;flex-direction:column;align-items:center">

          <!-- Staff bubble placeholder -->
          <div id="staff-bubble-preview" onclick="window._toggleStaffPreview()"
            style="position:absolute;top:20px;right:20px;cursor:pointer;z-index:10">
            <div style="width:52px;height:52px;border-radius:50%;
              background:${esc(brandColor)}22;border:2.5px solid ${esc(brandColor)};
              display:flex;align-items:center;justify-content:center;
              font-size:17px;font-weight:700;color:${esc(brandColor)};
              box-shadow:0 4px 16px rgba(0,0,0,.4)">?</div>
          </div>
          <div id="staff-popup-preview" style="display:none;position:absolute;top:80px;right:20px;
            background:var(--bg2);border:.5px solid var(--sep);border-radius:20px;
            padding:18px 20px;min-width:170px;z-index:20;box-shadow:0 12px 40px rgba(0,0,0,.6)">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              <div style="width:40px;height:40px;border-radius:50%;background:${esc(brandColor)}22;
                display:flex;align-items:center;justify-content:center;font-size:14px;
                font-weight:700;color:${esc(brandColor)}">J</div>
              <div>
                <div style="font-weight:600;font-size:15px;color:${esc(textColor)}">Staff Name</div>
                <div style="font-size:11px;color:${esc(brandColor)};font-weight:500;margin-top:2px">Server</div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--lbl3);padding-top:8px;border-top:.5px solid var(--sep)">
              Staff links appear here
            </div>
          </div>

          <!-- Logo / name -->
          <div style="text-align:center;margin-bottom:28px">
            ${b.logoUrl
              ? `<img src="${esc(b.logoUrl)}" style="height:88px;max-width:240px;object-fit:contain;border-radius:18px"/>`
              : `<div style="width:72px;height:72px;border-radius:18px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:600;color:${esc(textColor)};margin:0 auto 12px">${(b.name||'?')[0].toUpperCase()}</div>
                 <div style="font-size:22px;font-weight:700;letter-spacing:-.02em">${esc(b.name||'Your Business')}</div>`}
            ${b.tagline?`<div style="font-size:13px;opacity:.45;margin-top:8px;letter-spacing:.01em">${esc(b.tagline)}</div>`:''}
          </div>

          <!-- Rating question + stars -->
          <div style="text-align:center;width:100%;margin-bottom:28px">
            <div style="font-size:20px;font-weight:700;letter-spacing:-.02em;margin-bottom:20px;line-height:1.3">
              ${esc(b.ratingQuestion||'How was your experience today?')}
            </div>
            <div style="display:flex;gap:8px;justify-content:center">
              ${[1,2,3,4,5].map(i=>`
                <div id="pcs${i}" onclick="window._pStar(${i})"
                  style="font-size:52px;cursor:pointer;transition:all .2s;
                         filter:grayscale(1);opacity:.25;color:${esc(brandColor)}">★</div>`).join('')}
            </div>
          </div>

          <!-- After-rating area -->
          <div id="p-after" style="width:100%"></div>

          <!-- Bulletin board -->
          ${bulletinLinks.length?`
          <div style="width:100%;margin-top:24px">
            <div style="font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
                        opacity:.25;margin-bottom:18px;text-align:center">${esc(b.name||'')}</div>
            ${bulletinLinks.map(l=>_previewLinkRow(l,b)).join('')}
          </div>`:''}

          <!-- Powered by -->
          <div style="margin-top:40px;text-align:center;font-size:9px;font-weight:700;
                      letter-spacing:.18em;text-transform:uppercase;opacity:.12">
            POWERED BY TAP+
          </div>
        </div>
      </div>`;

    window._pStar=function(r){
      for(var i=1;i<=5;i++){
        var el=document.getElementById('pcs'+i);
        if(el){
          el.style.filter=i<=r?'none':'grayscale(1)';
          el.style.opacity=i<=r?'1':'.25';
          el.style.transform=i<=r?'scale(1.1)':'scale(1)';
        }
      }
      var after=document.getElementById('p-after');
      if(!after)return;

      if(r>=5){
        // 5 star — show redirect message + review links
        var firstRedirect=reviewLinks.find(function(l){return l.redirectOn5Star;});
        var rp=esc(b.reviewPrompt||'Share your experience!');
        var lh=reviewLinks.length
          ? reviewLinks.map(reviewLinkRow).join('')
          : `<div style="padding:20px;text-align:center;opacity:.4;font-size:14px">No review links configured yet</div>`;
        after.innerHTML=`
          <div style="text-align:center;margin-bottom:20px;animation:fadeUp .3s ease">
            <div style="font-size:18px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px">${rp}</div>
            ${firstRedirect?`<div style="font-size:12px;opacity:.4">Redirecting to ${esc(firstRedirect.label||'top review site')} in 2s…</div>`:''}
          </div>${lh}`;
      } else if(r>=4){
        // 4 star — show all review links
        var rp=esc(b.reviewPrompt||'Share your experience!');
        var lh=reviewLinks.length
          ? reviewLinks.map(reviewLinkRow).join('')
          : `<div style="padding:20px;text-align:center;opacity:.4;font-size:14px">No review links configured yet</div>`;
        after.innerHTML=`
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:18px;font-weight:700;letter-spacing:-.02em">${rp}</div>
          </div>${lh}`;
      } else {
        // 1-3 star — private feedback
        var lm=esc(b.lowRatingMsg||"We're sorry to hear that. Tell us what happened.");
        after.innerHTML=`
          <div style="text-align:center;margin-bottom:16px;animation:fadeUp .3s ease">
            <div style="font-size:18px;font-weight:700;letter-spacing:-.02em">${lm}</div>
          </div>
          <textarea style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.12);
            border-radius:16px;padding:16px;color:${esc(textColor)};
            font-family:inherit;outline:none;resize:none;min-height:110px;font-size:15px;line-height:1.6"
            placeholder="Tell us what happened…"></textarea>
          <button style="width:100%;margin-top:12px;background:${esc(brandColor)};color:#000;border:none;
            border-radius:16px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit">
            Submit Feedback
          </button>
          <div style="margin-top:10px;text-align:center;font-size:12px;opacity:.3">(Preview only — not submitted)</div>`;
      }
    };

    window._toggleStaffPreview=function(){
      var p=document.getElementById('staff-popup-preview');
      if(p)p.style.display=p.style.display==='none'?'block':'none';
    };
  };
  window._tab(sections[0]);
}

// ── Staff Tabs ────────────────────────────────────────────────────────────────