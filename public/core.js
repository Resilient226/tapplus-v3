'use strict';

var fbAuth = window._fbAuth || null;

const State = { session:null, biz:null, staff:[], taps:[], layout:null };

const app  = () => document.getElementById('app');
const $    = (id) => document.getElementById(id);
const esc  = (s) => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let _tt;

// ── Saved location (persists across sessions) ─────────────────────────────────
const SAVED_BIZ_KEY = 'tp_saved_biz';
function getSavedBiz() { try { const r=localStorage.getItem(SAVED_BIZ_KEY); return r?JSON.parse(r):null; } catch { return null; } }
function saveLocation(biz) { try { localStorage.setItem(SAVED_BIZ_KEY, JSON.stringify({id:biz.id,name:biz.name,slug:biz.slug,storeCode:biz.storeCode,branding:biz.branding||{}})); } catch {} }
function clearSavedBiz() { try { localStorage.removeItem(SAVED_BIZ_KEY); } catch {} }

function showToast(msg,d=2500){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),d);}
function showModal(html){const b=$('modal-box'),o=$('modal-overlay');if(!b||!o)return;b.innerHTML=html;o.classList.add('open');}
function closeModal(){const o=$('modal-overlay');if(o)o.classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.id==='modal-overlay')closeModal();});
function showLoading(msg=''){app().innerHTML=`<div class="page-center"><div class="spinner"></div>${msg?`<div style="margin-top:14px;color:var(--lbl3);font-size:14px;font-weight:400">${esc(msg)}</div>`:''}</div>`;}
function showError(msg){app().innerHTML=`<div class="page-center"><div style="font-size:40px;margin-bottom:16px">⚠️</div><div style="font-weight:700;margin-bottom:8px">Something went wrong</div><div style="font-size:14px;color:var(--gray);margin-bottom:24px">${esc(msg)}</div><button class="btn btn-ghost" onclick="route()">Go Home</button></div>`;}

