// public/subscribe.js

function renderSubscribeFlow(biz) {
  const b = biz || State.biz || {};
  _renderPlanSelect(b);
}

function _subStyles() {
  if (document.getElementById('sub-styles')) return;
  const s = document.createElement('style');
  s.id = 'sub-styles';
  s.textContent = `
    .sub-page { min-height:100vh; background:var(--sys-bg); max-width:480px; margin:0 auto; padding:0 0 48px; display:flex; flex-direction:column; }
    .sub-header { padding:56px 24px 32px; text-align:center; }
    .sub-wordmark { font-size:28px; font-weight:700; letter-spacing:-.04em; margin-bottom:24px; }
    .sub-wordmark span { color:var(--brand); }
    .sub-title { font-size:28px; font-weight:700; letter-spacing:-.03em; line-height:1.2; margin-bottom:8px; }
    .sub-sub { font-size:15px; color:var(--lbl3); font-weight:400; line-height:1.5; }
    .plan-card { margin:0 16px 12px; border-radius:20px; padding:20px; cursor:pointer; transition:all .2s cubic-bezier(.34,1.2,.64,1); position:relative; border:1.5px solid transparent; background:var(--sys-bg2); }
    .plan-card:active { transform:scale(.98); }
    .plan-card.selected { border-color:var(--brand); background:rgba(0,229,160,.06); }
    .plan-card.pilot.selected { border-color:#ff9f0a; background:rgba(255,159,10,.06); }
    .plan-badge { position:absolute; top:-1px; right:16px; background:var(--brand); color:#000; font-size:10px; font-weight:700; padding:4px 10px; border-radius:0 0 8px 8px; letter-spacing:.04em; text-transform:uppercase; }
    .plan-badge.pilot { background:#ff9f0a; }
    .plan-name { font-size:17px; font-weight:600; letter-spacing:-.02em; margin-bottom:4px; }
    .plan-price { font-size:36px; font-weight:700; letter-spacing:-.04em; line-height:1; }
    .plan-price span { font-size:16px; font-weight:400; color:var(--lbl3); letter-spacing:0; }
    .plan-desc { font-size:13px; color:var(--lbl3); margin-top:8px; line-height:1.5; }
    .plan-perks { margin-top:12px; display:flex; flex-direction:column; gap:6px; }
    .plan-perk { font-size:13px; color:var(--lbl2); display:flex; align-items:center; gap:8px; }
    .plan-perk::before { content:''; width:16px; height:16px; border-radius:50%; background:rgba(0,229,160,.15); flex-shrink:0; background-image:url("data:image/svg+xml,%3Csvg width='10' height='8' viewBox='0 0 10 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4l2.5 2.5L9 1' stroke='%2300e5a0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:center; }
    .plan-perk.pilot-perk::before { background-color:rgba(255,159,10,.15); background-image:url("data:image/svg+xml,%3Csvg width='10' height='8' viewBox='0 0 10 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4l2.5 2.5L9 1' stroke='%23ff9f0a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); }
    .card-selector { margin:0 16px; background:var(--sys-bg2); border-radius:20px; padding:20px; margin-bottom:12px; }
    .card-type { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:.5px solid var(--sep); }
    .card-type:last-child { border-bottom:none; }
    .card-type-info { flex:1; }
    .card-type-name { font-size:15px; font-weight:500; }
    .card-type-price { font-size:13px; color:var(--lbl3); margin-top:2px; }
    .qty-control { display:flex; align-items:center; gap:16px; }
    .qty-btn { width:32px; height:32px; border-radius:50%; background:var(--fill-thin); border:none; color:var(--lbl); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; transition:all .1s; }
    .qty-btn:active { transform:scale(.9); background:var(--fill-med); }
    .qty-val { font-size:17px; font-weight:600; width:24px; text-align:center; }
    .order-summary { margin:0 16px 24px; background:var(--sys-bg2); border-radius:20px; padding:20px; }
    .summary-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:14px; color:var(--lbl2); border-bottom:.5px solid var(--sep); }
    .summary-row:last-child { border-bottom:none; }
    .summary-row.total { font-size:16px; font-weight:600; color:var(--lbl); margin-top:4px; }
    .sub-footer { padding:0 16px; position:sticky; bottom:0; background:linear-gradient(to top, var(--sys-bg) 80%, transparent); padding-top:24px; padding-bottom:max(24px, env(safe-area-inset-bottom)); }
    .congrats-screen { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 24px; text-align:center; max-width:480px; margin:0 auto; position:relative; overflow:hidden; }
    .congrats-ring { width:120px; height:120px; border-radius:50%; background:radial-gradient(circle, rgba(0,229,160,.2) 0%, rgba(0,229,160,.05) 60%, transparent 100%); display:flex; align-items:center; justify-content:center; margin-bottom:32px; position:relative; animation:pulseRing 2s ease-in-out infinite; }
    @keyframes pulseRing { 0%, 100% { transform:scale(1); } 50% { transform:scale(1.05); } }
    .congrats-ring::before { content:''; position:absolute; inset:-8px; border-radius:50%; border:1.5px solid rgba(0,229,160,.2); animation:expandRing 2s ease-in-out infinite; }
    .congrats-ring::after { content:''; position:absolute; inset:-20px; border-radius:50%; border:1px solid rgba(0,229,160,.1); animation:expandRing 2s ease-in-out infinite .3s; }
    @keyframes expandRing { 0% { transform:scale(.95); opacity:.8; } 100% { transform:scale(1.08); opacity:0; } }
    .congrats-icon { font-size:48px; line-height:1; }
    .confetti-dot { position:absolute; width:6px; height:6px; border-radius:50%; animation:confettiFall 3s ease-in-out infinite; }
    @keyframes confettiFall { 0% { transform:translateY(-20px) rotate(0deg); opacity:1; } 100% { transform:translateY(100vh) rotate(360deg); opacity:0; } }
    .checklist-item { display:flex; align-items:center; gap:14px; padding:14px 16px; border-bottom:.5px solid var(--sep); cursor:pointer; transition:background .1s; }
    .checklist-item:active { background:var(--fill-ultra); }
    .checklist-item:last-child { border-bottom:none; }
    .check-circle { width:24px; height:24px; border-radius:50%; border:1.5px solid var(--sep); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; transition:all .2s; }
    .check-circle.done { background:var(--brand); border-color:var(--brand); color:#000; }
    .check-label { font-size:15px; font-weight:500; flex:1; }
    .check-sub { font-size:12px; color:var(--lbl3); margin-top:2px; }
    .progress-bar-wrap { height:4px; background:var(--fill-ultra); border-radius:2px; margin:12px 0 20px; overflow:hidden; }
    .progress-bar-fill { height:100%; background:var(--brand); border-radius:2px; transition:width .5s cubic-bezier(.34,1.56,.64,1); }
  `;
  document.head.appendChild(s);
}

