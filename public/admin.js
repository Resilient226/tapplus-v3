async function renderOwnerDashboard(){
  const sess=State.session;
  const bizIds=sess?.businesses||[];
  let active='locations';

  // Load all business data
  showLoading('Loading…');
  let bizList=[];
  try{
    const results=await Promise.allSettled(bizIds.map(b=>API.business.getById(b?.id||b)));
    bizList=results.filter(r=>r.status==='fulfilled').map(r=>r.value.business);
  }catch(e){}

  // Load taps for all locations
  let allTaps=[];
  try{
    const tapResults=await Promise.allSettled(bizList.map(b=>API.taps.list({bizId:b.id})));
    tapResults.forEach((r,i)=>{
      if(r.status==='fulfilled')(r.value.taps||[]).forEach(t=>allTaps.push({...t,bizId:bizList[i]?.id,bizName:bizList[i]?.name}));
    });
  }catch(e){}

  // Compute rollup stats
  const totalTaps=allTaps.length;
  const fiveStarTaps=allTaps.filter(t=>t.rating===5).length;
  const avgRating=allTaps.length?
    (allTaps.reduce((s,t)=>s+(t.rating||0),0)/allTaps.length).toFixed(1):
    '—';
  const totalLocations=bizList.length;

  // FIX 2: Handle null currentUser — Firebase Auth state lost on reload without setPersistence
  window._ownerAddLocation = async function() {
    const auth = window._fbAuth || fbAuth;
    if (!auth) {
      showToast('Please sign out and sign back in to add a location');
      return;
    }
    showLoading('Preparing…');
    try {
      if (!auth.currentUser) {
        showToast('Session expired — please sign out and back in');
        renderOwnerDashboard();
        return;
      }
      const idToken = await auth.currentUser.getIdToken(true);
      renderCreateBusiness(idToken);
    } catch(e) {
      showToast(e.message || 'Failed — please sign out and back in');
      renderOwnerDashboard();
    }
  };

  function render(){
    app().innerHTML=`
      <div style="max-width:480px;margin:0 auto;padding:16px 16px 96px">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-top:max(8px,env(safe-area-inset-top,0px))">
          <div>
            <div style="font-size:24px;font-weight:700;letter-spacing:-.04em">Owner Portal</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:3px">${totalLocations} location${totalLocations!==1?'s':''}</div>
          </div>
          <button onclick="API.auth.logout();State.session=null;State.biz=null;renderHome()"
            style="background:var(--fill);border:none;border-radius:100px;padding:7px 16px;
                   color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">
            Sign Out
          </button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          ${['locations','analytics','billing'].map(t=>`
            <button class="tab${t===active?' active':''}" onclick="window._ownerTab('${t}')"
              id="ot-${t}" style="text-transform:capitalize">${t}</button>`).join('')}
        </div>

        <div id="owner-body" class="fade-up"></div>
      </div>

      <!-- Nav bar -->
      <div class="nav-bar">
        <div class="nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2" opacity=".5"/><rect x="3" y="14" width="7" height="7" rx="2" opacity=".5"/><rect x="14" y="14" width="7" height="7" rx="2" opacity=".3"/></svg>
          <div>Locations</div>
        </div>
        <div class="nav-item" onclick="window._ownerTab('billing')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <div>Billing</div>
        </div>
        <div class="nav-item" onclick="API.auth.logout();State.session=null;renderHome()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <div>Sign Out</div>
        </div>
      </div>`;

    window._ownerTab=function(t){
      active=t;
      ['locations','analytics','billing'].forEach(x=>{
        const b=$('ot-'+x);
        if(b)b.className='tab'+(x===t?' active':'');
      });
      const body=$('owner-body');
      if(!body)return;
      body.classList.remove('fade-up');void body.offsetWidth;body.classList.add('fade-up');
      if(t==='locations')_ownerLocations(body);
      else if(t==='analytics')_ownerAnalytics(body);
      else _ownerBilling(body);
    };

    window._ownerTab('locations');
  }

  // ── Locations tab ───────────────────────────────────────────────────────
  window._ownerLocations=function(body){
    if(bizList.length===0){
      body.innerHTML=`
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:40px;margin-bottom:16px">🏪</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:8px">No locations yet</div>
          <div style="font-size:14px;color:var(--lbl3);margin-bottom:24px">Create your first location to get started</div>
          <button class="btn btn-primary" onclick="window._ownerAddLocation()">Create Location</button>
        </div>`;
      return;
    }

    body.innerHTML=`
      <div class="sec-lbl">Your Locations</div>
      ${bizList.map(b=>{
        const bTaps=allTaps.filter(t=>t.bizId===b.id);
        const bAvg=bTaps.length?(bTaps.reduce((s,t)=>s+(t.rating||0),0)/bTaps.length).toFixed(1):'—';
        const bFive=bTaps.filter(t=>t.rating===5).length;
        const isActive=b.subscriptionStatus==='active';
        return`
        <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:44px;height:44px;border-radius:var(--r-md);background:var(--brand)14;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              ${b.branding?.logoUrl?`<img src="${esc(b.branding.logoUrl)}" style="width:100%;height:100%;border-radius:var(--r-md);object-fit:cover"/>`:'🏪'}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:16px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.name)}</div>
              <div style="font-size:12px;color:var(--lbl3);margin-top:2px">
                Code: <span style="color:var(--brand);font-weight:600">${esc(b.storeCode)}</span>
                <span style="margin-left:8px;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;background:${isActive?'rgba(0,229,160,.15)':'rgba(255,77,106,.1)'};color:${isActive?'var(--brand)':'var(--ios-red)'}">${isActive?'Active':'Inactive'}</span>
              </div>
            </div>
          </div>
          <!-- Mini stats -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
            ${[
              [bTaps.length,'Taps','var(--brand)'],
              [bAvg+'★','Rating','var(--ios-yellow)'],
              [bFive,'5-Stars','var(--a-blue)']
            ].map(([v,l,c])=>`
              <div style="background:var(--bg3);border-radius:10px;padding:10px 8px;text-align:center">
                <div style="font-size:18px;font-weight:700;color:${c};letter-spacing:-.02em">${v}</div>
                <div style="font-size:10px;color:var(--lbl3);margin-top:3px;text-transform:uppercase;letter-spacing:.04em">${l}</div>
              </div>`).join('')}
          </div>
          <!-- Actions -->
          <div style="display:flex;gap:8px">
            <button onclick="${b.subscriptionStatus==='active'?`window._ownerOpenBiz('${b.id}')`:`window._ownerTab('billing')`}"
              style="flex:1;background:${b.subscriptionStatus==='active'?'var(--brand)':'var(--fill)'};
                     border:none;border-radius:var(--r-sm);padding:10px;
                     color:${b.subscriptionStatus==='active'?'#000':'var(--lbl2)'};
                     font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
              ${b.subscriptionStatus==='active'?'Manage':'Subscribe'}
            </button>
            <button onclick="window._ownerChangePins('${b.id}','${esc(b.name)}')"
              style="background:var(--fill);border:none;border-radius:var(--r-sm);padding:10px 16px;
                     color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">
              PINs
            </button>
          </div>
        </div>`;
      }).join('')}
      <button class="btn btn-ghost btn-full" onclick="window._ownerAddLocation()"
        style="border-radius:var(--r-lg);margin-top:4px">
        + Add Location
      </button>`;
  };

  // ── Analytics tab ───────────────────────────────────────────────────────
  window._ownerAnalytics=function(body){
    const statTiles=[
      [totalTaps,'Total Taps','var(--brand)','rgba(0,229,160,.12)'],
      [avgRating+'★','Avg Rating','var(--ios-yellow)','rgba(255,214,10,.1)'],
      [fiveStarTaps,'5-Star Taps','var(--a-blue)','rgba(59,158,255,.1)'],
      [totalLocations,'Locations','var(--a-purple)','rgba(155,89,255,.1)'],
    ];

    const locationRows=bizList.map(b=>{
      const bTaps=allTaps.filter(t=>t.bizId===b.id);
      const bAvg=bTaps.length?(bTaps.reduce((s,t)=>s+(t.rating||0),0)/bTaps.length).toFixed(1):'—';
      const bFive=bTaps.filter(t=>t.rating===5).length;
      return{name:b.name,taps:bTaps.length,avg:bAvg,five:bFive};
    }).sort((a,b)=>b.taps-a.taps);

    body.innerHTML=`
      <div class="stat-grid">
        ${statTiles.map(([v,l,c,bg])=>`
          <div style="background:${bg};border-radius:var(--r-lg);padding:18px 14px">
            <div style="font-size:32px;font-weight:800;color:${c};line-height:1;letter-spacing:-.04em">${v}</div>
            <div style="font-size:11px;font-weight:500;color:${c};opacity:.7;margin-top:6px;text-transform:uppercase;letter-spacing:.04em">${l}</div>
          </div>`).join('')}
      </div>

      ${locationRows.length>1?`
      <div class="sec-lbl" style="margin-top:8px">By Location</div>
      <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden">
        ${locationRows.map((r,i)=>`
          <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:${i<locationRows.length-1?'.5px solid var(--sep)':'none'}">
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div>
              <div style="font-size:12px;color:var(--lbl3);margin-top:1px">${r.avg}★ avg · ${r.five} five-stars</div>
            </div>
            <div style="font-size:18px;font-weight:700;color:var(--brand)">${r.taps}</div>
          </div>`).join('')}
      </div>`:''}

      ${totalTaps===0?`
      <div style="text-align:center;padding:40px 0;color:var(--lbl3)">
        <div style="font-size:32px;margin-bottom:12px">📊</div>
        <div style="font-size:15px">No taps yet.<br/>Share your staff cards to start collecting reviews.</div>
      </div>`:''}`;
  };

  // ── Billing tab ──────────────────────────────────────────────────────────
  window._ownerBilling=function(body){
    const firstBiz=bizList[0];
    const plan=firstBiz?.plan||null;
    const status=firstBiz?.subscriptionStatus||'inactive';
    const planNames={pilot:'World Cup Pilot',annual:'Annual',monthly:'Monthly'};
    const planPrices={pilot:'$69/mo',annual:'$89/mo',monthly:'$109/mo'};
    const planColors={pilot:'var(--ios-orange)',annual:'var(--a-blue)',monthly:'var(--a-blue)'};
    const isActive=status==='active';

    // FIX 1: Expose renderSubscribeFlow with firstBiz in scope — was calling
    // renderSubscribeFlow(bizList[0]) from an onclick string where bizList is
    // out of scope, causing "Can't find variable: renderSubscribeFlow"
    window._ownerSubscribe = function() {
      renderSubscribeFlow(firstBiz);
    };

    // Calculate time remaining
    const subscribedAt=firstBiz?.subscribedAt||null;
    const trialEndsAt=firstBiz?.trialEndsAt||null;
    const now=Date.now();
    let daysLeft=null;
    let renewsDate=null;
    let timeLabel='';
    let progressPct=0;

    if(isActive && subscribedAt){
      if(plan==='pilot'&&trialEndsAt){
        daysLeft=Math.max(0,Math.ceil((trialEndsAt-now)/(86400000)));
        renewsDate=new Date(trialEndsAt);
        timeLabel=`Pilot ends ${renewsDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
        progressPct=Math.round(daysLeft/90*100);
      } else if(plan==='annual'){
        const renewsAt=new Date(subscribedAt);renewsAt.setFullYear(renewsAt.getFullYear()+1);
        daysLeft=Math.max(0,Math.ceil((renewsAt-now)/(86400000)));
        renewsDate=renewsAt;
        timeLabel=`Renews ${renewsDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
        progressPct=Math.round(daysLeft/365*100);
      } else if(plan==='monthly'){
        const renewsAt=new Date(subscribedAt);renewsAt.setMonth(renewsAt.getMonth()+1);
        daysLeft=Math.max(0,Math.ceil((renewsAt-now)/(86400000)));
        renewsDate=renewsAt;
        timeLabel=`Renews ${renewsDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
        progressPct=Math.round(daysLeft/30*100);
      }
    }

    const urgentColor=daysLeft<=7?'var(--ios-red)':daysLeft<=14?'var(--ios-orange)':'var(--brand)';

    body.innerHTML=`
      <!-- Plan card -->
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:20px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em">Current Plan</div>
          <div style="padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;
            background:${isActive?'rgba(0,229,160,.12)':'rgba(255,77,106,.1)'};
            color:${isActive?'var(--brand)':'var(--ios-red)'}">
            ${isActive?'Active':'Inactive'}
          </div>
        </div>

        ${!isActive?`
          <div style="font-size:22px;font-weight:700;margin-bottom:8px">
            ${plan ? planNames[plan] : 'No Active Plan'}
          </div>
          <div style="font-size:14px;color:var(--lbl3);line-height:1.6;margin-bottom:20px">
            ${plan
              ? 'Your subscription is inactive. Subscribe to reactivate your account.'
              : 'Subscribe to start collecting reviews, tracking staff, and growing your ratings.'}
          </div>
          <button onclick="window._ownerSubscribe()"
            style="width:100%;background:var(--brand);border:none;border-radius:var(--r-lg);
                   padding:16px;font-size:17px;font-weight:700;color:#000;cursor:pointer;font-family:inherit">
            ${plan ? 'Reactivate Subscription →' : 'Choose a Plan →'}
          </button>
        `:`
          <div style="font-size:30px;font-weight:700;letter-spacing:-.03em;margin-bottom:4px;color:${planColors[plan]||'var(--brand)'}">
            ${planNames[plan]}
          </div>
          <div style="font-size:15px;color:var(--lbl3);margin-bottom:${daysLeft!==null?'16px':'4px'}">
            ${planPrices[plan]} · ${totalLocations} location${totalLocations!==1?'s':''}
          </div>

          ${daysLeft!==null?`
          <div style="background:var(--bg3);border-radius:var(--r-md);padding:14px 16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="font-size:14px;color:var(--lbl2)">${timeLabel}</div>
              <div style="font-size:22px;font-weight:700;color:${urgentColor};letter-spacing:-.02em">
                ${daysLeft}d
              </div>
            </div>
            <div style="height:5px;background:var(--fill);border-radius:3px;overflow:hidden">
              <div style="height:100%;border-radius:3px;background:${urgentColor};
                width:${progressPct}%;transition:width .5s ease"></div>
            </div>
            ${daysLeft<=7?`
            <div style="font-size:12px;color:var(--ios-red);margin-top:8px;font-weight:500">
              Expiring soon — renew to avoid interruption
            </div>`:''}
          </div>`:''}

          ${plan==='pilot'?`
          <div style="margin-top:12px;padding:12px;background:rgba(255,107,53,.08);
            border-radius:var(--r-sm);border:.5px solid rgba(255,107,53,.2)">
            <div style="font-size:13px;color:var(--ios-orange);font-weight:500;line-height:1.5">
              World Cup Pilot — auto-converts to Monthly ($109/mo) after 90 days
            </div>
          </div>`:''}`}
      </div>

      <!-- Actions -->
      <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden;margin-bottom:12px">
        ${isActive?`
        <div class="ios-row" onclick="window._ownerPortal()" style="cursor:pointer">
          <div style="flex:1">
            <div style="font-size:16px;font-weight:400">Manage Billing</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Update payment method, cancel, or change plan</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`:''}
        <div class="ios-row" onclick="window._ownerAddLocation()" style="cursor:pointer">
          <div style="flex:1">
            <div style="font-size:16px;font-weight:400">Add Location</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Set up a new Tap+ location</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        ${isActive?`
        <div class="ios-row" onclick="window._ownerInvoice()" style="cursor:pointer">
          <div style="flex:1">
            <div style="font-size:16px;font-weight:400">Download Invoice</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Get your latest invoice</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`:''}
      </div>

      <!-- Card order -->
      ${firstBiz?.cardOrder?`
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Card Order</div>
        <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:8px">
          <span style="color:var(--lbl2)">Tap+ Branded</span>
          <span style="font-weight:600">${firstBiz.cardOrder.branded||0} cards</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px">
          <span style="color:var(--lbl2)">Custom Printed</span>
          <span style="font-weight:600">${firstBiz.cardOrder.custom||0} cards</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12px;color:var(--lbl3)">
            Status: <span style="color:var(--brand);font-weight:500;text-transform:capitalize">${firstBiz.cardOrder.status||'pending'}</span>
          </div>
          ${firstBiz.cardOrder.orderedAt?`<div style="font-size:12px;color:var(--lbl3)">${new Date(firstBiz.cardOrder.orderedAt).toLocaleDateString()}</div>`:''}
        </div>
      </div>`:''}

      <!-- Support -->
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px">
        <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Support</div>
        <div style="font-size:14px;color:var(--lbl2);line-height:1.6">
          Questions about your subscription?<br/>
          <a href="mailto:support@tapplus.top" style="color:var(--brand);text-decoration:none;font-weight:500">support@tapplus.top</a>
        </div>
      </div>`;

    // FIX 3: Guard against missing stripeCustomerId — was showing "No billing
    // account found" toast because Stripe checkout was never completed
    window._ownerPortal=async function(){
      if(!firstBiz?.id){showToast('No location found');return;}
      if(!firstBiz?.stripeCustomerId){
        showToast('No active subscription — choose a plan first');
        window._ownerSubscribe();
        return;
      }
      showLoading('Loading billing…');
      try{
        const res=await fetch('/api/subscribe?action=portal',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({bizId:firstBiz.id,returnUrl:window.location.origin})
        });
        const data=await res.json();
        if(data.url)window.location.href=data.url;
        else{showToast(data.error||'Billing portal unavailable');renderOwnerDashboard();}
      }catch(e){showToast('Failed to load billing portal');renderOwnerDashboard();}
    };

    window._ownerInvoice=function(){
      showToast('Invoice download coming soon');
    };
  };

  // ── Shared actions ──────────────────────────────────────────────────────
  window._ownerOpenBiz=async function(id){
    showLoading();
    try{
      const d=await API.business.getById(id);
      State.biz=d.business;
      State.session={...sess,bizId:id,role:'bizAdmin'};
      await loadDashboardData();
      renderDashboard();
    }catch(e){showError(e.message);}
  };

  window._ownerChangePins=function(bizId,bizName){
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Change PINs</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 8px">
        <div style="font-size:14px;color:var(--lbl3);margin-bottom:20px">${esc(bizName)}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">New Admin PIN</div>
            <input class="inp" id="op-admin" type="number" inputmode="numeric" placeholder="4-6 digits · blank to keep"/>
          </div>
          <div>
            <div class="field-lbl">New Manager PIN</div>
            <input class="inp" id="op-mgr" type="number" inputmode="numeric" placeholder="4-6 digits · blank to keep"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._ownerSavePins('${bizId}')" style="margin-top:4px">Save PINs</button>
        </div>
      </div>`);

    window._ownerSavePins=async function(bId){
      const adminPin=$('op-admin')?.value?.trim();
      const mgrPin=$('op-mgr')?.value?.trim();
      if(!adminPin&&!mgrPin){showToast('Enter at least one PIN');return;}
      if(adminPin&&adminPin.length<4){showToast('Admin PIN must be 4+ digits');return;}
      if(mgrPin&&mgrPin.length<4){showToast('Manager PIN must be 4+ digits');return;}
      if(adminPin&&mgrPin&&adminPin===mgrPin){showToast('PINs must be different');return;}
      const updates={};
      if(adminPin)updates.adminPin=adminPin;
      if(mgrPin)updates.managerPin=mgrPin;
      closeModal();showLoading('Saving…');
      try{await API.business.update(bId,updates);showToast('PINs updated ✓');}
      catch(e){showToast(e.message||'Failed');}
      renderOwnerDashboard();
    };
  };

  render();
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
        <button class="tab" onclick="window._saT('analytics')" id="sa-analytics">Analytics</button>
      </div>
      <div id="sa-body"></div>
    </div>`;
  function saLayout(){
    $('sa-body').innerHTML=`<div style="text-align:center;padding:40px"><div class="ripple-loader"><div class="rl rl1"></div><div class="rl rl2"></div><div class="rl rl3"></div><div class="rl rl4"></div><div class="rldot">+</div></div></div>`;
    API.layout.get().then(data=>{
      const L=data.layouts;
      const SECTIONS={staff:['coaching','feedback','goals','stats','branding'],manager:['ai','analytics','team','staff','goals','estimator','branding2'],bizAdmin:['ai','analytics','team','staff','goals','branding2']};
      const SLABELS={coaching:'Coaching',feedback:'Feedback',goals:'Goals',stats:'Stats',branding:'Branding',ai:'AI Insights',team:'Team',staff:'Staff',links:'Links',estimator:'Estimator',settings:'Settings',branding2:'Branding',analytics:'Analytics'};
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
    ['layout','biz','analytics'].forEach(x=>{const b=$('sa-'+x);if(b)b.className='tab'+(x===t?' active':'');});
    if(t==='layout')saLayout();
    else if(t==='analytics'){const sb=$('sa-body');if(sb)renderSAAnalytics(sb);}
    else saBiz();
  };
  window._saT('layout');
}

async function saAccounts(body) {
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>';

  let allAccounts = [];
  let allBiz = [];

  try {
    const [accRes, bizRes] = await Promise.all([
      fetch('/api/accounts', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } }),
      fetch('/api/business?listAll=1', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } })
    ]);
    const accData = await accRes.json();
    const bizData = await bizRes.json();
    if (accData.users) allAccounts = accData.users;
    if (bizData.businesses) allBiz = bizData.businesses;
  } catch(e) {
    body.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:var(--ios-red)">Failed to load accounts</div>';
    return;
  }

  const ownerBizMap = {};
  allBiz.forEach(b => {
    if (!ownerBizMap[b.ownerId]) ownerBizMap[b.ownerId] = [];
    ownerBizMap[b.ownerId].push(b);
  });

  function statusPill(text, color) {
    return `<span style="padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;
      background:${color}18;color:${color};letter-spacing:.04em">${text}</span>`;
  }

  function draw() {
    const incomplete = allAccounts.filter(u => !ownerBizMap[u.uid] || ownerBizMap[u.uid].length === 0);
    const complete   = allAccounts.filter(u => ownerBizMap[u.uid] && ownerBizMap[u.uid].length > 0);

    body.innerHTML = `
      <button class="btn btn-primary btn-full" style="margin-bottom:16px" onclick="window._saInviteAccount()">
        + Invite / Create Account
      </button>

      ${incomplete.length > 0 ? `
      <div class="sec-lbl" style="color:var(--ios-orange)">Incomplete Setup (${incomplete.length})</div>
      <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden;margin-bottom:16px">
        ${incomplete.map((u, i) => `
          <div style="padding:14px 16px;border-bottom:${i < incomplete.length-1 ? '.5px solid var(--sep)' : 'none'}">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,107,53,.15);
                display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;
                color:var(--ios-orange);flex-shrink:0">
                ${(u.email||'?')[0].toUpperCase()}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  ${esc(u.email||'No email')}
                </div>
                <div style="font-size:12px;color:var(--lbl3);margin-top:2px">
                  No business created · Joined ${new Date(u.createdAt||Date.now()).toLocaleDateString()}
                </div>
              </div>
              ${statusPill('Incomplete', 'var(--ios-orange)')}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button onclick="window._saPromptSetup('${esc(u.uid)}','${esc(u.email||'')}')"
                style="flex:1;background:rgba(255,107,53,.12);border:none;border-radius:var(--r-sm);
                       padding:9px;color:var(--ios-orange);font-size:13px;font-weight:600;
                       cursor:pointer;font-family:inherit">
                Complete Setup
              </button>
              <button onclick="window._saDeleteAccount('${esc(u.uid)}','${esc(u.email||'')}')"
                style="background:rgba(255,77,106,.1);border:none;border-radius:var(--r-sm);
                       padding:9px 14px;color:var(--ios-red);font-size:13px;font-weight:600;
                       cursor:pointer;font-family:inherit">
                Delete
              </button>
            </div>
          </div>`).join('')}
      </div>` : ''}

      <div class="sec-lbl">Active Accounts (${complete.length})</div>
      <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden;margin-bottom:16px">
        ${complete.length === 0
          ? '<div style="padding:24px;text-align:center;color:var(--lbl3);font-size:14px">No active accounts yet</div>'
          : complete.map((u, i) => {
            const bizzes = ownerBizMap[u.uid] || [];
            return `
            <div style="padding:14px 16px;border-bottom:${i < complete.length-1 ? '.5px solid var(--sep)' : 'none'}">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,229,160,.12);
                  display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;
                  color:var(--brand);flex-shrink:0">
                  ${(u.email||'?')[0].toUpperCase()}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${esc(u.email||'No email')}
                  </div>
                  <div style="font-size:12px;color:var(--lbl3);margin-top:2px">
                    ${bizzes.length} location${bizzes.length !== 1 ? 's' : ''}
                    · Joined ${new Date(u.createdAt||Date.now()).toLocaleDateString()}
                  </div>
                </div>
                ${statusPill('Active', 'var(--brand)')}
              </div>
              ${bizzes.map(b => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;
                  background:var(--bg3);border-radius:var(--r-sm);margin-bottom:6px">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500">${esc(b.name)}</div>
                    <div style="font-size:11px;color:var(--lbl3);margin-top:1px">
                      Code: <span style="color:var(--brand);font-weight:600">${esc(b.storeCode)}</span>
                      <span style="margin-left:6px;padding:1px 6px;border-radius:100px;font-size:9px;font-weight:700;
                        background:${b.subscriptionStatus==='active'?'rgba(0,229,160,.15)':'rgba(255,77,106,.1)'};
                        color:${b.subscriptionStatus==='active'?'var(--brand)':'var(--ios-red)'}">
                        ${b.subscriptionStatus==='active'?'Active':'Inactive'}
                      </span>
                    </div>
                  </div>
                  <button onclick="window._saViewBiz('${b.id}')"
                    style="background:var(--fill);border:none;border-radius:var(--r-xs);padding:6px 12px;
                           color:var(--lbl2);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">
                    View
                  </button>
                </div>`).join('')}
              <div style="display:flex;gap:8px;margin-top:8px">
                <button onclick="window._saResetPassword('${esc(u.email||'')}')"
                  style="flex:1;background:var(--fill);border:none;border-radius:var(--r-sm);
                         padding:9px;color:var(--lbl2);font-size:13px;font-weight:500;
                         cursor:pointer;font-family:inherit">
                  Reset Password
                </button>
                <button onclick="window._saDeleteAccount('${esc(u.uid)}','${esc(u.email||'')}')"
                  style="background:rgba(255,77,106,.1);border:none;border-radius:var(--r-sm);
                         padding:9px 14px;color:var(--ios-red);font-size:13px;font-weight:600;
                         cursor:pointer;font-family:inherit">
                  Delete
                </button>
              </div>
            </div>`;
          }).join('')}
      </div>`;
  }

  window._saPromptSetup = function(uid, email) {
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Complete Setup</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 8px">
        <div style="font-size:14px;color:var(--lbl3);margin-bottom:20px">
          ${esc(email)} hasn't created a business yet.
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">Business Name</div>
            <input class="inp" id="ps-name" placeholder="e.g. Low Country Kitchen" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">Admin PIN (4-6 digits)</div>
            <input class="inp" id="ps-admin" type="number" inputmode="numeric" placeholder="e.g. 1234" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">Manager PIN (4-6 digits)</div>
            <input class="inp" id="ps-mgr" type="number" inputmode="numeric" placeholder="e.g. 5678" style="border-radius:var(--r-md)"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._saDoSetup('${esc(uid)}')" style="margin-top:4px">
            Create Business
          </button>
        </div>
      </div>`);

    window._saDoSetup = async function(ownerId) {
      const name     = $('ps-name')?.value?.trim();
      const adminPin = $('ps-admin')?.value?.trim();
      const mgrPin   = $('ps-mgr')?.value?.trim();
      if (!name)     { showToast('Enter business name'); return; }
      if (!adminPin || adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (!mgrPin   || mgrPin.length < 4)   { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin === mgrPin) { showToast('PINs must be different'); return; }
      closeModal();
      showLoading('Creating business…');
      try {
        const res = await fetch('/api/business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API.auth.getToken(),
            'X-Owner-Id': ownerId
          },
          body: JSON.stringify({ name, adminPin, managerPin: mgrPin, ownerId })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Business created! Code: ' + data.business.storeCode, 4000);
        } else {
          showToast(data.error || 'Failed');
        }
      } catch(e) {
        showToast(e.message || 'Failed');
      }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('accounts'), 400);
    };
  };

  window._saInviteAccount = function() {
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Create Account</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 8px">
        <div style="font-size:14px;color:var(--lbl3);margin-bottom:20px">
          Create a new owner account and optionally set up their business.
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">Email</div>
            <input class="inp" id="inv-email" type="email" placeholder="owner@restaurant.com" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">Temporary Password</div>
            <input class="inp" id="inv-pass" type="text" placeholder="Min 6 characters" style="border-radius:var(--r-md)"/>
          </div>
          <div style="height:4px"></div>
          <div style="font-size:13px;font-weight:600;color:var(--lbl2)">Business Setup (optional)</div>
          <div>
            <div class="field-lbl">Business Name</div>
            <input class="inp" id="inv-name" placeholder="Leave blank to skip" style="border-radius:var(--r-md)"/>
          </div>
          <div style="display:flex;gap:10px">
            <div style="flex:1">
              <div class="field-lbl">Admin PIN</div>
              <input class="inp" id="inv-admin" type="number" inputmode="numeric" placeholder="4-6 digits" style="border-radius:var(--r-md)"/>
            </div>
            <div style="flex:1">
              <div class="field-lbl">Manager PIN</div>
              <input class="inp" id="inv-mgr" type="number" inputmode="numeric" placeholder="4-6 digits" style="border-radius:var(--r-md)"/>
            </div>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._saDoInvite()" style="margin-top:4px">
            Create Account
          </button>
        </div>
      </div>`);

    window._saDoInvite = async function() {
      const email    = $('inv-email')?.value?.trim();
      const pass     = $('inv-pass')?.value?.trim();
      const bizName  = $('inv-name')?.value?.trim();
      const adminPin = $('inv-admin')?.value?.trim();
      const mgrPin   = $('inv-mgr')?.value?.trim();

      if (!email)          { showToast('Enter email'); return; }
      if (!pass || pass.length < 6) { showToast('Password must be 6+ characters'); return; }
      if (bizName && (!adminPin || adminPin.length < 4)) { showToast('Admin PIN must be 4+ digits'); return; }
      if (bizName && (!mgrPin || mgrPin.length < 4))     { showToast('Manager PIN must be 4+ digits'); return; }
      if (bizName && adminPin && mgrPin && adminPin === mgrPin) { showToast('PINs must be different'); return; }

      closeModal();
      showLoading('Creating account…');

      try {
        const savedSession = sessionStorage.getItem('tp_session');
        const auth = window._fbAuth || fbAuth;
        if (!auth) { showToast('Firebase not ready'); return; }
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        if (savedSession) sessionStorage.setItem('tp_session', savedSession);

        if (bizName && adminPin && mgrPin) {
          const idToken = await cred.user.getIdToken();
          const res = await fetch('/api/business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ name: bizName, adminPin, managerPin: mgrPin })
          });
          const data = await res.json();
          if (data.success) {
            showToast(`${email} created! Code: ${data.business.storeCode}`, 4000);
          } else {
            showToast(`Account created but business failed: ${data.error}`);
          }
        } else {
          showToast(`Account created for ${email}`);
        }
        if (savedSession) sessionStorage.setItem('tp_session', savedSession);
      } catch(e) {
        showToast(e.message || 'Failed');
      }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('accounts'), 400);
    };
  };

  window._saDeleteAccount = async function(uid, email) {
    if (!confirm(`Delete account for ${email}?\n\nThis removes their login but NOT their business data.`)) return;
    showLoading('Deleting account…');
    try {
      const res = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API.auth.getToken()
        },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${email} deleted`);
      } else {
        showToast(data.error || 'Delete failed');
      }
    } catch(e) {
      showToast(e.message || 'Failed');
    }
    renderSuperAdminDashboard();
    setTimeout(() => window._saT('accounts'), 400);
  };

  // FIX 4: Better error handling and auth readiness check for reset password
  window._saResetPassword = async function(email) {
    if (!email) { showToast('No email for this account'); return; }
    const auth = window._fbAuth || fbAuth;
    if (!auth || typeof auth.sendPasswordResetEmail !== 'function') {
      showToast('Firebase not ready — please refresh and try again');
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      showToast(`Reset email sent to ${email}`, 3500);
    } catch(e) {
      console.error('Reset pw error:', e.code, e.message);
      const msgs = {
        'auth/user-not-found':    'No account found with that email',
        'auth/invalid-email':     'Invalid email address',
        'auth/too-many-requests': 'Too many attempts — wait a few minutes',
      };
      showToast(msgs[e.code] || e.message || 'Failed to send reset email');
    }
  };

  draw();
}

