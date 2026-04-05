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
function showLoading(msg=''){app().innerHTML=`<div class="page-center"><div class="ripple-loader"><div class="rl rl1"></div><div class="rl rl2"></div><div class="rl rl3"></div><div class="rl rl4"></div><div class="rldot">+</div></div></div>`;}
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
        <img src="data:image/png;base64,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" width="160" height="83" style="display:block;margin:0 auto"/>
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
          : `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:8px"><img src="data:image/png;base64,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" height="36" style="display:block;margin:0 auto"/><div style="font-size:18px;font-weight:500;letter-spacing:-.02em;color:var(--lbl2)">${esc(biz.name)}</div></div>`}
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