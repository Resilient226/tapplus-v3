'use strict';

var fbAuth = window._fbAuth || null;

const State = { session:null, biz:null, staff:[], taps:[], layout:null };
const app = () => document.getElementById('app');
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let _tt;

// ── Saved location ────────────────────────────────────────────────────────────
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
  const _loadStart = window._appLoadStart || Date.now();
  const _elapsed = Date.now() - _loadStart;
  const _minDisplay = 2500;
  const _remaining = Math.max(0, _minDisplay - _elapsed);

  window._afterLoad = new Promise(function(resolve){
    if(ld){
      setTimeout(function(){
        ld.classList.add('hidden');
        setTimeout(function(){ ld.style.display='none'; resolve(); }, 600);
      }, _remaining);
    } else { resolve(); }
  });

  const parts=location.pathname.split('/').filter(Boolean);
  if(parts.length>=3&&parts[1]==='tap')return renderTapPage(parts[0],parts[2]);
  if(parts.length>=2&&parts[1]==='dashboard')return renderDashboardEntry(parts[0]);
  if(location.pathname==='/success')return handleSuccessRoute();
  if(location.pathname==='/subscribe')return renderSubscribeFlow();

  // Remembered owner session
  const ownerRem = localStorage.getItem('tp_owner_remember');
  if(ownerRem){
    const ownerSaved = localStorage.getItem('tp_owner_session');
    if(ownerSaved){
      try{
        const parsed = JSON.parse(ownerSaved);
        const age = Date.now() - (parsed.savedAt||0);
        if(age < 30*24*60*60*1000 && parsed.session){
          State.session = parsed.session;
          return renderOwnerDashboard();
        }
      }catch(e){ localStorage.removeItem('tp_owner_session'); }
    }
  }

  // Remembered PIN sessions
  const roles = ['staff','manager','bizAdmin'];
  for(const r of roles){
    const rem = localStorage.getItem('tp_remember_'+r);
    if(rem){
      const saved = localStorage.getItem('tp_session_'+r);
      if(saved){
        try{
          const parsed = JSON.parse(saved);
          const age = Date.now() - (parsed.savedAt||0);
          if(age < 30*24*60*60*1000 && parsed.session && parsed.biz){
            State.session = parsed.session;
            State.biz = parsed.biz;
            await loadDashboardData();
            return renderDashboard();
          }
        }catch(e){ localStorage.removeItem('tp_session_'+r); }
      }
    }
  }

  // Remembered business location
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

function navigate(path){history.pushState({},'' ,path);route();}
window.addEventListener('popstate',route);
window.addEventListener('DOMContentLoaded',route);