async function saBiz() {
  var body = $('sa-body');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:40px"><div class="ripple-loader"><div class="rl rl1"></div><div class="rl rl2"></div><div class="rl rl3"></div><div class="rl rl4"></div><div class="rldot">+</div></div></div>';

  var EMOJIS = ['🔍','⭐','🦉','🍽️','👍','📘','🔗','📍','🏆','💬','📱','🌐','🎯','✨','🏅'];
  var allBiz = [];
  var openBizId = null;
  var bizLinks  = {};

  try {
    var saR = await fetch('/api/business?listAll=1', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } });
    var saD = await saR.json();
    if (saD.businesses) {
      allBiz = saD.businesses;
    } else if (saD.error) {
      if (body) body.innerHTML = `<div style="background:rgba(255,77,106,.1);border-radius:var(--r-lg);padding:20px;color:var(--ios-red);font-size:14px;line-height:1.6">
        <div style="font-weight:700;margin-bottom:6px">Failed to load businesses</div>
        <div style="font-family:monospace;font-size:12px;color:var(--lbl3)">${esc(saD.error)} (${saR.status})</div>
        <div style="margin-top:12px;font-size:13px;color:var(--lbl3)">
          ${saR.status === 401 || saR.status === 403 ? 'Your SA session may have expired. Sign out and back in.' : 'Check Vercel function logs for details.'}
        </div>
        <button onclick="API.auth.logout();renderHome()" style="margin-top:16px;background:var(--fill);border:none;border-radius:var(--r-sm);padding:10px 20px;color:var(--lbl2);font-size:13px;cursor:pointer;font-family:inherit;width:100%">Sign Out & Re-authenticate</button>
      </div>`;
      return;
    }
  } catch(e) {
    if (body) body.innerHTML = `<div style="background:rgba(255,77,106,.1);border-radius:var(--r-lg);padding:20px;color:var(--ios-red);font-size:14px">
      <div style="font-weight:700;margin-bottom:6px">Network error</div>
      <div style="font-size:12px;color:var(--lbl3)">${esc(e.message)}</div>
    </div>`;
    return;
  }

  function draw(businesses) {
    body.innerHTML = `
      <button class="btn btn-primary btn-full" style="margin-bottom:16px" onclick="window._saCreateBiz()">+ Create New Business</button>
      <input class="inp" id="sa-biz-search" placeholder="Search by slug…" style="margin-bottom:16px" oninput="window._saSearch(this.value)"/>
      <div id="sa-biz-list"></div>`;
    renderList(businesses);
  }

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
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="window._saTogLinks('${b.id}')"
              id="btn-links-${b.id}"
              style="padding:7px 12px;border-radius:var(--r-sm);border:none;
                background:var(--fill);color:var(--lbl2);font-size:12px;
                font-weight:500;cursor:pointer;font-family:inherit">
              Links
            </button>
            <button onclick="window._saBizSettings('${b.id}','${esc(b.name)}','${esc(b.ownerId||'')}')"
              style="padding:7px 12px;border-radius:var(--r-sm);border:none;
                background:var(--fill);color:var(--lbl2);font-size:15px;
                cursor:pointer" title="Settings">⚙️</button>
            <button onclick="window._saViewBiz('${b.id}')"
              style="padding:7px 12px;border-radius:var(--r-sm);border:none;
                background:var(--brand);color:#000;font-size:12px;font-weight:700;
                cursor:pointer;font-family:inherit">View</button>
            <button onclick="window._saDeleteBiz('${b.id}','${esc(b.name)}','${esc(b.ownerId||'')}')"
              style="padding:7px 10px;border-radius:var(--r-sm);border:none;
                background:rgba(255,77,106,.12);color:var(--ios-red);font-size:12px;font-weight:700;
                cursor:pointer;font-family:inherit">Del</button>
          </div>
        </div>
        <div id="accordion-${b.id}" style="display:none;border-top:1px solid rgba(255,255,255,.06);padding:14px">
          <div id="links-body-${b.id}">
            <div style="text-align:center;padding:20px"><div class="ripple-loader"><div class="rl rl1"></div><div class="rl rl2"></div><div class="rl rl3"></div><div class="rl rl4"></div><div class="rldot">+</div></div></div>
          </div>
        </div>
      </div>`).join('');
  }

  window._saTogLinks = async function(bizId) {
    var acc = document.getElementById('accordion-'+bizId);
    var btn = document.getElementById('btn-links-'+bizId);
    if (!acc) return;

    if (openBizId === bizId) {
      acc.style.display = 'none';
      btn.style.background = 'rgba(255,255,255,.04)';
      btn.style.color = 'rgba(238,240,248,.6)';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      openBizId = null;
      return;
    }

    if (openBizId) {
      var prev = document.getElementById('accordion-'+openBizId);
      var prevBtn = document.getElementById('btn-links-'+openBizId);
      if (prev) prev.style.display = 'none';
      if (prevBtn) {
        prevBtn.style.background = 'rgba(255,255,255,.04)';
        prevBtn.style.color = 'rgba(238,240,248,.6)';
        prevBtn.style.borderColor = 'rgba(255,255,255,.1)';
      }
    }

    openBizId = bizId;
    acc.style.display = 'block';
    btn.style.background = 'rgba(0,229,160,.12)';
    btn.style.color = 'var(--brand)';
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
          ${EMOJIS.map(em => `
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

  window._saBizSettings = async function(bizId, bizName, ownerId) {
    showModal(`<div class="modal-head"><div class="modal-title">Business Settings</div><button class="modal-close" onclick="closeModal()">×</button></div><div style="padding:0 20px 8px"><div class="spinner" style="margin:20px auto"></div></div>`);

    let ownerEmail = '';
    let resolvedOwnerId = ownerId;
    try {
      const r = await fetch('/api/accounts', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } });
      const d = await r.json();
      if (d.users && resolvedOwnerId) {
        const owner = d.users.find(u => u.uid === resolvedOwnerId);
        if (owner) ownerEmail = owner.email || '';
      }
    } catch(e) { console.warn('Accounts lookup failed:', e.message); }

    showModal(`
      <div class="modal-head">
        <div class="modal-title">⚙️ ${esc(bizName)}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 16px;display:flex;flex-direction:column;gap:20px">

        <div>
          <div class="sec-lbl">Owner Account</div>
          <div style="background:var(--bg3);border-radius:var(--r-md);padding:14px 16px">
            ${ownerEmail
              ? `<div style="font-size:15px;font-weight:500;margin-bottom:12px">${esc(ownerEmail)}</div>
                 <div style="display:flex;gap:8px">
                   <button onclick="window._saChangeEmail('${esc(resolvedOwnerId)}','${esc(ownerEmail)}')"
                     style="flex:1;background:var(--fill);border:none;border-radius:var(--r-sm);
                            padding:9px;color:var(--lbl2);font-size:13px;font-weight:500;
                            cursor:pointer;font-family:inherit">Change Email</button>
                   <button onclick="window._saResetPw('${esc(ownerEmail)}')"
                     style="flex:1;background:var(--fill);border:none;border-radius:var(--r-sm);
                            padding:9px;color:var(--lbl2);font-size:13px;font-weight:500;
                            cursor:pointer;font-family:inherit">Reset Password</button>
                 </div>`
              : `<div style="font-size:13px;color:var(--lbl3);margin-bottom:12px;line-height:1.5">
                   No owner account linked.
                 </div>
                 <button onclick="window._saLinkAccount('${bizId}')"
                   style="width:100%;background:var(--fill);border:none;border-radius:var(--r-sm);
                          padding:10px;color:var(--lbl2);font-size:13px;font-weight:500;
                          cursor:pointer;font-family:inherit">
                   Link an Existing Account
                 </button>`}
          </div>
        </div>

        <div>
          <div class="sec-lbl">PINs</div>
          <div style="background:var(--bg3);border-radius:var(--r-md);padding:14px 16px;display:flex;flex-direction:column;gap:12px">
            <div>
              <div class="field-lbl">New Admin PIN</div>
              <input class="inp" id="bs-admin" type="number" inputmode="numeric"
                placeholder="4-6 digits · blank to keep" style="background:var(--bg4)"/>
            </div>
            <div>
              <div class="field-lbl">New Manager PIN</div>
              <input class="inp" id="bs-mgr" type="number" inputmode="numeric"
                placeholder="4-6 digits · blank to keep" style="background:var(--bg4)"/>
            </div>
            <button class="btn btn-primary btn-full" onclick="window._bsSavePins('${bizId}')">
              Save PINs
            </button>
          </div>
        </div>

        <div>
          <div class="sec-lbl" style="color:var(--ios-red)">Danger Zone</div>
          <div style="background:rgba(255,77,106,.06);border:.5px solid rgba(255,77,106,.2);border-radius:var(--r-md);padding:14px 16px">
            <div style="font-size:13px;color:var(--lbl3);margin-bottom:12px;line-height:1.5">
              Deleting this business also deletes the owner's login account permanently.
            </div>
            <button onclick="closeModal();window._saDeleteBiz('${bizId}','${esc(bizName)}','${esc(ownerId)}')"
              style="width:100%;background:rgba(255,77,106,.15);border:none;border-radius:var(--r-sm);
                     padding:11px;color:var(--ios-red);font-size:14px;font-weight:700;
                     cursor:pointer;font-family:inherit">
              Delete Business + Account
            </button>
          </div>
        </div>
      </div>`);

    window._bsSavePins = async function(bId) {
      var adminPin = $('bs-admin')?.value?.trim();
      var mgrPin   = $('bs-mgr')?.value?.trim();
      if (!adminPin && !mgrPin) { showToast('Enter at least one PIN'); return; }
      if (adminPin && adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (mgrPin && mgrPin.length < 4)     { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin && mgrPin && adminPin === mgrPin) { showToast('PINs must be different'); return; }
      const updates = {};
      if (adminPin) updates.adminPin   = adminPin;
      if (mgrPin)   updates.managerPin = mgrPin;
      closeModal();
      showLoading('Saving PINs…');
      try {
        await API.business.update(bId, updates);
        showToast('PINs updated ✓');
      } catch(e) { showToast(e.message || 'Failed'); }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };

    window._saChangeEmail = function(uid, currentEmail) {
      const newEmail = prompt('Enter new email address:', currentEmail);
      if (!newEmail || newEmail === currentEmail) return;
      if (!newEmail.includes('@')) { showToast('Invalid email'); return; }
      fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API.auth.getToken() },
        body: JSON.stringify({ uid, email: newEmail })
      }).then(r => r.json()).then(d => {
        if (d.success) showToast('Email updated to ' + newEmail);
        else showToast(d.error || 'Failed');
        closeModal();
        renderSuperAdminDashboard();
        setTimeout(() => window._saT('biz'), 400);
      }).catch(() => showToast('Failed'));
    };

    // FIX 4 (also in settings modal): same improved reset password
    window._saResetPw = async function(email) {
      const auth = window._fbAuth || fbAuth;
      if (!auth || typeof auth.sendPasswordResetEmail !== 'function') {
        showToast('Firebase not ready — please refresh and try again');
        return;
      }
      if (!email) { showToast('No email address found'); return; }
      try {
        await auth.sendPasswordResetEmail(email);
        showToast('Reset email sent to ' + email, 3500);
      } catch(e) {
        console.error('Reset pw error:', e.code, e.message);
        const msgs = {
          'auth/user-not-found':    'No account found with that email',
          'auth/invalid-email':     'Invalid email address',
          'auth/too-many-requests': 'Too many attempts — wait a few minutes',
        };
        showToast(msgs[e.code] || e.message || 'Failed to send reset email');
      }
    };

    window._saLinkAccount = async function(bId) {
      let users = [];
      try {
        const r = await fetch('/api/accounts', { headers: { 'Authorization': 'Bearer ' + API.auth.getToken() } });
        const d = await r.json();
        users = d.users || [];
      } catch(e) { showToast('Failed to load accounts'); return; }

      if (users.length === 0) {
        showToast('No accounts found — create one first');
        return;
      }

      const listHtml = users.map(u => `
        <div class="ios-row" onclick="window._saDoLink('${bId}','${esc(u.uid)}','${esc(u.email||'')}')">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--fill);
            display:flex;align-items:center;justify-content:center;font-size:13px;
            font-weight:600;color:var(--brand);flex-shrink:0">
            ${(u.email||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${esc(u.email||'No email')}
            </div>
            <div style="font-size:12px;color:var(--lbl3);margin-top:1px">
              Joined ${new Date(u.createdAt||Date.now()).toLocaleDateString()}
            </div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`).join('');

      showModal(`
        <div class="modal-head">
          <div class="modal-title">Link Account</div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div style="padding:0 20px 8px">
          <div style="font-size:13px;color:var(--lbl3);margin-bottom:16px">
            Select the account to link as owner of this business.
          </div>
          <div class="ios-group">${listHtml}</div>
        </div>`);

      window._saDoLink = async function(bId, uid, email) {
        closeModal();
        showLoading('Linking…');
        try {
          await fetch('/api/business?id=' + bId, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + API.auth.getToken()
            },
            body: JSON.stringify({ ownerId: uid })
          });
          showToast('Linked to ' + email);
        } catch(e) { showToast('Failed to link'); }
        renderSuperAdminDashboard();
        setTimeout(() => window._saT('biz'), 400);
      };
    };
  };

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

  window._saDeleteBiz = async function(id, name, ownerId) {
    if (!confirm('Delete ' + name + ' AND the owner account? This cannot be undone.')) return;
    showLoading('Deleting…');
    try {
      await API.business.delete(id);
      if (ownerId) {
        try {
          await fetch('/api/accounts', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + API.auth.getToken()
            },
            body: JSON.stringify({ uid: ownerId })
          });
        } catch(e) {
          console.warn('Auth account deletion failed:', e.message);
        }
      }
      showToast(name + ' deleted');
      renderSuperAdminDashboard();
    } catch(e) { showToast(e.message || 'Delete failed'); renderSuperAdminDashboard(); }
  };

  window._saSearch = async function(q) {
    if (!q || q.length < 2) { renderList(allBiz); return; }
    try {
      var d = await API.business.getBySlug(q.trim().toLowerCase());
      if (d.business) renderList([d.business]);
    } catch(e2) { renderList([]); }
  };

  window._saCreateBiz = function() {
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Create Business</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><div class="field-lbl">Owner Email</div><input class="inp" id="sa-cb-email" type="email" placeholder="owner@business.com"/></div>
        <div><div class="field-lbl">Owner Password</div><input class="inp" id="sa-cb-pass" type="password" placeholder="Min 6 characters"/></div>
        <div><div class="field-lbl">Business Name</div><input class="inp" id="sa-cb-name" placeholder="The James Room"/></div>
        <div><div class="field-lbl">Admin PIN (4-6 digits)</div><input class="inp" id="sa-cb-admin" type="number" inputmode="numeric" placeholder="e.g. 1234"/></div>
        <div><div class="field-lbl">Manager PIN (4-6 digits)</div><input class="inp" id="sa-cb-mgr" type="number" inputmode="numeric" placeholder="e.g. 5678"/></div>
        <button class="btn btn-primary btn-full" onclick="window._saDoCreate()">Create Business</button>
      </div>`);
    window._saDoCreate = async function() {
      var email = $('sa-cb-email')?.value?.trim(), pass = $('sa-cb-pass')?.value;
      var name  = $('sa-cb-name')?.value?.trim();
      var adminPin = $('sa-cb-admin')?.value?.trim(), mgrPin = $('sa-cb-mgr')?.value?.trim();
      if (!email)   { showToast('Enter owner email'); return; }
      if (!pass || pass.length < 6) { showToast('Password must be 6+ characters'); return; }
      if (!name)    { showToast('Enter business name'); return; }
      if (!adminPin || adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (!mgrPin   || mgrPin.length < 4)   { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin === mgrPin) { showToast('PINs must be different'); return; }
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