// ── Plan Select ───────────────────────────────────────────────────────────────
function _renderPlanSelect(biz) {
  _subStyles();
  // Capture bizId at plan select time so it's always available at checkout
  const capturedBizId = biz?.id || State.biz?.id || null;
  let selected = 'pilot';

  function render() {
    app().innerHTML = `
      <div class="sub-page fade-up">
        <div class="sub-header">
          <div class="sub-wordmark">Tap<span>+</span></div>
          <div class="sub-title">Choose your plan</div>
          <div class="sub-sub">Start collecting reviews and tracking staff performance</div>
        </div>

        <div class="plan-card pilot ${selected==='pilot'?'selected':''}" onclick="window._selectPlan('pilot')">
          <div class="plan-badge pilot">World Cup Pilot</div>
          <div style="margin-top:8px">
            <div class="plan-name">World Cup Pilot</div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px">
              <div class="plan-price" style="color:#ff9f0a">$69<span>/mo</span></div>
              <div style="font-size:12px;color:var(--lbl3)">3-month contract</div>
            </div>
            <div class="plan-desc">Lock in before June 11. Converts to monthly after 90 days.</div>
            <div class="plan-perks" style="margin-top:14px">
              <div class="plan-perk pilot-perk">$150 setup · includes 12 cards</div>
              <div class="plan-perk pilot-perk">World Cup window coverage</div>
              <div class="plan-perk pilot-perk">Full platform access</div>
              <div class="plan-perk pilot-perk">Priority onboarding support</div>
            </div>
          </div>
        </div>

        <div class="plan-card ${selected==='annual'?'selected':''}" onclick="window._selectPlan('annual')">
          <div class="plan-badge">Best Value</div>
          <div style="margin-top:8px">
            <div class="plan-name">Annual</div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px">
              <div class="plan-price">$89<span>/mo</span></div>
              <div style="font-size:12px;color:var(--lbl3)">billed $1,068/yr</div>
            </div>
            <div class="plan-desc">Save $240/year vs monthly. Best for established locations.</div>
            <div class="plan-perks" style="margin-top:14px">
              <div class="plan-perk">$199 setup · includes 12 cards</div>
              <div class="plan-perk">Full platform access</div>
              <div class="plan-perk">Analytics & AI insights</div>
              <div class="plan-perk">Staff leaderboard & goals</div>
            </div>
          </div>
        </div>

        <div class="plan-card ${selected==='monthly'?'selected':''}" onclick="window._selectPlan('monthly')">
          <div class="plan-name">Monthly</div>
          <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px">
            <div class="plan-price">$109<span>/mo</span></div>
            <div style="font-size:12px;color:var(--lbl3)">no commitment</div>
          </div>
          <div class="plan-desc">Maximum flexibility. Cancel anytime.</div>
          <div class="plan-perks" style="margin-top:14px">
            <div class="plan-perk">$249 setup · includes 12 cards</div>
            <div class="plan-perk">Full platform access</div>
            <div class="plan-perk">Analytics & AI insights</div>
            <div class="plan-perk">Staff leaderboard & goals</div>
          </div>
        </div>

        <div class="sub-footer">
          <button class="btn btn-primary btn-full" onclick="window._planNext()" style="font-size:17px;padding:16px;border-radius:16px">
            Continue
          </button>
          <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--lbl4)">
            Secured by Stripe · Cancel anytime
          </div>
        </div>
      </div>`;

    window._selectPlan = function(p) { selected = p; render(); };
    window._planNext = function() { _renderCardSelector(biz, selected, capturedBizId); };
  }

  render();
}

