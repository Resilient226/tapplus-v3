'use strict';

var fbAuth = window._fbAuth || null;

const State = { session:null, biz:null, staff:[], taps:[], layout:null };

const app  = () => document.getElementById('app');
const $    = (id) => document.getElementById(id);
const esc  = (s) => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let _tt;
function showToast(msg,d=2500){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),d);}
function showModal(html){const b=$('modal-box'),o=$('modal-overlay');if(!b||!o)return;b.innerHTML=html;o.classList.add('open');}
function closeModal(){const o=$('modal-overlay');if(o)o.classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.id==='modal-overlay')closeModal();});
function showLoading(msg=''){app().innerHTML=`<div class="page-center"><div class="spinner"></div>${msg?`<div style="margin-top:14px;color:var(--lbl3);font-size:14px;font-weight:400">${esc(msg)}</div>`:''}</div>`;}
function showError(msg){app().innerHTML=`<div class="page-center"><div style="font-size:40px;margin-bottom:16px">⚠️</div><div style="font-weight:700;margin-bottom:8px">Something went wrong</div><div style="font-size:14px;color:var(--gray);margin-bottom:24px">${esc(msg)}</div><button class="btn btn-ghost" onclick="route()">Go Home</button></div>`;}

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
  if(ld){ld.classList.add('hidden');setTimeout(function(){ld.style.display='none';},350);}
  const parts=location.pathname.split('/').filter(Boolean);
  if(parts.length>=3&&parts[1]==='tap')return renderTapPage(parts[0],parts[2]);
  if(parts.length>=2&&parts[1]==='dashboard')return renderDashboardEntry(parts[0]);
  return renderHome();
}
function navigate(path){history.pushState({},''  ,path);route();}
window.addEventListener('popstate',route);
window.addEventListener('DOMContentLoaded',route);

// ── Home ──────────────────────────────────────────────────────────────────────
function renderHome(){
  app().innerHTML=`
    <div class="page-center fade-up">
      <div style="margin-bottom:6px">
        <div style="font-size:60px;font-weight:700;letter-spacing:-.05em;line-height:1;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif">Tap<span style="color:var(--brand)">+</span></div>
      </div>
      <div style="font-size:15px;color:var(--lbl3);margin-bottom:48px;font-weight:400">Enter your store code</div>
      <div style="width:100%;max-width:280px;display:flex;flex-direction:column;gap:12px">
        <input class="inp" id="code-inp" placeholder="0000" type="number" inputmode="numeric" maxlength="4"
          style="text-align:center;font-size:34px;font-weight:600;letter-spacing:.25em;padding:18px;border-radius:var(--r-lg);background:var(--sys-bg2)"
          onkeydown="if(event.key==='Enter')window._go()"/>
        <button class="btn btn-primary btn-full" onclick="window._go()" style="font-size:17px;padding:16px;border-radius:var(--r-lg)">Continue</button>
        <button class="btn btn-ghost btn-full" onclick="window._ownerEntry()" style="font-size:16px;border-radius:var(--r-lg)">Business Login</button>
        <div style="text-align:center;margin-top:8px">
          <button onclick="window._sa()" style="background:none;border:none;color:rgba(255,255,255,.04);font-size:10px;cursor:pointer">●</button>
        </div>
      </div>
    </div>`;
  window._go=async function(){
    const code=($('code-inp')?.value||'').trim();
    if(code.length!==4){showToast('Enter a 4-digit code');return;}
    showLoading('Looking up…');
    try{const d=await API.business.getByCode(code);State.biz=d.business;renderRoleSelect();}
    catch{showToast('Invalid store code');renderHome();}
  };
  window._ownerEntry=function(){State.biz=null;renderOwnerLogin();};
  window._sa=function(){
    showModal(`<div class="modal-head"><div class="modal-title">Super Admin</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:18px;font-weight:800;margin-bottom:16px">Enter PIN</div>
        <div class="pin-display" style="gap:10px">
          <div class="pin-dot" id="pd0"></div><div class="pin-dot" id="pd1"></div>
          <div class="pin-dot" id="pd2"></div><div class="pin-dot" id="pd3"></div>
          <div class="pin-dot" id="pd4"></div><div class="pin-dot" id="pd5"></div>
        </div>
        <div class="pin-grid">${['1','2','3','4','5','6','7','8','9','del','0','go'].map(k=>`<button class="pin-key${k==='del'||k==='go'?' del':''}" onclick="window._pin('${k}')" style="${k==='go'?'background:var(--green);color:var(--black);border-color:var(--green)':''}">${k==='del'?'⌫':k==='go'?'→':k}</button>`).join('')}</div>
      </div>`);
    let pin='';
    window._pin=function(v){
      if(v==='del'){pin=pin.slice(0,-1);}
      else if(v==='go'){
        if(pin.length<4){showToast('Enter at least 4 digits');return;}
        closeModal();showLoading('Authenticating…');
        API.auth.loginSuperAdmin(pin).then(d=>{State.session=d;renderSuperAdminDashboard();}).catch(()=>{showToast('Invalid PIN');renderHome();});
        return;
      }
      else if(pin.length<6){pin+=v;}
      document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('filled',i<pin.length));
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
          : `<div style="font-size:24px;font-weight:600;letter-spacing:-.02em;margin-bottom:8px">${esc(biz.name)}</div>`}
        <div style="font-size:15px;color:var(--lbl3)">Choose your role</div>
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