// ── Home ──────────────────────────────────────────────────────────────────────
function renderHome(){
  app().innerHTML=`
    <div class="page-center fade-up" style="position:relative;overflow:hidden">
      <div class="login-glow"></div>
      <div style="margin-bottom:12px;position:relative">
        <div style="font-size:64px;font-weight:800;letter-spacing:-.06em;line-height:1">
          Tap<span style="color:var(--brand)">+</span>
        </div>
      </div>
      <div style="font-size:15px;color:var(--lbl3);margin-bottom:52px;font-weight:400">
        Enter your store code
      </div>
      <div style="width:100%;max-width:280px;display:flex;flex-direction:column;gap:10px;position:relative">
        <input class="inp" id="code-inp" placeholder="0000" type="text" inputmode="numeric"
          maxlength="4" pattern="[0-9]*"
          style="text-align:center;font-size:40px;font-weight:700;letter-spacing:.3em;
          padding:20px;border-radius:var(--r-lg);background:var(--bg2);font-variant-numeric:tabular-nums"
          onkeydown="if(event.key==='Enter')window._go()"/>
        <button class="btn btn-primary btn-full" onclick="window._go()"
          style="font-size:17px;padding:17px;border-radius:var(--r-lg)">
          Continue
        </button>
        <button class="btn btn-ghost btn-full" onclick="window._ownerEntry()"
          style="font-size:16px;border-radius:var(--r-lg)">
          Business Login
        </button>
        <div style="text-align:center;margin-top:12px">
          <button onclick="window._sa()"
            style="background:none;border:none;color:rgba(255,255,255,.04);font-size:10px;cursor:pointer">●</button>
        </div>
      </div>
    </div>`;

  window._go=async function(){
    const code=($('code-inp')?.value||'').trim();
    if(code.length!==4){showToast('Enter a 4-digit code');return;}
    showLoading();
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
        <div class="pin-grid">${['1','2','3','4','5','6','7','8','9','del','0','go'].map(k=>`
          <button class="pin-key${k==='del'||k==='go'?' del':''}" onclick="window._saPin('${k}')"
            style="${k==='go'?'background:var(--brand);color:#000;font-weight:700':''}">
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
      <div style="margin-bottom:40px;text-align:center">
        ${biz.branding?.logoUrl
          ? `<img src="${esc(biz.branding.logoUrl)}" style="height:60px;max-width:140px;object-fit:contain;border-radius:12px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto"/>`
          : `<div style="font-size:22px;font-weight:600;letter-spacing:-.03em;margin-bottom:12px">${esc(biz.name)}</div>`}
        <div style="font-size:15px;color:var(--lbl3)">Select your role</div>
      </div>
      <div style="width:100%;max-width:340px">
        <div class="ios-group">
          ${[
            ['staff',    'My Stats', 'Performance & coaching', '#00e5a0'],
            ['manager',  'Team',     'Dashboard & analytics',  '#3b9eff'],
            ['bizAdmin', 'Admin',    'Settings & full control','#9b59ff'],
            ['owner',    'Owner',    'Billing & locations',    '#ff6b35'],
          ].map(([r,lbl,sub,color])=>`
            <div class="ios-row" onclick="window._role('${r}')">
              <div style="width:34px;height:34px;border-radius:10px;background:${color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <div style="width:10px;height:10px;border-radius:50%;background:${color}"></div>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:16px;font-weight:500;letter-spacing:-.01em">${lbl}</div>
                <div style="font-size:13px;color:var(--lbl3);margin-top:1px">${sub}</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>`).join('')}
        </div>
        <button onclick="renderHome()"
          style="background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;
          font-family:inherit;display:block;width:100%;text-align:center;padding:10px">
          Cancel
        </button>
      </div>
    </div>`;

  window._role=function(r){r==='owner'?renderOwnerLogin():renderPinLogin(r);};
  window._changeLocation=function(){clearSavedBiz();State.biz=null;renderHome();};
}

// ── PIN Login ─────────────────────────────────────────────────────────────────
function renderPinLogin(role){
  const titles={staff:'Staff Passcode',manager:'Manager PIN',bizAdmin:'Admin PIN'};
  let pin='';

  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:40px;text-align:center">
        <div style="font-size:13px;color:var(--lbl3);margin-bottom:8px;font-weight:400;letter-spacing:.01em;text-transform:uppercase">
          ${esc(State.biz?.name||'')}
        </div>
        <div style="font-size:26px;font-weight:700;letter-spacing:-.03em">${titles[role]}</div>
      </div>
      <div class="pin-display">
        ${[0,1,2,3,4,5].map(i=>`<div class="pin-dot" id="pd${i}"></div>`).join('')}
      </div>
      <div style="height:24px"></div>
      <div class="pin-grid">
        ${['1','2','3','4','5','6','7','8','9','del','0','go'].map(k=>`
          <button class="pin-key${k==='del'||k==='go'?' del':''}" onclick="window._pin('${k}')"
            style="${k==='go'?'background:var(--brand);color:#000;font-weight:700':''}">
            ${k==='del'?'⌫':k==='go'?'↵':k}
          </button>`).join('')}
      </div>
      <div style="margin-top:24px;display:flex;align-items:center;gap:10px;justify-content:center">
        <div id="rm-toggle" onclick="window._toggleRM()"
          style="width:44px;height:26px;border-radius:13px;
          background:${localStorage.getItem('tp_remember_'+role)?'var(--brand)':'var(--fill-med)'};
          position:relative;cursor:pointer;transition:background .25s;flex-shrink:0">
          <div style="position:absolute;top:3px;
            left:${localStorage.getItem('tp_remember_'+role)?'21px':'3px'};
            width:20px;height:20px;border-radius:50%;background:#fff;
            box-shadow:0 1px 4px rgba(0,0,0,.3);transition:left .25s"></div>
        </div>
        <div style="font-size:15px;color:var(--lbl2);cursor:pointer" onclick="window._toggleRM()">Remember me</div>
      </div>
      <button onclick="renderRoleSelect()"
        style="margin-top:16px;background:none;border:none;color:var(--brand);
        font-size:17px;cursor:pointer;font-family:inherit;font-weight:500">
        Cancel
      </button>
    </div>`;

  let _rememberMe = !!localStorage.getItem('tp_remember_'+role);

  window._toggleRM = function() {
    _rememberMe = !_rememberMe;
    const tog = document.getElementById('rm-toggle');
    if(tog){
      tog.style.background = _rememberMe ? 'var(--brand)' : 'var(--fill-med)';
      tog.children[0].style.left = _rememberMe ? '21px' : '3px';
    }
  };

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
        if(_rememberMe){
          localStorage.setItem('tp_remember_'+role,'1');
          localStorage.setItem('tp_session_'+role,JSON.stringify({session:d,bizId:State.biz?.id,biz:State.biz,savedAt:Date.now()}));
        } else {
          localStorage.removeItem('tp_remember_'+role);
          localStorage.removeItem('tp_session_'+role);
        }
        await loadDashboardData();
        renderDashboard();
      }catch(e){
        const msg = e.message?.includes('500') || e.message?.includes('service') ? 'Server error — try again' : 'Invalid PIN — try again';
        showToast(msg);
        renderPinLogin(role);
      }
      return;
    }
    else if(pin.length<6){pin+=v;}
    document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('filled',i<pin.length));
  };
}

// ── Owner Login ───────────────────────────────────────────────────────────────
function renderOwnerLogin(){
  app().innerHTML=`
    <div class="page-center fade-up" style="position:relative;overflow:hidden">
      <div class="login-glow" style="opacity:.6"></div>
      <div style="margin-bottom:44px;text-align:center;position:relative">
        <div style="font-size:30px;font-weight:700;letter-spacing:-.04em;margin-bottom:8px">Welcome back</div>
        <div style="font-size:15px;color:var(--lbl3)">Sign in to your business account</div>
      </div>
      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:12px;position:relative">
        <div>
          <div class="field-lbl">Email</div>
          <input class="inp" id="oe" type="email" placeholder="you@business.com" style="border-radius:var(--r-md)"/>
        </div>
        <div>
          <div class="field-lbl">Password</div>
          <input class="inp" id="op" type="password" placeholder="••••••••"
            style="border-radius:var(--r-md)"
            onkeydown="if(event.key==='Enter')window._signin()"/>
        </div>
        <div style="height:4px"></div>
        <div style="display:flex;align-items:center;gap:10px;margin:4px 0">
          <div id="owner-rm-tog" onclick="window._ownerTogRM()"
            style="width:44px;height:26px;border-radius:13px;
            background:${localStorage.getItem('tp_owner_remember')?'var(--brand)':'var(--fill-med)'};
            position:relative;cursor:pointer;transition:background .25s;flex-shrink:0">
            <div style="position:absolute;top:3px;
              left:${localStorage.getItem('tp_owner_remember')?'21px':'3px'};
              width:20px;height:20px;border-radius:50%;background:#fff;
              box-shadow:0 1px 4px rgba(0,0,0,.3);transition:left .25s"></div>
          </div>
          <div style="font-size:15px;color:var(--lbl2);cursor:pointer" onclick="window._ownerTogRM()">Remember me</div>
        </div>
        <button class="btn btn-primary btn-full" onclick="window._signin()"
          style="font-size:17px;padding:17px;border-radius:var(--r-lg)">
          Sign In
        </button>
        <button class="btn btn-ghost btn-full" onclick="window._register()"
          style="font-size:16px;border-radius:var(--r-lg)">
          Create Account
        </button>
        <button onclick="renderHome()"
          style="background:none;border:none;color:var(--brand);font-size:17px;
          cursor:pointer;font-family:inherit;text-align:center;padding:10px;font-weight:500">
          Cancel
        </button>
      </div>
    </div>`;

  let _ownerRemember = !!localStorage.getItem('tp_owner_remember');

  window._ownerTogRM = function() {
    _ownerRemember = !_ownerRemember;
    const tog = document.getElementById('owner-rm-tog');
    if(tog){
      tog.style.background = _ownerRemember ? 'var(--brand)' : 'var(--fill-med)';
      tog.children[0].style.left = _ownerRemember ? '21px' : '3px';
    }
  };

  // Helper — save owner session to localStorage
  function saveOwnerSession(session) {
    if(_ownerRemember){
      localStorage.setItem('tp_owner_remember','1');
      localStorage.setItem('tp_owner_session', JSON.stringify({ session, savedAt: Date.now() }));
    } else {
      localStorage.removeItem('tp_owner_remember');
      localStorage.removeItem('tp_owner_session');
    }
  }

  window._signin=async function(){
    if(!fbAuth){fbAuth=window._fbAuth||null;}
    const email=$('oe')?.value?.trim(), pass=$('op')?.value;
    if(!email||!pass){showToast('Enter email and password');return;}
    if(!fbAuth){showToast('Firebase not configured');return;}
    showLoading('Signing in…');

    try{
      const c = await fbAuth.signInWithEmailAndPassword(email, pass);
      const t = await c.user.getIdToken();
      const d = await API.auth.loginOwner(t);

      // Store Firebase UID on session so Add Location works for existing owners
      d.uid = c.user.uid;
      State.session = d;

      // Save session now — before any redirects — so it persists regardless of path
      saveOwnerSession(d);

      // Check businesses
      const businesses = d.businesses || [];
      const firstBiz = businesses[0];
      const firstBizId = firstBiz?.id || (typeof firstBiz === 'string' ? firstBiz : null);

      // No businesses at all — brand new owner, go to owner dashboard
      // They'll create a location from there which triggers the subscribe flow
      if(!firstBizId){
        renderOwnerDashboard();
        return;
      }

      // Has a business — check subscription status
      try{
        const bd = await API.business.getById(firstBizId);
        State.biz = bd.business;

        // No active subscription → show subscribe flow
        const status = bd.business.subscriptionStatus;
        if(!status || status === 'inactive'){
          renderSubscribeFlow(bd.business);
          return;
        }
      } catch(bizErr){
        console.warn('Business lookup failed:', bizErr.message);
      }

      renderOwnerDashboard();

    }catch(e){
      app().innerHTML='';
      renderOwnerLogin();
      showToast(e.message||'Sign in failed');
    }
  };

  window._register=async function(){
    if(!fbAuth){fbAuth=window._fbAuth||null;}
    const email=$('oe')?.value?.trim(), pass=$('op')?.value;
    if(!email||!pass){showToast('Enter email and password');return;}
    if(pass.length<6){showToast('Password must be 6+ characters');return;}
    if(!fbAuth){showToast('Firebase not configured');return;}
    showLoading('Creating account…');
    try{
      const c = await fbAuth.createUserWithEmailAndPassword(email, pass);
      const t = await c.user.getIdToken();
      // Store uid so business creation works
      State._ownerFirebaseUid = c.user.uid;
      State._ownerToken = t;
      renderCreateBusiness(t);
    }catch(e){
      app().innerHTML='';
      renderOwnerLogin();
      if(e.code==='auth/email-already-in-use'){showToast('Email already registered — try Sign In',4000);}
      else{showToast(e.message||'Registration failed');}
    }
  };
}

// ── Create Business ───────────────────────────────────────────────────────────
function renderCreateBusiness(idToken){
  const existingSession = State.session;
  const isExistingOwner = existingSession?.role === 'owner';
  const backFn = isExistingOwner ? 'renderOwnerDashboard()' : 'renderOwnerLogin()';

  app().innerHTML=`
    <div class="page-center fade-up" style="justify-content:flex-start;padding-top:72px;min-height:100vh">
      <div style="width:100%;max-width:340px">
        <button onclick="${backFn}"
          style="background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;
          font-family:inherit;margin-bottom:28px;padding:0;display:block">← Back</button>
        <div style="font-size:28px;font-weight:700;letter-spacing:-.04em;margin-bottom:6px">New Location</div>
        <div style="font-size:15px;color:var(--lbl3);margin-bottom:8px">Set up a new Tap+ location.</div>
        <div style="font-size:14px;color:var(--brand);font-weight:500;margin-bottom:32px">A setup fee and subscription apply.</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">Location Name</div>
            <input class="inp" id="cb-n" placeholder="e.g. Low Country Kitchen — ATL" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">Admin PIN (4-6 digits)</div>
            <input class="inp" id="cb-a" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 1234" style="border-radius:var(--r-md)"/>
          </div>
          <div>
            <div class="field-lbl">Manager PIN (4-6 digits)</div>
            <input class="inp" id="cb-m" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 5678" style="border-radius:var(--r-md)"/>
          </div>
          <div style="height:4px"></div>
          <button class="btn btn-primary btn-full" onclick="window._create()"
            style="font-size:17px;padding:17px;border-radius:var(--r-lg)">
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>`;

  window._create=async function(){
    const name = $('cb-n')?.value?.trim();
    const adminPin = $('cb-a')?.value?.trim();
    const mgrPin = $('cb-m')?.value?.trim();

    if(!name){showToast('Enter location name');return;}
    if(!adminPin||adminPin.length<4){showToast('Admin PIN must be at least 4 digits');return;}
    if(!mgrPin||mgrPin.length<4){showToast('Manager PIN must be at least 4 digits');return;}
    if(adminPin===mgrPin){showToast('PINs must be different');return;}

    showLoading('Creating location…');
    try{
      // Set auth token in session storage for the API call
      if(isExistingOwner){
        sessionStorage.setItem('tp_session', JSON.stringify(existingSession));
      } else {
        sessionStorage.setItem('tp_session', JSON.stringify({token: idToken}));
      }

      const d = await API.business.create({name, adminPin, managerPin: mgrPin});
      State.biz = d.business;
      showToast('Location created! Code: ' + d.business.storeCode, 3000);

      if(typeof renderSubscribeFlow === 'function'){
        renderSubscribeFlow(d.business);
      } else {
        showToast('Location created! Code: ' + d.business.storeCode, 4000);
        renderOwnerDashboard();
      }
    }catch(e){
      showToast(e.message||'Failed');
      renderCreateBusiness(idToken);
    }
  };
}

// ── Dashboard Entry ───────────────────────────────────────────────────────────
async function renderDashboardEntry(slug){
  const sess = API.auth.getSession();
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