// ── Card Selector ─────────────────────────────────────────────────────────────
function _renderCardSelector(biz, plan, capturedBizId) {
  _subStyles();

  const setupFees        = { pilot: 150,  annual: 199,  monthly: 249  };
  const firstChargeAmt   = { pilot: 69,   annual: 1068, monthly: 109  };
  const firstChargeLabel = { pilot: 'First Month', annual: 'Annual Subscription', monthly: 'First Month' };
  const planNames        = { pilot: 'World Cup Pilot', annual: 'Annual', monthly: 'Monthly' };
  const INCLUDED = 12;

  let branded = 0;
  let custom  = 0;

  // Resolve bizId once here — don't rely on State.biz being set at button-click time
  const bizId = capturedBizId
    || biz?.id
    || State.biz?.id
    || (() => {
         const b = State.session?.businesses?.[0];
         return b?.id || (typeof b === 'string' ? b : null);
       })()
    || null;

  const bizName = biz?.name || State.biz?.name || '';

  function calcTotal() {
    const setup     = setupFees[plan];
    const firstAmt  = firstChargeAmt[plan];
    const extraB    = Math.max(0, branded - INCLUDED) * 11.99;
    const extraC    = custom * 15.99;
    const cardTotal = extraB + extraC;
    return { setup, firstAmt, cardTotal, total: setup + firstAmt + cardTotal };
  }

  function render() {
    const { setup, firstAmt, cardTotal, total } = calcTotal();
    const extraB = Math.max(0, branded - INCLUDED);
    const extraC = custom;
    const totalStr = total.toFixed(2);

    app().innerHTML = `
      <div class="sub-page fade-up">
        <div class="sub-header" style="padding-bottom:20px">
          <button onclick="renderSubscribeFlow()" style="background:none;border:none;color:var(--brand);font-size:17px;cursor:pointer;font-family:inherit;display:block;margin-bottom:16px">← Back</button>
          <div class="sub-title" style="font-size:24px">Add cards to your order</div>
          <div class="sub-sub">12 cards included with setup. Add more below.</div>
        </div>

        <div class="card-selector">
          <div style="font-size:12px;font-weight:500;color:var(--lbl3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Card Type</div>
          <div class="card-type">
            <div class="card-type-info">
              <div class="card-type-name">Tap+ Branded</div>
              <div class="card-type-price">$11.99 each · premium matte UV print</div>
            </div>
            <div class="qty-control">
              <button class="qty-btn" onclick="window._adjCard('branded',-1)">−</button>
              <div class="qty-val">${branded}</div>
              <button class="qty-btn" onclick="window._adjCard('branded',1)">+</button>
            </div>
          </div>
          <div class="card-type">
            <div class="card-type-info">
              <div class="card-type-name">Custom Branded</div>
              <div class="card-type-price">$15.99 each · your logo & colors</div>
            </div>
            <div class="qty-control">
              <button class="qty-btn" onclick="window._adjCard('custom',-1)">−</button>
              <div class="qty-val">${custom}</div>
              <button class="qty-btn" onclick="window._adjCard('custom',1)">+</button>
            </div>
          </div>
          ${branded > 0 || custom > 0 ? `
            <div style="margin-top:12px;padding:10px 12px;background:var(--fill-ultra);border-radius:10px;font-size:13px;color:var(--lbl3)">
              ${INCLUDED} cards included free · ${branded} branded${custom > 0 ? ` · ${custom} custom` : ''} selected
              ${extraB > 0 || extraC > 0
                ? `<br><span style="color:var(--lbl2)">${extraB} extra branded + ${extraC} custom = +$${cardTotal.toFixed(2)}</span>`
                : `<br><span style="color:var(--brand)">All covered by setup fee ✓</span>`}
            </div>` : ''}
        </div>

        <div class="order-summary">
          <div style="font-size:13px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Order Summary</div>
          <div class="summary-row">
            <span>${planNames[plan]} — ${firstChargeLabel[plan]}</span>
            <span>$${firstAmt.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Setup Fee (incl. 12 cards)</span>
            <span>$${setup}.00</span>
          </div>
          ${cardTotal > 0 ? `<div class="summary-row"><span>Extra Cards</span><span>$${cardTotal.toFixed(2)}</span></div>` : ''}
          ${plan === 'annual' ? `<div class="summary-row" style="color:var(--lbl3)"><span>Renews annually</span><span>$1,068.00</span></div>` : ''}
          <div class="summary-row total">
            <span>Due Today</span>
            <span>$${totalStr}</span>
          </div>
        </div>

        <div style="padding:0 16px;margin-bottom:8px;text-align:center">
          <div style="font-size:12px;color:var(--lbl4);line-height:1.7">
            ${plan === 'pilot'
              ? 'Setup fee is one-time. Renews at $69/mo for 3 months, then $109/mo.'
              : plan === 'annual'
              ? 'Setup fee ($199) charged once today. Subscription ($1,068) renews annually.'
              : 'Setup fee ($249) charged once today. Subscription ($109) renews monthly. Cancel anytime.'}
          </div>
        </div>

        <div class="sub-footer">
          <button class="btn btn-primary btn-full" id="checkout-btn" onclick="window._checkout()" style="font-size:17px;padding:16px;border-radius:16px">
            Pay $${totalStr} Today →
          </button>
          <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--lbl4)">
            🔒 Secured by Stripe
          </div>
        </div>
      </div>`;

    window._adjCard = function(type, delta) {
      if (type === 'branded') branded = Math.max(0, branded + delta);
      else custom = Math.max(0, custom + delta);
      render();
    };

    window._checkout = async function() {
      const btn = document.getElementById('checkout-btn');

      // Guard: must have a bizId
      if (!bizId) {
        showToast('Session error — please sign out and back in');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to Stripe…'; }

      try {
        const origin = window.location.origin;
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan,
            bizId,
            bizName,
            brandedCards: branded,
            customCards:  custom,
            successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&biz=${bizId}`,
            cancelUrl:  `${origin}/subscribe`,
          }),
        });

        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          showToast(data.error || 'Checkout failed — please try again');
          if (btn) { btn.disabled = false; btn.textContent = `Pay $${totalStr} Today →`; }
        }
      } catch(e) {
        showToast('Network error — please check your connection');
        if (btn) { btn.disabled = false; btn.textContent = `Pay $${totalStr} Today →`; }
      }
    };
  }

  render();
}

// ── Congrats Screen ───────────────────────────────────────────────────────────
async function renderCongratsScreen(sessionId, bizId) {
  _subStyles();

  app().innerHTML = `
    <div class="page-center">
      <div class="spinner"></div>
      <div style="margin-top:14px;color:var(--lbl3);font-size:14px">Activating your account…</div>
    </div>`;

  let planName  = 'your plan';
  let cardOrder = { branded: 0, custom: 0 };

  try {
    const res  = await fetch('/api/subscribe?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, bizId }),
    });
    const data = await res.json();
    if (data.plan)      planName  = { pilot: 'World Cup Pilot', annual: 'Annual', monthly: 'Monthly' }[data.plan] || data.plan;
    if (data.cardOrder) cardOrder = data.cardOrder;
  } catch(e) { console.error('Verify error:', e); }

  const totalCards = (cardOrder.branded || 0) + (cardOrder.custom || 0);
  const colors     = ['#00e5a0','#ff9f0a','#0a84ff','#bf5af2','#ff453a'];
  const dots       = Array.from({ length: 20 }, (_, i) => {
    const color = colors[i % colors.length];
    return `<div class="confetti-dot" style="left:${Math.random()*100}%;background:${color};animation-delay:${Math.random()*2}s;animation-duration:${2+Math.random()*2}s;top:-10px"></div>`;
  }).join('');

  app().innerHTML = `
    <div class="congrats-screen fade-up">
      ${dots}
      <div class="congrats-ring"><div class="congrats-icon">🎉</div></div>
      <div style="font-size:30px;font-weight:700;letter-spacing:-.03em;margin-bottom:10px">You're live.</div>
      <div style="font-size:16px;color:var(--lbl3);line-height:1.6;max-width:280px;margin-bottom:40px">
        Welcome to Tap+. Your <strong style="color:var(--lbl)">${esc(planName)}</strong> plan is active and your location is ready.
      </div>
      <div style="width:100%;max-width:360px;text-align:left">
        <div style="font-size:13px;font-weight:500;color:var(--lbl3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;padding-left:2px">Get started</div>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" id="onboard-bar" style="width:0%"></div></div>
        <div class="ios-group">
          <div class="checklist-item" onclick="window._onboardStep('branding')">
            <div class="check-circle done" id="cc-branding">✓</div>
            <div><div class="check-label">Set up your branding</div><div class="check-sub">Logo, colors, and welcome message</div></div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(235,235,245,.28)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="checklist-item" onclick="window._onboardStep('links')">
            <div class="check-circle"></div>
            <div><div class="check-label">Add review links</div><div class="check-sub">Google, Yelp, TripAdvisor</div></div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(235,235,245,.28)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="checklist-item" onclick="window._onboardStep('staff')">
            <div class="check-circle"></div>
            <div><div class="check-label">Add your first staff member</div><div class="check-sub">They'll get their own tap card</div></div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(235,235,245,.28)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          ${totalCards > 0 ? `
            <div class="checklist-item">
              <div class="check-circle" style="background:var(--ios-orange);border-color:var(--ios-orange);color:#000">✓</div>
              <div><div class="check-label">Cards on the way</div><div class="check-sub">${totalCards} card${totalCards > 1 ? 's' : ''} ordered · we'll be in touch</div></div>
            </div>` : ''}
        </div>
      </div>
      <div style="margin-top:32px;width:100%;max-width:360px">
        <button class="btn btn-primary btn-full" onclick="window._goDashboard()" style="font-size:17px;padding:16px;border-radius:16px">
          Go to Dashboard
        </button>
      </div>
    </div>`;

  setTimeout(() => {
    const bar = document.getElementById('onboard-bar');
    if (bar) bar.style.width = '25%';
  }, 400);

  window._onboardStep = function(step) {
    renderDashboard();
    setTimeout(() => window._tab && window._tab(step === 'links' ? 'branding2' : step === 'staff' ? 'staff' : 'branding2'), 200);
  };

  window._goDashboard = function() {
    const saved = API.auth.getSession();
    if (saved?.token) {
      State.session = saved;
      if (saved.role === 'owner') { renderOwnerDashboard(); return; }
      if (saved.bizId) {
        State.biz = State.biz || { id: saved.bizId };
        loadDashboardData().then(() => renderDashboard());
        return;
      }
    }
    renderHome();
  };
}

// ── Success route ─────────────────────────────────────────────────────────────
function handleSuccessRoute() {
  const params    = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const bizId     = params.get('biz');
  if (sessionId && bizId) {
    renderCongratsScreen(sessionId, bizId);
  } else {
    renderHome();
  }