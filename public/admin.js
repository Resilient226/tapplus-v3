// public/admin.js

// Shared password reset using Firebase REST API
window._sendPasswordReset = async function(email) {
  if (!email) { showToast('No email provided'); return; }
  const apiKey = 'AIzaSyCRr397Iw_ZnmLB9Sw21bjx-05HP5bqa3g';
  showLoading('Sending reset email…');
  try {
    const res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + apiKey,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: email.trim() })
      }
    );
    const data = await res.json();
    if (data.error) {
      showToast('Error: ' + (data.error.message || 'Unknown error'));
    } else {
      showToast('Reset email sent to ' + email + ' — check spam folder', 4000);
    }
  } catch(e) {
    showToast('Network error — try again');
  }
};

async function renderOwnerDashboard() {
  const sess = State.session;
  const bizIds = sess?.businesses || [];
  let active = 'locations';

  showLoading('Loading…');

  let bizList = [];
  try {
    const validIds = bizIds.map(b => b?.id || b).filter(id => id && typeof id === 'string' && id !== 'undefined');
    const results = await Promise.allSettled(validIds.map(id => API.business.getById(id)));
    bizList = results
      .filter(r => r.status === 'fulfilled' && r.value?.business?.id)
      .map(r => r.value.business);
  } catch(e) {}

  let allTaps = [];
  try {
    const validBizList = bizList.filter(b => b && b.id);
    const tapResults = await Promise.allSettled(validBizList.map(b => API.taps.list({ bizId: b.id })));
    tapResults.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        (r.value.taps || []).forEach(t => allTaps.push({
          ...t,
          bizId: validBizList[i]?.id,
          bizName: validBizList[i]?.name
        }));
      }
    });
  } catch(e) {}

  const totalTaps = allTaps.length;
  const fiveStarTaps = allTaps.filter(t => t.rating === 5).length;
  const avgRating = allTaps.length
    ? (allTaps.reduce((s, t) => s + (t.rating || 0), 0) / allTaps.length).toFixed(1)
    : '—';
  const totalLocations = bizList.length;

  window._ownerBizList = bizList;

  window._ownerAddLocation = function() {
    app().innerHTML = `
      <div style="max-width:400px;margin:0 auto;padding:72px 20px 40px">
        <button onclick="renderOwnerDashboard()"
          style="background:none;border:none;color:var(--brand);font-size:17px;
          cursor:pointer;font-family:inherit;margin-bottom:28px;padding:0;display:block">
          ← Back
        </button>
        <div style="font-size:28px;font-weight:700;letter-spacing:-.04em;margin-bottom:6px">New Location</div>
        <div style="font-size:15px;color:var(--lbl3);margin-bottom:8px">Set up a new Tap+ location.</div>
        <div style="font-size:14px;color:var(--brand);font-weight:500;margin-bottom:32px">A setup fee and subscription apply.</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">Location Name</div>
            <input class="inp" id="nl-name" placeholder="e.g. Low Country Kitchen — ATL"/>
          </div>
          <div>
            <div class="field-lbl">Admin PIN (4-6 digits)</div>
            <input class="inp" id="nl-admin" type="text" inputmode="numeric" placeholder="e.g. 1234"/>
          </div>
          <div>
            <div class="field-lbl">Manager PIN (4-6 digits)</div>
            <input class="inp" id="nl-mgr" type="text" inputmode="numeric" placeholder="e.g. 5678"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._nlCreate()"
            style="font-size:17px;padding:17px;border-radius:var(--r-lg);margin-top:8px">
            Continue to Payment →
          </button>
        </div>
      </div>`;

    window._nlCreate = async function() {
      const name = document.getElementById('nl-name')?.value?.trim();
      const adminPin = document.getElementById('nl-admin')?.value?.trim();
      const mgrPin = document.getElementById('nl-mgr')?.value?.trim();

      if (!name) { showToast('Enter location name'); return; }
      if (!adminPin || adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (!mgrPin || mgrPin.length < 4) { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin === mgrPin) { showToast('PINs must be different'); return; }

      showLoading('Creating location…');
      try {
        const token = API.auth.getToken();
        if (!token) throw new Error('Session expired — please sign out and back in');

        const res = await fetch('/api/business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ name, adminPin, managerPin: mgrPin })
        });
        const d = await res.json();
        if (!res.ok || !d.business) throw new Error(d.error || 'Failed to create location');

        State.biz = d.business;
        showToast('Location created! Code: ' + d.business.storeCode, 3000);

        if (typeof renderSubscribeFlow === 'function') {
          renderSubscribeFlow(d.business);
        } else {
          renderOwnerDashboard();
        }
      } catch(e) {
        showToast(e.message || 'Failed');
        renderOwnerDashboard();
      }
    };
  };

  function render() {
    app().innerHTML = `
      <div style="max-width:480px;margin:0 auto;padding:16px 16px 96px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-top:max(8px,env(safe-area-inset-top,0px))">
          <div>
            <div style="font-size:24px;font-weight:700;letter-spacing:-.04em">Owner Portal</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:3px">${totalLocations} location${totalLocations !== 1 ? 's' : ''}</div>
          </div>
          <button onclick="API.auth.logout();State.session=null;State.biz=null;renderHome()"
            style="background:var(--fill);border:none;border-radius:100px;padding:7px 16px;
            color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">
            Sign Out
          </button>
        </div>

        <div class="tabs">
          ${['locations','analytics','billing'].map(t => `
            <button class="tab${t === active ? ' active' : ''}" onclick="window._ownerTab('${t}')"
              id="ot-${t}" style="text-transform:capitalize">${t}</button>`).join('')}
        </div>

        <div id="owner-body" class="fade-up"></div>
      </div>

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

    window._ownerTab = function(t) {
      active = t;
      ['locations','analytics','billing'].forEach(x => {
        const b = $('ot-' + x);
        if (b) b.className = 'tab' + (x === t ? ' active' : '');
      });
      const body = $('owner-body');
      if (!body) return;
      body.classList.remove('fade-up'); void body.offsetWidth; body.classList.add('fade-up');
      if (t === 'locations') _ownerLocations(body);
      else if (t === 'analytics') _ownerAnalytics(body);
      else _ownerBilling(body);
    };

    window._ownerTab('locations');
  }

  window._ownerLocations = function(body) {
    if (bizList.length === 0) {
      body.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:40px;margin-bottom:16px">🏪</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:8px">No locations yet</div>
          <div style="font-size:14px;color:var(--lbl3);margin-bottom:24px">Create your first location to get started</div>
          <button class="btn btn-primary" onclick="window._ownerAddLocation()">Create Location</button>
        </div>`;
      return;
    }

    const groups = {};
    bizList.forEach(b => {
      const key = b.groupName || b.name.split(' ')[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    const groupKeys = Object.keys(groups);

    body.innerHTML = `
      <div class="sec-lbl">Your Locations</div>
      ${groupKeys.map(gKey => {
        const locs = groups[gKey];
        const isGroup = locs.length > 1;
        const gId = 'owgrp-' + gKey.replace(/[^a-z0-9]/gi,'');

        const locCards = locs.map(b => {
          const bTaps = allTaps.filter(t => t.bizId === b.id);
          const bAvg = bTaps.length ? (bTaps.reduce((s, t) => s + (t.rating || 0), 0) / bTaps.length).toFixed(1) : '—';
          const bFive = bTaps.filter(t => t.rating === 5).length;
          const isActive = b.subscriptionStatus === 'active';
          return `
            <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                <div style="width:44px;height:44px;border-radius:var(--r-md);background:var(--brand)14;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
                  ${b.branding?.logoUrl ? `<img src="${esc(b.branding.logoUrl)}" style="width:100%;height:100%;border-radius:var(--r-md);object-fit:cover"/>` : '🏪'}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:16px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.name)}</div>
                  <div style="font-size:12px;color:var(--lbl3);margin-top:2px">
                    Code: <span style="color:var(--brand);font-weight:600">${esc(b.storeCode || '—')}</span>
                    <span style="margin-left:8px;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;
                      background:${isActive ? 'rgba(0,229,160,.15)' : 'rgba(255,77,106,.1)'};
                      color:${isActive ? 'var(--brand)' : 'var(--ios-red)'}">
                      ${isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
                ${[
                  [bTaps.length, 'Taps', 'var(--brand)'],
                  [bAvg + '★', 'Rating', 'var(--ios-yellow)'],
                  [bFive, '5-Stars', 'var(--a-blue)']
                ].map(([v, l, c]) => `
                  <div style="background:var(--bg3);border-radius:10px;padding:10px 8px;text-align:center">
                    <div style="font-size:18px;font-weight:700;color:${c};letter-spacing:-.02em">${v}</div>
                    <div style="font-size:10px;color:var(--lbl3);margin-top:3px;text-transform:uppercase;letter-spacing:.04em">${l}</div>
                  </div>`).join('')}
              </div>
              <div style="display:flex;gap:8px">
                <button onclick="${isActive ? `window._ownerOpenBiz('${b.id}')` : `window._ownerTab('billing')`}"
                  style="flex:1;background:${isActive ? 'var(--brand)' : 'var(--fill)'};
                  border:none;border-radius:var(--r-sm);padding:10px;
                  color:${isActive ? '#000' : 'var(--lbl2)'};
                  font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
                  ${isActive ? 'Manage' : 'Subscribe'}
                </button>
                <button onclick="window._ownerChangePins('${b.id}','${esc(b.name)}')"
                  style="background:var(--fill);border:none;border-radius:var(--r-sm);padding:10px 16px;
                  color:var(--lbl2);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">
                  PINs
                </button>
              </div>
            </div>`;
        }).join('');

        if (!isGroup) return locCards;

        const allActive = locs.every(b => b.subscriptionStatus === 'active');
        const anyActive = locs.some(b => b.subscriptionStatus === 'active');
        const statusColor = allActive ? 'var(--brand)' : anyActive ? 'var(--ios-yellow)' : 'var(--ios-red)';
        const statusBg = allActive ? 'rgba(0,229,160,.12)' : anyActive ? 'rgba(255,214,10,.08)' : 'rgba(255,77,106,.08)';
        const statusLabel = allActive ? 'All Active' : anyActive ? 'Partial' : 'Inactive';

        return `
          <div style="margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:8px;padding:10px 4px;cursor:pointer"
              onclick="const el=$('${gId}');if(el){const open=el.style.display!=='none';el.style.display=open?'none':'block';this.querySelector('.grp-arrow').textContent=open?'▸':'▾'}">
              <div style="flex:1">
                <span style="font-size:14px;font-weight:700;color:var(--lbl2)">${esc(gKey)}</span>
                <span style="margin-left:8px;font-size:11px;color:var(--lbl3)">${locs.length} locations</span>
                <span style="margin-left:6px;padding:1px 7px;border-radius:100px;font-size:9px;font-weight:700;
                  background:${statusBg};color:${statusColor}">${statusLabel}</span>
              </div>
              <span class="grp-arrow" style="color:var(--lbl3);font-size:11px">▾</span>
            </div>
            <div id="${gId}">${locCards}</div>
          </div>`;
      }).join('')}
      <button class="btn btn-ghost btn-full" onclick="window._ownerAddLocation()"
        style="border-radius:var(--r-lg);margin-top:4px">
        + Add Location
      </button>`;
  };

  window._ownerAnalytics = function(body) {
    const statTiles = [
      [totalTaps, 'Total Taps', 'var(--brand)', 'rgba(0,229,160,.12)'],
      [avgRating + '★', 'Avg Rating', 'var(--ios-yellow)', 'rgba(255,214,10,.1)'],
      [fiveStarTaps, '5-Star Taps', 'var(--a-blue)', 'rgba(59,158,255,.1)'],
      [totalLocations, 'Locations', 'var(--a-purple)', 'rgba(155,89,255,.1)'],
    ];

    const locationRows = bizList.map(b => {
      const bTaps = allTaps.filter(t => t.bizId === b.id);
      const bAvg = bTaps.length ? (bTaps.reduce((s, t) => s + (t.rating || 0), 0) / bTaps.length).toFixed(1) : '—';
      const bFive = bTaps.filter(t => t.rating === 5).length;
      return { name: b.name, taps: bTaps.length, avg: bAvg, five: bFive };
    }).sort((a, b) => b.taps - a.taps);

    body.innerHTML = `
      <div class="stat-grid">
        ${statTiles.map(([v, l, c, bg]) => `
          <div style="background:${bg};border-radius:var(--r-lg);padding:18px 14px">
            <div style="font-size:32px;font-weight:800;color:${c};line-height:1;letter-spacing:-.04em">${v}</div>
            <div style="font-size:11px;font-weight:500;color:${c};opacity:.7;margin-top:6px;text-transform:uppercase;letter-spacing:.04em">${l}</div>
          </div>`).join('')}
      </div>
      ${locationRows.length > 1 ? `
        <div class="sec-lbl" style="margin-top:8px">By Location</div>
        <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden">
          ${locationRows.map((r, i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:${i < locationRows.length - 1 ? '.5px solid var(--sep)' : 'none'}">
              <div style="flex:1;min-width:0">
                <div style="font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div>
                <div style="font-size:12px;color:var(--lbl3);margin-top:1px">${r.avg}★ avg · ${r.five} five-stars</div>
              </div>
              <div style="font-size:18px;font-weight:700;color:var(--brand)">${r.taps}</div>
            </div>`).join('')}
        </div>` : ''}
      ${totalTaps === 0 ? `
        <div style="text-align:center;padding:40px 0;color:var(--lbl3)">
          <div style="font-size:32px;margin-bottom:12px">📊</div>
          <div style="font-size:15px">No taps yet.<br/>Share your staff cards to start collecting reviews.</div>
        </div>` : ''}`;
  };

  window._ownerBilling = function(body) {
    const firstBiz = bizList[0];
    const plan = firstBiz?.plan || null;
    const status = firstBiz?.subscriptionStatus || 'inactive';
    const planNames = { pilot: 'World Cup Pilot', annual: 'Annual', monthly: 'Monthly' };
    const planPrices = { pilot: '$69/mo', annual: '$89/mo', monthly: '$109/mo' };
    const planColors = { pilot: 'var(--ios-orange)', annual: 'var(--a-blue)', monthly: 'var(--a-blue)' };
    const isActive = status === 'active';

    const subscribedAt = firstBiz?.subscribedAt || null;
    const trialEndsAt = firstBiz?.trialEndsAt || null;
    const now = Date.now();
    let daysLeft = null, renewsDate = null, timeLabel = '', progressPct = 0;

    if (isActive && subscribedAt) {
      if (plan === 'pilot' && trialEndsAt) {
        daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / 86400000));
        renewsDate = new Date(trialEndsAt);
        timeLabel = `Pilot ends ${renewsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        progressPct = Math.round(daysLeft / 90 * 100);
      } else if (plan === 'annual') {
        const renewsAt = new Date(subscribedAt); renewsAt.setFullYear(renewsAt.getFullYear() + 1);
        daysLeft = Math.max(0, Math.ceil((renewsAt - now) / 86400000));
        renewsDate = renewsAt;
        timeLabel = `Renews ${renewsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        progressPct = Math.round(daysLeft / 365 * 100);
      } else if (plan === 'monthly') {
        const renewsAt = new Date(subscribedAt); renewsAt.setMonth(renewsAt.getMonth() + 1);
        daysLeft = Math.max(0, Math.ceil((renewsAt - now) / 86400000));
        renewsDate = renewsAt;
        timeLabel = `Renews ${renewsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        progressPct = Math.round(daysLeft / 30 * 100);
      }
    }

    const urgentColor = daysLeft <= 7 ? 'var(--ios-red)' : daysLeft <= 14 ? 'var(--ios-orange)' : 'var(--brand)';

    body.innerHTML = `
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:20px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em">Current Plan</div>
          <div style="padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;
            background:${isActive ? 'rgba(0,229,160,.12)' : 'rgba(255,77,106,.1)'};
            color:${isActive ? 'var(--brand)' : 'var(--ios-red)'}">
            ${isActive ? 'Active' : 'Inactive'}
          </div>
        </div>
        ${!isActive ? `
          <div style="font-size:22px;font-weight:700;margin-bottom:8px">
            ${plan ? planNames[plan] : 'No Active Plan'}
          </div>
          <div style="font-size:14px;color:var(--lbl3);line-height:1.6;margin-bottom:20px">
            ${plan ? 'Your subscription is inactive. Subscribe to reactivate.' : 'Subscribe to start collecting reviews, tracking staff, and growing your ratings.'}
          </div>
          <button onclick="window._ownerChoosePlan()"
            style="width:100%;background:var(--brand);border:none;border-radius:var(--r-lg);
            padding:16px;font-size:17px;font-weight:700;color:#000;cursor:pointer;font-family:inherit">
            ${plan ? 'Reactivate Subscription →' : 'Choose a Plan →'}
          </button>
        ` : `
          <div style="font-size:30px;font-weight:700;letter-spacing:-.03em;margin-bottom:4px;color:${planColors[plan] || 'var(--brand)'}">
            ${planNames[plan] || plan}
          </div>
          <div style="font-size:15px;color:var(--lbl3);margin-bottom:${daysLeft !== null ? '16px' : '4px'}">
            ${planPrices[plan] || ''} · ${totalLocations} location${totalLocations !== 1 ? 's' : ''}
          </div>
          ${daysLeft !== null ? `
            <div style="background:var(--bg3);border-radius:var(--r-md);padding:14px 16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:14px;color:var(--lbl2)">${timeLabel}</div>
                <div style="font-size:22px;font-weight:700;color:${urgentColor};letter-spacing:-.02em">${daysLeft}d</div>
              </div>
              <div style="height:5px;background:var(--fill);border-radius:3px;overflow:hidden">
                <div style="height:100%;border-radius:3px;background:${urgentColor};width:${progressPct}%"></div>
              </div>
              ${daysLeft <= 7 ? `<div style="font-size:12px;color:var(--ios-red);margin-top:8px;font-weight:500">⚠️ Expiring soon — renew to avoid interruption</div>` : ''}
            </div>` : ''}
          ${plan === 'pilot' ? `
            <div style="margin-top:12px;padding:12px;background:rgba(255,107,53,.08);border-radius:var(--r-sm);border:.5px solid rgba(255,107,53,.2)">
              <div style="font-size:13px;color:var(--ios-orange);font-weight:500;line-height:1.5">
                World Cup Pilot — auto-converts to Monthly ($109/mo) after 90 days
              </div>
            </div>` : ''}
        `}
      </div>

      <div style="background:var(--bg2);border-radius:var(--r-lg);overflow:hidden;margin-bottom:12px">
        ${isActive ? `
          <div class="ios-row" onclick="window._ownerPortal()">
            <div style="flex:1">
              <div style="font-size:16px;font-weight:400">Manage Billing</div>
              <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Update payment method, cancel, or change plan</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>` : ''}
        <div class="ios-row" onclick="window._ownerAddLocation()">
          <div style="flex:1">
            <div style="font-size:16px;font-weight:400">Add Location</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Set up a new Tap+ location</div>
          </div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        ${isActive ? `
          <div class="ios-row" onclick="window._ownerInvoice()">
            <div style="flex:1">
              <div style="font-size:16px;font-weight:400">Download Invoice</div>
              <div style="font-size:13px;color:var(--lbl3);margin-top:1px">Get your latest invoice</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>` : ''}
      </div>

      ${firstBiz?.cardOrder ? `
        <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Card Order</div>
          <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:8px">
            <span style="color:var(--lbl2)">Tap+ Branded</span>
            <span style="font-weight:600">${firstBiz.cardOrder.branded || 0} cards</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px">
            <span style="color:var(--lbl2)">Custom Printed</span>
            <span style="font-weight:600">${firstBiz.cardOrder.custom || 0} cards</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-size:12px;color:var(--lbl3)">
              Status: <span style="color:var(--brand);font-weight:500;text-transform:capitalize">${firstBiz.cardOrder.status || 'pending'}</span>
            </div>
            ${firstBiz.cardOrder.orderedAt ? `<div style="font-size:12px;color:var(--lbl3)">${new Date(firstBiz.cardOrder.orderedAt).toLocaleDateString()}</div>` : ''}
          </div>
        </div>` : ''}

      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:16px">
        <div style="font-size:12px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Support</div>
        <div style="font-size:14px;color:var(--lbl2);line-height:1.6">
          Questions about your subscription?<br/>
          <a href="mailto:support@tapplus.top" style="color:var(--brand);text-decoration:none;font-weight:500">support@tapplus.top</a>
        </div>
      </div>`;

    window._ownerChoosePlan = function() {
      const biz = window._ownerBizList?.[0] || State.biz;
      if (typeof renderSubscribeFlow === 'function') {
        renderSubscribeFlow(biz);
      } else {
        showToast('Subscription flow unavailable — please refresh');
      }
    };

    window._ownerPortal = async function() {
      if (!firstBiz?.id) { showToast('No active subscription found'); return; }
      showLoading('Loading billing…');
      try {
        const res = await fetch('/api/subscribe?action=portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bizId: firstBiz.id, returnUrl: window.location.origin })
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else { showToast(data.error || 'Billing portal unavailable'); renderOwnerDashboard(); }
      } catch(e) { showToast('Failed to load billing portal'); renderOwnerDashboard(); }
    };

    window._ownerInvoice = function() { showToast('Invoice download coming soon'); };
  };

  window._ownerOpenBiz = async function(id) {
    showLoading();
    try {
      const d = await API.business.getById(id);
      State.biz = d.business;
      State.session = { ...sess, bizId: id, role: 'bizAdmin' };
      await loadDashboardData();
      renderDashboard();
    } catch(e) { showError(e.message); }
  };

  window._ownerChangePins = function(bizId, bizName) {
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
            <input class="inp" id="op-admin" type="text" inputmode="numeric" placeholder="4-6 digits · blank to keep"/>
          </div>
          <div>
            <div class="field-lbl">New Manager PIN</div>
            <input class="inp" id="op-mgr" type="text" inputmode="numeric" placeholder="4-6 digits · blank to keep"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._ownerSavePins('${bizId}')" style="margin-top:4px">Save PINs</button>
        </div>
      </div>`);

    window._ownerSavePins = async function(bId) {
      const adminPin = $('op-admin')?.value?.trim();
      const mgrPin = $('op-mgr')?.value?.trim();
      if (!adminPin && !mgrPin) { showToast('Enter at least one PIN'); return; }
      if (adminPin && adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (mgrPin && mgrPin.length < 4) { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin && mgrPin && adminPin === mgrPin) { showToast('PINs must be different'); return; }
      const updates = {};
      if (adminPin) updates.adminPin = adminPin;
      if (mgrPin) updates.managerPin = mgrPin;
      closeModal(); showLoading('Saving…');
      try { await API.business.update(bId, updates); showToast('PINs updated ✓'); }
      catch(e) { showToast(e.message || 'Failed'); }
      renderOwnerDashboard();
    };
  };

  render();
}

// ── Super Admin Dashboard ────────────────────────────────────────────────────
function renderSuperAdminDashboard() {
  app().innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:20px 16px 80px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-top:8px">
        <div style="font-size:20px;font-weight:700">⚡ Super Admin</div>
        <button onclick="API.auth.logout();renderHome()"
          style="background:rgba(255,255,255,.06);border:none;border-radius:var(--r-xs);
          padding:6px 12px;color:var(--lbl2);font-size:12px;font-weight:700;
          cursor:pointer;font-family:inherit">Sign Out</button>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="window._saT('layout')" id="sa-layout">Layout</button>
        <button class="tab" onclick="window._saT('biz')" id="sa-biz">Businesses</button>
        <button class="tab" onclick="window._saT('analytics')" id="sa-analytics">Analytics</button>
      </div>
      <div id="sa-body"></div>
    </div>`;

  function saLayout() {
    $('sa-body').innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;
    API.layout.get().then(data => {
      const L = data.layouts;
      const SECTIONS = {
        staff: ['coaching','feedback','goals','stats','branding'],
        manager: ['ai','analytics','team','staff','goals','estimator','branding2'],
        bizAdmin: ['ai','analytics','team','staff','goals','branding2']
      };
      const SLABELS = { coaching:'Coaching',feedback:'Feedback',goals:'Goals',stats:'Stats',branding:'Branding',ai:'AI Insights',team:'Team',staff:'Staff',links:'Links',estimator:'Estimator',settings:'Settings',branding2:'Branding',analytics:'Analytics' };
      const layouts = {
        staff: [...(L.staff || SECTIONS.staff)],
        manager: [...(L.manager || SECTIONS.manager)],
        bizAdmin: [...(L.bizAdmin || SECTIONS.bizAdmin)]
      };

      function drawLayouts() {
        $('sa-body').innerHTML = Object.entries(layouts).map(([role, order]) => `
          <div class="plain-card" style="margin-bottom:12px">
            <div style="font-weight:700;font-size:14px;margin-bottom:12px;text-transform:capitalize">${role} Dashboard</div>
            ${order.map((s, i) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;background:var(--sys-bg2);border-radius:var(--r-xs);padding:8px 12px">
                <span style="font-size:14px;flex:1">${SLABELS[s] || s}</span>
                <button onclick="window._mvUp('${role}',${i})" style="background:none;border:none;color:var(--lbl2);cursor:pointer;font-size:16px;padding:2px 6px">↑</button>
                <button onclick="window._mvDn('${role}',${i})" style="background:none;border:none;color:var(--lbl2);cursor:pointer;font-size:16px;padding:2px 6px">↓</button>
              </div>`).join('')}
          </div>`).join('') +
          `<button class="btn btn-primary btn-full" onclick="window._saveLayout()">Save Layout</button>`;
      }

      drawLayouts();
      window._mvUp = function(role, i) { if (i === 0) return; const a = layouts[role]; [a[i-1],a[i]]=[a[i],a[i-1]]; drawLayouts(); };
      window._mvDn = function(role, i) { const a = layouts[role]; if (i >= a.length-1) return; [a[i],a[i+1]]=[a[i+1],a[i]]; drawLayouts(); };
      window._saveLayout = async function() {
        showLoading('Saving…');
        try { await API.layout.update(layouts); showToast('Layout saved ✓'); renderSuperAdminDashboard(); }
        catch(e) { showToast(e.message || 'Failed'); renderSuperAdminDashboard(); }
      };
    }).catch(e => {
      $('sa-body').innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--red)">${esc(e.message || 'Failed to load layouts')}</div>`;
    });
  }

  window._saT = function(t) {
    ['layout','biz','analytics'].forEach(x => {
      const b = $('sa-' + x);
      if (b) b.className = 'tab' + (x === t ? ' active' : '');
    });
    if (t === 'layout') saLayout();
    else if (t === 'analytics') { const sb = $('sa-body'); if (sb) renderSAAnalytics(sb); }
    else saBiz();
  };

  window._saT('layout');
}

// ── Super Admin: Businesses tab ───────────────────────────────────────────────
async function saBiz() {
  const body = $('sa-body');
  if (!body) return;

  const saToken = API.auth.getToken();
  if (!saToken) {
    body.innerHTML = `
      <div style="background:rgba(255,77,106,.1);border-radius:var(--r-lg);padding:20px;color:var(--ios-red)">
        <div style="font-weight:700;margin-bottom:6px">Session expired</div>
        <div style="font-size:13px;color:var(--lbl3)">Sign out and back in to continue.</div>
        <button onclick="API.auth.logout();renderHome()"
          style="margin-top:12px;background:var(--fill);border:none;border-radius:var(--r-sm);
          padding:10px 20px;color:var(--lbl2);font-size:13px;cursor:pointer;font-family:inherit;width:100%">
          Sign Out
        </button>
      </div>`;
    return;
  }

  body.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div></div>`;

  let allBiz = [];
  try {
    const saR = await fetch('/api/business?listAll=1', {
      headers: { 'Authorization': 'Bearer ' + saToken }
    });
    const saD = await saR.json();

    if (!saR.ok || saD.error) {
      body.innerHTML = `
        <div style="background:rgba(255,77,106,.1);border-radius:var(--r-lg);padding:20px;color:var(--ios-red);font-size:14px;line-height:1.6">
          <div style="font-weight:700;margin-bottom:6px">Failed to load businesses</div>
          <div style="font-family:monospace;font-size:12px;color:var(--lbl3)">${esc(saD.error || 'Server error')} (${saR.status})</div>
          <button onclick="API.auth.logout();renderHome()"
            style="margin-top:16px;background:var(--fill);border:none;border-radius:var(--r-sm);
            padding:10px 20px;color:var(--lbl2);font-size:13px;cursor:pointer;font-family:inherit;width:100%">
            Sign Out & Re-authenticate
          </button>
        </div>`;
      return;
    }

    allBiz = (saD.businesses || []).filter(b => b && b.id);
  } catch(e) {
    body.innerHTML = `
      <div style="background:rgba(255,77,106,.1);border-radius:var(--r-lg);padding:20px;color:var(--ios-red);font-size:14px">
        <div style="font-weight:700;margin-bottom:6px">Network error</div>
        <div style="font-size:12px;color:var(--lbl3)">${esc(e.message)}</div>
      </div>`;
    return;
  }

  function draw(businesses) {
    body.innerHTML = `
      <button class="btn btn-primary btn-full" style="margin-bottom:16px" onclick="window._saCreateBiz()">+ Create New Business</button>
      <input class="inp" id="sa-biz-search" placeholder="Search businesses…" style="margin-bottom:16px" oninput="window._saSearch(this.value)"/>
      <div id="sa-biz-list"></div>`;
    renderList(businesses);
  }

  function renderList(businesses) {
    const el = $('sa-biz-list');
    if (!el) return;
    if (businesses.length === 0) {
      el.innerHTML = '<div class="card" style="text-align:center;color:var(--lbl2);padding:30px">No businesses found.</div>';
      return;
    }

    const groups = {};
    businesses.forEach(b => {
      const key = b.ownerId || '__none__';
      if (!groups[key]) {
        const label = b.name || 'Unknown Account';
        groups[key] = { ownerId: key, label, locs: [] };
      }
      groups[key].locs.push(b);
    });

    Object.values(groups).forEach(g => {
      if (g.locs.length > 1) {
        const firstName = g.locs[0].name || '';
        const firstWord = firstName.split(' ')[0];
        const allShare = g.locs.every(b => b.name?.startsWith(firstWord));
        g.label = allShare && firstWord ? firstWord : firstName;
      }
    });

    el.innerHTML = Object.values(groups).map(g => {
      const allActive = g.locs.every(b => b.subscriptionStatus === 'active');
      const anyActive = g.locs.some(b => b.subscriptionStatus === 'active');
      const statusColor = allActive ? 'var(--brand)' : anyActive ? 'var(--ios-yellow)' : 'var(--ios-red)';
      const statusBg = allActive ? 'rgba(0,229,160,.12)' : anyActive ? 'rgba(255,214,10,.08)' : 'rgba(255,77,106,.08)';
      const statusLabel = allActive ? 'All Active' : anyActive ? 'Partial' : 'Inactive';
      const groupId = 'sagrp-' + (g.ownerId || 'none').replace(/[^a-z0-9]/gi,'');

      const locationRows = g.locs.map(b => `
        <div style="display:flex;align-items:center;gap:8px;padding:11px 14px;border-top:.5px solid rgba(255,255,255,.06)">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.name)}</div>
            <div style="font-size:11px;color:var(--lbl3);margin-top:1px">
              Code: <span style="color:var(--brand);font-weight:700">${esc(b.storeCode || '—')}</span>
              <span style="margin-left:6px;padding:1px 6px;border-radius:100px;font-size:9px;font-weight:700;
                background:${b.subscriptionStatus === 'active' ? 'rgba(0,229,160,.15)' : 'rgba(255,77,106,.1)'};
                color:${b.subscriptionStatus === 'active' ? 'var(--brand)' : 'var(--ios-red)'}">
                ${b.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button onclick="window._saBizSettings('${b.id}','${esc(b.name)}','${esc(b.ownerId || '')}')"
              style="padding:6px 10px;border-radius:var(--r-sm);border:none;background:var(--fill);
              color:var(--lbl2);font-size:12px;cursor:pointer;font-family:inherit">Settings</button>
            <button onclick="window._saViewBiz('${b.id}')"
              style="padding:6px 10px;border-radius:var(--r-sm);border:none;
              background:var(--brand);color:#000;font-size:12px;font-weight:700;
              cursor:pointer;font-family:inherit">View</button>
            <button onclick="window._saDeleteBiz('${b.id}','${esc(b.name)}','${esc(b.ownerId || '')}')"
              style="padding:6px 8px;border-radius:var(--r-sm);border:none;
              background:rgba(255,77,106,.1);color:var(--ios-red);font-size:12px;
              cursor:pointer;font-family:inherit">✕</button>
          </div>
        </div>`).join('');

      return `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-lg);margin-bottom:10px;overflow:hidden">
          <div style="display:flex;align-items:center;gap:10px;padding:14px;cursor:pointer"
            onclick="const b=$('${groupId}');if(b)b.style.display=b.style.display==='none'?'block':'none'">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${esc(g.label)}
              </div>
              <div style="font-size:12px;color:var(--lbl3);margin-top:2px">
                ${g.locs.length} location${g.locs.length !== 1 ? 's' : ''}
                <span style="margin-left:8px;padding:1px 7px;border-radius:100px;font-size:9px;font-weight:700;
                  background:${statusBg};color:${statusColor}">${statusLabel}</span>
              </div>
            </div>
            <div style="color:var(--lbl3);font-size:12px">▾</div>
          </div>
          <div id="${groupId}">
            ${locationRows}
          </div>
        </div>`;
    }).join('');
  }

  window._saSearch = function(q) {
    const filtered = q
      ? allBiz.filter(b => (b.name + b.slug + b.storeCode).toLowerCase().includes(q.toLowerCase()))
      : allBiz;
    renderList(filtered);
  };

  window._saViewBiz = async function(id) {
    showLoading();
    try {
      const d = await API.business.getById(id);
      State.biz = d.business;
      State.session = { ...State.session, bizId: id, role: 'bizAdmin' };
      await loadDashboardData();
      renderDashboard();
    } catch(e) { showError(e.message); }
  };

  window._saCreateBiz = function() {
    showModal(`
      <div class="modal-head">
        <div class="modal-title">Create Business</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:0 20px 8px">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <div class="field-lbl">Business Name</div>
            <input class="inp" id="cb-name" placeholder="e.g. Low Country Kitchen"/>
          </div>
          <div>
            <div class="field-lbl">Owner Email (must exist in Firebase Auth)</div>
            <input class="inp" id="cb-email" type="email" placeholder="owner@restaurant.com"/>
          </div>
          <div>
            <div class="field-lbl">Admin PIN (4-6 digits)</div>
            <input class="inp" id="cb-admin" type="text" inputmode="numeric" placeholder="e.g. 1234"/>
          </div>
          <div>
            <div class="field-lbl">Manager PIN (4-6 digits)</div>
            <input class="inp" id="cb-mgr" type="text" inputmode="numeric" placeholder="e.g. 5678"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._saDoCreate()" style="margin-top:4px">Create</button>
        </div>
      </div>`);

    window._saDoCreate = async function() {
      const name = $('cb-name')?.value?.trim();
      const email = $('cb-email')?.value?.trim();
      const adminPin = $('cb-admin')?.value?.trim();
      const mgrPin = $('cb-mgr')?.value?.trim();

      if (!name) { showToast('Enter business name'); return; }
      if (!adminPin || adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (!mgrPin || mgrPin.length < 4) { showToast('Manager PIN must be 4+ digits'); return; }
      if (adminPin === mgrPin) { showToast('PINs must be different'); return; }

      closeModal(); showLoading('Creating…');
      try {
        const res = await fetch('/api/business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API.auth.getToken()
          },
          body: JSON.stringify({ name, adminPin, managerPin: mgrPin, ownerEmail: email })
        });
        const d = await res.json();
        if (res.ok && d.business) {
          showToast('Created! Code: ' + d.business.storeCode, 4000);
        } else {
          showToast(d.error || 'Failed');
        }
      } catch(e) { showToast(e.message || 'Failed'); }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };
  };

  // ── Settings modal with tabs: PINs | Links | Subscription ─────────────────
  window._saBizSettings = function(bizId, bizName, ownerId) {
    let settingsTab = 'pins';
    let bizData = null;

    API.business.getById(bizId).then(d => {
      bizData = d.business;
      refreshSettingsModal();
    }).catch(() => {
      bizData = { id: bizId, name: bizName, reviewLinks: [] };
      refreshSettingsModal();
    });

    function refreshSettingsModal() {
      const tabBar = `
        <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--fill);border-radius:var(--r-sm);padding:3px">
          ${['pins','links','subscription'].map(t => `
            <button onclick="window._saSetTab('${t}')"
              id="bst-${t}"
              style="flex:1;padding:7px 4px;border:none;border-radius:calc(var(--r-sm) - 2px);
              font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;
              background:${t === settingsTab ? 'var(--bg2)' : 'transparent'};
              color:${t === settingsTab ? 'var(--lbl1)' : 'var(--lbl3)'}">
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </button>`).join('')}
        </div>`;

      let tabContent = '';

      if (settingsTab === 'pins') {
        tabContent = `
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <div class="field-lbl">New Admin PIN (blank to keep)</div>
              <input class="inp" id="bs-admin" type="text" inputmode="numeric" placeholder="4-6 digits"/>
            </div>
            <div>
              <div class="field-lbl">New Manager PIN (blank to keep)</div>
              <input class="inp" id="bs-mgr" type="text" inputmode="numeric" placeholder="4-6 digits"/>
            </div>
            <button class="btn btn-primary btn-full" onclick="window._saSavePins('${bizId}')">Save PINs</button>
          </div>`;
      }

      if (settingsTab === 'links') {
        const reviewLinks = bizData?.reviewLinks || [];
        tabContent = `
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--lbl3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Review Links</div>
            <div id="bs-review-links">
              ${reviewLinks.length === 0
                ? `<div style="font-size:13px;color:var(--lbl3);padding:8px 0">No review links yet.</div>`
                : reviewLinks.map((l, i) => `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                      <div style="flex:1;min-width:0">
                        <div style="font-size:13px;font-weight:500">${esc(l.label || l.platform || 'Link')}</div>
                        <div style="font-size:11px;color:var(--lbl3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url || '')}</div>
                      </div>
                      <button onclick="window._saRemoveLink(${i})"
                        style="background:rgba(255,77,106,.1);border:none;border-radius:var(--r-xs);
                        padding:4px 8px;color:var(--ios-red);font-size:11px;cursor:pointer;flex-shrink:0">✕</button>
                    </div>`).join('')}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <input class="inp" id="bs-rl-label" placeholder="Label (e.g. Google)" style="flex:1;font-size:13px;padding:8px 10px"/>
              <input class="inp" id="bs-rl-url" placeholder="https://…" style="flex:2;font-size:13px;padding:8px 10px"/>
              <button onclick="window._saAddLink()"
                style="background:var(--brand);border:none;border-radius:var(--r-sm);
                padding:8px 12px;color:#000;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">+</button>
            </div>
            <button class="btn btn-primary btn-full" onclick="window._saSaveLinks('${bizId}')" style="margin-top:14px">Save Links</button>
          </div>`;
      }

      if (settingsTab === 'subscription') {
        const currentStatus = bizData?.subscriptionStatus || 'inactive';
        tabContent = `
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <div class="field-lbl">Subscription Status</div>
              <select class="inp" id="bs-sub-status" style="appearance:auto">
                ${['active','inactive','canceled','past_due','trialing'].map(s =>
                  `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <div class="field-lbl">Plan</div>
              <select class="inp" id="bs-plan" style="appearance:auto">
                ${['','pilot','monthly','annual'].map(p =>
                  `<option value="${p}" ${p === (bizData?.plan || '') ? 'selected' : ''}>${p || '(none)'}</option>`
                ).join('')}
              </select>
            </div>
            <button class="btn btn-primary btn-full" onclick="window._saSaveSubscription('${bizId}')">Save Subscription</button>
            <button class="btn btn-danger btn-full" onclick="window._saDeleteBiz('${bizId}','${esc(bizName)}','${esc(ownerId)}')">Delete Business</button>
          </div>`;
      }

      const modalContent = `
        <div class="modal-head">
          <div class="modal-title">${esc(bizName)}</div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div style="padding:0 20px 16px">
          ${tabBar}
          ${tabContent}
        </div>`;

      const existing = document.querySelector('.modal-inner');
      if (existing) {
        existing.innerHTML = modalContent;
      } else {
        showModal(modalContent);
      }
    }

    window._saSetTab = function(t) {
      settingsTab = t;
      refreshSettingsModal();
    };

    window._saAddLink = function() {
      const labelEl = $('bs-rl-label');
      const urlEl = $('bs-rl-url');
      const label = labelEl?.value?.trim();
      const url = urlEl?.value?.trim();
      if (!label || !url) { showToast('Enter both label and URL'); return; }
      if (!/^https?:\/\//i.test(url)) { showToast('URL must start with https://'); return; }
      bizData.reviewLinks = [...(bizData.reviewLinks || []), { label, url, platform: label.toLowerCase(), active: true }];
      refreshSettingsModal();
    };

    window._saRemoveLink = function(idx) {
      bizData.reviewLinks = (bizData.reviewLinks || []).filter((_, i) => i !== idx);
      refreshSettingsModal();
    };

    window._saSavePins = async function(bId) {
      const adminPin = $('bs-admin')?.value?.trim();
      const mgrPin = $('bs-mgr')?.value?.trim();
      if (!adminPin && !mgrPin) { showToast('Enter at least one PIN'); return; }
      if (adminPin && adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
      if (mgrPin && mgrPin.length < 4) { showToast('Manager PIN must be 4+ digits'); return; }
      const updates = {};
      if (adminPin) updates.adminPin = adminPin;
      if (mgrPin) updates.managerPin = mgrPin;
      closeModal(); showLoading('Saving…');
      try { await API.business.update(bId, updates); showToast('PINs saved ✓'); }
      catch(e) { showToast(e.message || 'Failed'); }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };

    window._saSaveLinks = async function(bId) {
      closeModal(); showLoading('Saving…');
      try {
        await API.business.update(bId, {
          reviewLinks: bizData.reviewLinks || [],
        });
        showToast('Links saved ✓');
      } catch(e) { showToast(e.message || 'Failed'); }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };

    window._saSaveSubscription = async function(bId) {
      const status = $('bs-sub-status')?.value;
      const plan = $('bs-plan')?.value;
      closeModal(); showLoading('Saving…');
      try {
        const updates = { subscriptionStatus: status };
        if (plan) updates.plan = plan;
        await API.business.update(bId, updates);
        showToast('Subscription updated ✓');
      } catch(e) { showToast(e.message || 'Failed'); }
      renderSuperAdminDashboard();
      setTimeout(() => window._saT('biz'), 400);
    };
  };

  window._saDeleteBiz = async function(id, name, ownerId) {
    if (!confirm(`Delete "${name}"?\n\nThis will permanently delete the business, all staff, and all tap records.`)) return;
    showLoading('Deleting…');
    try {
      await API.business.delete(id);
      showToast(`${name} deleted`);
    } catch(e) { showToast(e.message || 'Delete failed'); }
    renderSuperAdminDashboard();
    setTimeout(() => window._saT('biz'), 400);
  };

  draw(allBiz);
}