function monogram(name, size=48, bg='var(--fill-thin)', color='var(--lbl)') {
  const letter = (name||'?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(size*.22)}px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.42)}px;font-weight:600;color:${color};letter-spacing:-.02em;flex-shrink:0">${letter}</div>`;
}

function staffDisplay(s){return`${s.firstName} ${s.lastInitial}.`;}
function staffIni(s){return(s.firstName[0]+(s.lastInitial||'')[0]||'').toUpperCase();}
function staffAvatar(s,size=40){
  if(s.photo)return`<img src="${esc(s.photo)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0"/>`;
  return`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${esc(s.color||'#00e5a0')}22;border:2px solid ${esc(s.color||'#00e5a0')};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size*.35)}px;color:${esc(s.color||'#00e5a0')};flex-shrink:0">${staffIni(s)}</div>`;
}
function timeAgo(ts){const d=Date.now()-ts;if(d<60000)return'just now';if(d<3600000)return Math.floor(d/60000)+'m ago';if(d<86400000)return Math.floor(d/3600000)+'h ago';return Math.floor(d/86400000)+'d ago';}

// ── AI ────────────────────────────────────────────────────────────────────────
const _aiCache={};
async function askAI(prompt,key=''){
  if(key&&_aiCache[key])return _aiCache[key];
  try{const d=await API.ai.ask(prompt);if(key)_aiCache[key]=d.text;return d.text||'';}
  catch(e){console.error('AI:',e);return null;}
}
function renderAIBlock(id,prompt,key){
  const el=$(id);if(!el)return;
  if(_aiCache[key]){el.innerHTML=`<div class="ai-card"><div class="ai-text">${esc(_aiCache[key])}</div></div>`;return;}
  el.innerHTML=`<div class="ai-card" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto 10px"></div><div style="font-size:13px;color:var(--gray)">Analyzing…</div></div>`;
  askAI(prompt,key).then(text=>{
    if(!text){el.innerHTML=`<div class="ai-card"><div class="ai-text" style="color:var(--gray)">AI unavailable.</div></div>`;return;}
    el.innerHTML=`<div class="ai-card"><div class="ai-text">${esc(text)}</div></div>`;
  });
}

// ── Router ────────────────────────────────────────────────────────────────────
async function route(){
  var ld=document.getElementById('loading');
  // Minimum display time — let the ripple play for at least 3 seconds
  const _loadStart = window._appLoadStart || Date.now();
  const _elapsed = Date.now() - _loadStart;
  const _minDisplay = 2500; // ms
  const _remaining = Math.max(0, _minDisplay - _elapsed);
  // Return a promise that resolves after loading screen hides
  window._afterLoad = new Promise(function(resolve){
    if(ld){
      setTimeout(function(){
        ld.classList.add('hidden');
        setTimeout(function(){
          ld.style.display='none';
          resolve();
        }, 600);
      }, _remaining);
    } else { resolve(); }
  });
  const parts=location.pathname.split('/').filter(Boolean);
  if(parts.length>=3&&parts[1]==='tap')return renderTapPage(parts[0],parts[2]);
  if(parts.length>=2&&parts[1]==='dashboard')return renderDashboardEntry(parts[0]);
  // Check for saved location — skip code entry
  const saved = getSavedBiz();
  if(saved){
    try {
      const d = await API.business.getByCode(saved.storeCode);
      State.biz = d.business;
      return renderRoleSelect();
    } catch { clearSavedBiz(); }
  }
  return renderHome();
}
function navigate(path){history.pushState({},''  ,path);route();}
window.addEventListener('popstate',route);
window.addEventListener('DOMContentLoaded',route);

// ── Home ──────────────────────────────────────────────────────────────────────
function renderHome(){
  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:36px">
        <img src="data:image/png;base64,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" width="200" height="100" style="display:block;margin:0 auto"/>
      </div>
      <div style="font-size:15px;color:var(--lbl3);margin-bottom:28px;font-weight:400">Enter your store code</div>
      <div style="width:100%;max-width:280px;display:flex;flex-direction:column;gap:12px">
        <input class="inp" id="code-inp" placeholder="" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]*"
          style="text-align:center;font-size:34px;font-weight:600;letter-spacing:.25em;padding:18px;border-radius:var(--r-lg);background:var(--sys-bg2)"
          onkeydown="if(event.key==='Enter')window._go()"/>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-primary" onclick="window._go()" style="flex:1;font-size:17px;padding:16px;border-radius:var(--r-lg)">Continue</button>
          <button onclick="window._saveLocationHome()" style="background:var(--fill-thin);border:none;border-radius:var(--r-lg);padding:16px 14px;font-size:18px;cursor:pointer;flex-shrink:0" title="Save this location">📍</button>
        </div>
        <button class="btn btn-ghost btn-full" onclick="window._ownerEntry()" style="font-size:16px;border-radius:var(--r-lg)">Business Login</button>
        <div style="text-align:center;margin-top:8px">
          <button onclick="window._sa()" style="background:none;border:none;color:rgba(255,255,255,.04);font-size:10px;cursor:pointer">●</button>
        </div>
      </div>
    </div>`;
  window._saveLocationHome=function(){
    const code=($('code-inp')?.value||'').trim();
    if(!code){showToast('Enter your store code first');return;}
    // Fetch biz then save
    API.business.getByCode(code).then(d=>{
      saveLocation(d.business);
      showToast('📍 Location saved');
    }).catch(()=>showToast('Invalid code'));
  };
  window._go=async function(){
    const code=($('code-inp')?.value||'').trim();
    if(code.length!==4){showToast('Enter a 4-digit code');return;}
    showLoading('Looking up…');
    try{const d=await API.business.getByCode(code);State.biz=d.business;renderRoleSelect();}
    catch{showToast('Invalid store code');renderHome();}
  };
  window._ownerEntry=function(){State.biz=null;renderOwnerLogin();};
  window._sa=function(){
    let saPin='';
    showModal(`<div class="modal-head"><div class="modal-title">Super Admin</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div style="text-align:center;padding:12px 0 8px">
        <div class="pin-display" id="sa-dots" style="justify-content:center;margin-bottom:20px">
          ${[0,1,2,3,4,5].map(i=>`<div class="pin-dot" id="sapd${i}"></div>`).join('')}
        </div>
        <div class="pin-grid">${['1','2','3','4','5','6','7','8','9','del','0','go'].map(k=>`<button class="pin-key${k==='del'||k==='go'?' del':''}" onclick="window._saPin('${k}')" style="${k==='go'?'background:var(--brand);color:#000;font-weight:700':''}">
          ${k==='del'?'⌫':k==='go'?'↵':k}</button>`).join('')}</div>
      </div>`);

    function updateSaDots(){
      for(let i=0;i<6;i++){
        const d=document.getElementById('sapd'+i);
        if(d)d.classList.toggle('filled',i<saPin.length);
      }
    }

    window._saPin=function(v){
      if(v==='del'){ saPin=saPin.slice(0,-1); updateSaDots(); return; }
      if(v==='go'){
        if(saPin.length<4){showToast('Enter at least 4 digits');return;}
        closeModal();showLoading('Authenticating…');
        API.auth.loginSuperAdmin(saPin)
          .then(d=>{State.session=d;renderSuperAdminDashboard();})
          .catch(e=>{showToast(e.message||'Invalid PIN');renderHome();});
        return;
      }
      if(saPin.length<6){saPin+=v;}
      updateSaDots();
    };
  };
}

// ── Role Select ───────────────────────────────────────────────────────────────
function renderRoleSelect(){
  const biz=State.biz;
  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:36px;text-align:center">
        ${biz.branding?.logoUrl
          ? `<img src="${esc(biz.branding.logoUrl)}" style="height:64px;max-width:160px;object-fit:contain;border-radius:14px;margin-bottom:14px;display:block;margin-left:auto;margin-right:auto"/>`
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:8px"><img src="${window._tapPlusLogo||''}" style="height:36px;display:block"/><div style="font-size:18px;font-weight:500;letter-spacing:-.02em;color:var(--lbl2)">${esc(biz.name)}</div></div>`}
        <div style="font-size:15px;color:var(--lbl3);margin-bottom:6px">Choose your role</div>
        <button onclick="window._changeLocation()" style="background:none;border:none;color:var(--lbl3);font-size:13px;cursor:pointer;font-family:inherit;text-decoration:underline;padding:2px">Change location</button>
      </div>
      <div style="width:100%;max-width:340px">
        <div class="ios-group">
          ${[['staff','👤','Staff Member','My performance & coaching'],['manager','📊','Manager','Team dashboard'],['bizAdmin','⚙️','Business Admin','Full access'],['owner','🔑','Owner','Owner access']].map(([r,ic,lbl,sub])=>`
            <div class="ios-row" onclick="window._role('${r}')">
              <div style="width:30px;height:30px;border-radius:8px;background:var(--fill-ultra);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${ic}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:16px;font-weight:400;letter-spacing:-.01em">${lbl}</div>
                <div style="font-size:13px;color:var(--lbl3);margin-top:1px">${sub}</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(235,235,245,.28)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>`).join('')}
        </div>
        <button onclick="renderHome()" style="background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;font-family:inherit;display:block;width:100%;text-align:center;padding:8px">Cancel</button>
      </div>
    </div>`;
  window._role=function(r){r==='owner'?renderOwnerLogin():renderPinLogin(r);};
  window._changeLocation=function(){clearSavedBiz();State.biz=null;renderHome();};
}

// ── PIN Login ─────────────────────────────────────────────────────────────────
function renderPinLogin(role){
  const titles={staff:'Staff Passcode',manager:'Manager PIN',bizAdmin:'Admin PIN'};
  const subs={staff:'Enter your personal passcode',manager:'Enter the manager PIN',bizAdmin:'Enter the admin PIN'};
  let pin='';
  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:32px;text-align:center">
        <div style="font-size:13px;color:var(--lbl3);margin-bottom:6px">${esc(State.biz?.name||'')}</div>
        <div style="font-size:22px;font-weight:600;letter-spacing:-.02em">${titles[role]}</div>
      </div>
      <div class="pin-display">
        <div class="pin-dot" id="pd0"></div><div class="pin-dot" id="pd1"></div>
        <div class="pin-dot" id="pd2"></div><div class="pin-dot" id="pd3"></div>
        <div class="pin-dot" id="pd4"></div><div class="pin-dot" id="pd5"></div>
      </div>
      <div style="height:20px"></div>
      <div class="pin-grid">${['1','2','3','4','5','6','7','8','9','del','0','go'].map(k=>`<button class="pin-key${k==='del'||k==='go'?' del':''}" onclick="window._pin('${k}')" style="${k==='go'?'background:var(--brand);color:#000;font-weight:700':''}">${k==='del'?'⌫':k==='go'?'↵':k}</button>`).join('')}</div>
      <button onclick="renderRoleSelect()" style="margin-top:28px;background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;font-family:inherit">Cancel</button>
    </div>`;
  window._pin=async function(v){
    if(v==='del'){pin=pin.slice(0,-1);}
    else if(v==='go'){
      if(pin.length<4){showToast('Enter at least 4 digits');return;}
      showLoading('Verifying…');
      try{
        let d;
        if(role==='staff')d=await API.auth.loginStaff(State.biz.id,pin);
        else if(role==='manager')d=await API.auth.loginManager(State.biz.id,pin);
        else d=await API.auth.loginBizAdmin(State.biz.id,pin);
        State.session=d;
        await loadDashboardData();
        renderDashboard();
      }catch{showToast('Invalid PIN — try again');renderPinLogin(role);}
      return;
    }
    else if(pin.length<6){pin+=v;}
    document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('filled',i<pin.length));
  };
}

// ── Owner Login ───────────────────────────────────────────────────────────────
function renderOwnerLogin(){
  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:36px;text-align:center">
        <div style="font-size:26px;font-weight:600;letter-spacing:-.03em;margin-bottom:6px">Business Login</div>
        <div style="font-size:15px;color:var(--lbl3)">Sign in with your email</div>
      </div>
      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:10px">
        <div class="ios-group" style="margin-bottom:0">
          <div class="ios-row" style="flex-direction:column;align-items:stretch;gap:0;padding:0;cursor:default">
            <div style="padding:12px 16px 0">
              <div class="field-lbl">Email</div>
              <input class="inp" id="oe" type="email" placeholder="you@business.com" style="background:transparent;padding:6px 0;font-size:16px"/>
            </div>
          </div>
          <div class="ios-row" style="flex-direction:column;align-items:stretch;gap:0;padding:0;cursor:default">
            <div style="padding:12px 16px">
              <div class="field-lbl">Password</div>
              <input class="inp" id="op" type="password" placeholder="••••••••" style="background:transparent;padding:6px 0;font-size:16px" onkeydown="if(event.key==='Enter')window._signin()"/>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="window._signin()" style="border-radius:var(--r-lg);font-size:17px;padding:16px">Sign In</button>
        <button class="btn btn-ghost btn-full" onclick="window._register()" style="border-radius:var(--r-lg);font-size:16px">Get Started</button>
        <button onclick="renderHome()" style="background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;font-family:inherit;text-align:center;padding:8px">Cancel</button>
      </div>
    </div>`;
  window._signin=async function(){
    if(!fbAuth){fbAuth=window._fbAuth||null;}
    const email=$('oe')?.value?.trim(),pass=$('op')?.value;
    if(!email||!pass){showToast('Enter email and password');return;}
    if(!fbAuth){showToast('Firebase not configured');return;}
    showLoading('Signing in…');
    try{const c=await fbAuth.signInWithEmailAndPassword(email,pass);const t=await c.user.getIdToken();const d=await API.auth.loginOwner(t);State.session=d;renderOwnerDashboard();}
    catch(e){app().innerHTML='';renderOwnerLogin();showToast(e.message||'Sign in failed');}
  };
  window._register=async function(){
    if(!fbAuth){fbAuth=window._fbAuth||null;}
    const email=$('oe')?.value?.trim(),pass=$('op')?.value;
    if(!email||!pass){showToast('Enter email and password');return;}
    if(pass.length<6){showToast('Password must be 6+ characters');return;}
    if(!fbAuth){showToast('Firebase not configured');return;}
    showLoading('Creating account…');
    try{const c=await fbAuth.createUserWithEmailAndPassword(email,pass);const t=await c.user.getIdToken();State._ownerToken=t;renderCreateBusiness(t);}
    catch(e){
      app().innerHTML='';renderOwnerLogin();
      if(e.code==='auth/email-already-in-use'){showToast('Email already registered — try Sign In',4000);}
      else{showToast(e.message||'Registration failed');}
    }
  };
}

// ── Create Business ───────────────────────────────────────────────────────────
function renderCreateBusiness(idToken){
  app().innerHTML=`
    <div class="page" style="padding-top:60px">
      <button onclick="renderOwnerLogin()" style="background:none;border:none;color:var(--gray);font-size:13px;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:20px;padding:0">← Back</button>
      <h1 style="margin-bottom:6px">Create Business</h1>
      <div style="color:var(--gray);font-size:14px;margin-bottom:24px">Set up your Tap+ location</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><div class="field-lbl">Business Name</div><input class="inp" id="cb-n" placeholder="The James Room"/></div>
        <div><div class="field-lbl">Admin PIN (4-6 digits)</div><input class="inp" id="cb-a" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 1234"/></div>
        <div><div class="field-lbl">Manager PIN (4-6 digits)</div><input class="inp" id="cb-m" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 5678"/></div>
        <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="window._create()">Create →</button>
      </div>
    </div>`;
  window._create=async function(){
    const name=$('cb-n')?.value?.trim(),adminPin=$('cb-a')?.value?.trim(),mgrPin=$('cb-m')?.value?.trim();
    if(!name){showToast('Enter business name');return;}
    if(!adminPin||adminPin.length<4){showToast('Admin PIN must be at least 4 digits');return;}
    if(!mgrPin||mgrPin.length<4){showToast('Manager PIN must be at least 4 digits');return;}
    if(adminPin===mgrPin){showToast('PINs must be different');return;}
    showLoading('Creating…');
    try{
      sessionStorage.setItem('tp_session',JSON.stringify({token:idToken}));
      const d=await API.business.create({name,adminPin,managerPin:mgrPin});
      State.biz=d.business;
      const ld=await API.auth.loginBizAdmin(d.business.id,adminPin);
      State.session=ld;
      showToast('Business created! Code: '+d.business.storeCode);
      await loadDashboardData();
      renderDashboard();
    }catch(e){showToast(e.message||'Failed');renderCreateBusiness(idToken);}
  };
}

// ── Dashboard Entry ───────────────────────────────────────────────────────────
async function renderDashboardEntry(slug){
  const sess=API.auth.getSession();
  if(sess?.token&&sess?.bizId){
    State.session=sess;showLoading();
    try{const d=await API.business.getById(sess.bizId);State.biz=d.business;await loadDashboardData();renderDashboard();return;}
    catch{API.auth.logout();}
  }
  showLoading();
  try{const d=await API.business.getBySlug(slug);State.biz=d.business;renderRoleSelect();}
  catch{showError('Business not found');}
}

// ── Load Data ─────────────────────────────────────────────────────────────────
async function loadDashboardData(){
  const bizId=State.session?.bizId;if(!bizId)return;
  const [s,t,l]=await Promise.allSettled([API.staff.list(bizId),API.taps.list({bizId}),API.layout.get()]);
  if(s.status==='fulfilled')State.staff=s.value.staff||[];
  if(t.status==='fulfilled')State.taps=t.value.taps||[];
  if(l.status==='fulfilled')State.layout=l.value.layouts;
}

// ── Dashboard Shell ───────────────────────────────────────────────────────────
