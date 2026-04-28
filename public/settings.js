function renderSettingsTab(body) {
  const biz = State.biz;
  const b   = biz?.branding || {};
  // Merge platformLinks into reviewLinks so all available links show with toggles
  const _existing = biz?.reviewLinks || [];
  const _platform = biz?.platformLinks || [];
  const _merged = [..._existing];
  _platform.forEach(p => {
    if (!_merged.some(r => r.url === p.url)) _merged.push({...p, active: false});
  });
  let reviewLinks = _merged;
  let bulletinLinks = [...(b.bulletinLinks || [])];
  let dragIdx = null;

  let brandingOpen = false;

  function draw() {
    const biz = State.biz;
    const role = State.session?.role;
    const isBizAdmin = role === 'bizAdmin' || role === 'superAdmin';

    body.innerHTML = `
      <div class="sec-lbl">General</div>

      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:20px;margin-bottom:10px;text-align:center">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--lbl3);margin-bottom:8px">Store Code</div>
        <div style="font-size:48px;font-weight:700;color:var(--brand);letter-spacing:.2em;font-variant-numeric:tabular-nums">${esc(biz?.storeCode||'----')}</div>
        <div style="font-size:13px;color:var(--lbl3);margin-top:6px">Staff use this to log in</div>
      </div>

      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:18px;margin-bottom:10px">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Change PINs</div>
        <div style="font-size:13px;color:var(--lbl3);margin-bottom:16px">Leave blank to keep current</div>
        ${isBizAdmin ? `
        <div id="s-adminpin-wrap" style="margin-bottom:10px">
          <div class="field-lbl">New Admin PIN (4-6 digits)</div>
          <input class="inp" id="s-adminpin" type="number" inputmode="numeric" placeholder="Leave blank to keep" style="border-radius:var(--r-md)"/>
        </div>` : ''}
        <div style="margin-bottom:14px">
          <div class="field-lbl">New Manager PIN (4-6 digits)</div>
          <input class="inp" id="s-mgrpin" type="number" inputmode="numeric" placeholder="Leave blank to keep" style="border-radius:var(--r-md)"/>
        </div>
        <button class="btn btn-ghost btn-full" onclick="window._savePins()" style="border-radius:var(--r-lg)">Update PINs</button>
      </div>

      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:18px;margin-bottom:10px">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Shift Schedule</div>
        <div style="font-size:13px;color:var(--lbl3);margin-bottom:16px">Define your recurring daily shifts</div>
        <div id="s-shifts-list"></div>
        <button class="btn btn-ghost btn-full" onclick="window._addShift()" style="border-radius:var(--r-lg)">+ Add Shift</button>
      </div>

      <div style="margin-bottom:10px">
        <button onclick="window._toggleBranding()"
          style="width:100%;background:var(--bg2);border:none;border-radius:var(--r-lg);
                 padding:18px;display:flex;align-items:center;justify-content:space-between;
                 cursor:pointer;font-family:inherit;color:var(--lbl)">
          <div style="text-align:left">
            <div style="font-size:16px;font-weight:600">Branding</div>
            <div style="font-size:13px;color:var(--lbl3);margin-top:2px">Logo, colors, messages, review links</div>
          </div>
          <svg id="branding-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"
            style="transition:transform .25s;transform:${brandingOpen?'rotate(180deg)':'rotate(0deg)'}">
            <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div id="branding-section" style="display:${brandingOpen?'block':'none'}">
      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:600;font-size:15px;margin-bottom:16px">Branding</div>

        <div class="field-lbl">Business Name</div>
        <input class="inp" id="s-name" value="${esc(b.name||biz?.name||'')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Tagline</div>
        <input class="inp" id="s-tag" value="${esc(b.tagline||'')}" placeholder="We Create Memories" style="margin-bottom:10px"/>

        <div class="field-lbl">Logo</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input class="inp" id="s-logo" value="${esc(b.logoUrl||'')}" placeholder="https://…" style="flex:1"/>
          <button onclick="window._pickLogo()" class="btn btn-ghost btn-sm">Upload</button>
        </div>
        ${b.logoUrl?`<img src="${esc(b.logoUrl)}" id="s-logo-prev" style="height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block"/>`:``}

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
          <div><div class="field-lbl">Brand</div><input type="color" id="s-bc" value="${esc(b.brandColor||'#00e5a0')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
          <div><div class="field-lbl">Background</div><input type="color" id="s-bg" value="${esc(b.bgColor||'#07080c')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
          <div><div class="field-lbl">Text</div><input type="color" id="s-tc" value="${esc(b.textColor||'#ffffff')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
        </div>

        <div class="field-lbl">Rating Question</div>
        <input class="inp" id="s-q" value="${esc(b.ratingQuestion||'How was your experience today?')}" style="margin-bottom:10px"/>
        <div class="field-lbl">5★ Review Prompt</div>
        <input class="inp" id="s-rp" value="${esc(b.reviewPrompt||'Share your experience!')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Thank You Message</div>
        <input class="inp" id="s-ty" value="${esc(b.thankYouMsg||'Thank you! Redirecting you now…')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Low Rating Message</div>
        <input class="inp" id="s-lr" value="${esc(b.lowRatingMsg||"We're sorry to hear that.")}" style="margin-bottom:10px"/>
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-weight:600;font-size:15px">Review Links</div>
          <button onclick="window._rlToggleExpand()"
            style="background:none;border:none;color:var(--brand);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:0"
            id="rl-expand-btn">Show All</button>
        </div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:12px">Toggle to enable · First active = 5★ redirect · Managed by administrator</div>

        <!-- Search -->
        <input class="inp" id="rl-search" placeholder="Search links…" oninput="window._rlSearch(this.value)"
          style="margin-bottom:12px;font-size:13px;padding:8px 12px"/>

        <div id="rl-list" style="margin-bottom:8px">
          ${(()=>{
            const active = reviewLinks.filter(l => l.active !== false);
            const toShow = active.length === 0 ? reviewLinks.slice(0,3) : active;
            return toShow.length === 0
              ? `<div style="background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);border-radius:var(--r-md);padding:20px;text-align:center;color:var(--lbl2);font-size:13px">No review links configured yet.</div>`
              : toShow.map((l,i)=>{
                  const realIdx = reviewLinks.indexOf(l);
                  const isActive = l.active !== false;
                  const isFirst = reviewLinks.findIndex(x => x.active !== false) === realIdx;
                  return `
                  <div style="display:flex;align-items:center;gap:12px;
                    background:${isActive?'rgba(255,255,255,.05)':'rgba(255,255,255,.02)'};
                    border:1px solid ${isFirst?'rgba(0,229,160,.3)':isActive?'rgba(255,255,255,.1)':'rgba(255,255,255,.05)'};
                    border-radius:var(--r-md);padding:12px 14px;margin-bottom:8px;
                    opacity:${isActive?'1':'0.45'};transition:opacity .2s">
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <span style="font-weight:600;font-size:14px">${esc(l.label||l.platform||'Link')}</span>
                        ${isFirst?`<span style="background:rgba(0,229,160,.15);color:var(--brand);font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid rgba(0,229,160,.3)">5★ REDIRECT</span>`:''}
                      </div>
                      <div style="font-size:11px;color:var(--lbl2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>
                    </div>
                    <div class="toggle${isActive?' on':''}" id="rl-tog-${realIdx}" onclick="window._rlToggle(${realIdx})"><div class="toggle-thumb"></div></div>
                  </div>`;
                }).join('') +
                (reviewLinks.length > toShow.length ? `<div style="font-size:12px;color:var(--lbl3);text-align:center;padding:4px 0">${reviewLinks.length - toShow.length} more — tap "Show All" to see</div>` : '');
          })()}
        </div>
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:600;font-size:15px;margin-bottom:4px">Bulletin Board</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:14px">Drag to reorder · Toggle visibility · Shown on customer review page</div>
        <div id="s-bulletin" style="margin-bottom:12px"></div>
        <button class="btn btn-ghost btn-full" onclick="window._addBull()" style="border-radius:var(--r-lg)">+ Add Item</button>
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px">Staff Can Add</div>
        <div>
          ${['spotify','phone','email','instagram','tiktok','custom'].map(t=>{
            const TL={spotify:'Spotify',phone:'Phone',email:'Email',instagram:'Instagram',tiktok:'TikTok',custom:'Custom Link'};
            const on=(b.allowedStaffLinks||{})[t];
            return`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:.5px solid var(--sep)"><span style="font-size:14px;font-weight:400">${TL[t]}</span><div class="toggle${on?' on':''}" id="tog-${t}" onclick="this.classList.toggle('on')"><div class="toggle-thumb"></div></div></div>`;
          }).join('')}
        </div>
      </div>

      <div style="background:var(--sys-bg2);border-radius:var(--r-md);padding:14px;margin-bottom:16px;text-align:center">
        <div class="field-lbl">Store Code</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:.2em;color:var(--brand)">${esc(biz?.storeCode)}</div>
        <div style="font-size:12px;color:var(--lbl2);margin-top:4px">Staff use this to log in</div>
      </div>

      <button onclick="window._saveBranding()" class="btn btn-primary btn-full" style="margin-bottom:16px;border-radius:var(--r-lg);padding:16px;font-size:17px">Save Branding</button>
      </div>`;

    // ── Bulletin board list ─────────────────────────────────────────────────
    let bullDragIdx = null;

    function drawBulletin(){
      const el=$('s-bulletin');if(!el)return;
      if(!bulletinLinks.length){
        el.innerHTML=`<div style="background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);border-radius:var(--r-md);padding:20px;text-align:center;color:var(--lbl2);font-size:13px">No items yet. Add your first bulletin item.</div>`;
        return;
      }
      el.innerHTML=bulletinLinks.map((l,i)=>{
        const hidden=l.hidden||false;
        const typeLabel={text:'Text',custom:'Link',spotify:'Spotify',youtube:'YouTube'}[l.type||'text']||'Item';
        const typeColor={text:'var(--lbl3)',custom:'var(--a-blue)',spotify:'#1DB954',youtube:'#FF0000'}[l.type||'text']||'var(--lbl3)';
        return `
        <div id="bull-item-${i}"
          style="display:flex;align-items:center;gap:10px;
            background:${hidden?'rgba(255,255,255,.02)':'rgba(255,255,255,.05)'};
            border:1px solid ${hidden?'rgba(255,255,255,.05)':'rgba(255,255,255,.1)'};
            border-radius:var(--r-md);padding:12px 14px;margin-bottom:8px;
            opacity:${hidden?'0.5':'1'};transition:opacity .2s,transform .15s">

          <!-- Touch drag handle -->
          <div data-bull-drag="${i}"
            style="color:rgba(255,255,255,.3);font-size:20px;flex-shrink:0;
            user-select:none;cursor:grab;touch-action:none;padding:4px 2px;line-height:1">⠿</div>

          <!-- Content -->
          <div style="flex:1;min-width:0;pointer-events:none">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.label)}</span>
              <span style="font-size:9px;font-weight:700;text-transform:uppercase;color:${typeColor};background:${typeColor}20;padding:1px 6px;border-radius:20px;flex-shrink:0">${typeLabel}</span>
              ${hidden?`<span style="font-size:9px;font-weight:700;color:var(--lbl3);background:rgba(255,255,255,.06);padding:1px 6px;border-radius:20px;flex-shrink:0">Hidden</span>`:''}
            </div>
            ${l.url?`<div style="font-size:11px;color:var(--lbl3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>`:
              l.html?`<div style="font-size:11px;color:var(--lbl3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.html.replace(/<[^>]*>/g,'').slice(0,60)}</div>`:''}
          </div>

          <!-- Actions -->
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button onclick="window._bullToggleHide(${i})"
              style="background:none;border:none;cursor:pointer;padding:4px;
              color:${hidden?'rgba(255,255,255,.2)':'rgba(255,255,255,.6)'};line-height:1">
              ${hidden?
                `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`:
                `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
              }
            </button>
            <button onclick="window._rmBull(${i})"
              style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);
              border-radius:var(--r-xs);padding:5px 8px;font-size:12px;font-weight:600;
              color:var(--red);cursor:pointer;font-family:inherit">✕</button>
          </div>
        </div>`;
      }).join('');

      // Touch drag — attach to drag handles
      el.querySelectorAll('[data-bull-drag]').forEach(handle => {
        let startY, startIdx, placeholder, draggingEl;
        handle.addEventListener('touchstart', e => {
          startIdx = parseInt(handle.getAttribute('data-bull-drag'));
          draggingEl = handle.closest('[id^="bull-item-"]');
          startY = e.touches[0].clientY;
          draggingEl.style.opacity = '0.5';
          draggingEl.style.transform = 'scale(1.02)';
          e.preventDefault();
        }, {passive: false});

        handle.addEventListener('touchmove', e => {
          const y = e.touches[0].clientY;
          const items = [...el.querySelectorAll('[id^="bull-item-"]')];
          let targetIdx = startIdx;
          items.forEach((item, i) => {
            const rect = item.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (y > mid) targetIdx = i;
          });
          bullDragIdx = { from: startIdx, to: targetIdx };
          e.preventDefault();
        }, {passive: false});

        handle.addEventListener('touchend', e => {
          draggingEl.style.opacity = '';
          draggingEl.style.transform = '';
          if (bullDragIdx && bullDragIdx.from !== bullDragIdx.to) {
            const moved = bulletinLinks.splice(bullDragIdx.from, 1)[0];
            bulletinLinks.splice(bullDragIdx.to, 0, moved);
          }
          bullDragIdx = null;
          drawBulletin();
        });
      });
    }
    drawBulletin();

    window._bullToggleHide = function(i){
      bulletinLinks[i].hidden = !bulletinLinks[i].hidden;
      drawBulletin();
    };

    let _rlExpanded = false;
    let _rlQuery = '';

    function _rlRender() {
      const el = document.getElementById('rl-list'); if (!el) return;
      const btn = document.getElementById('rl-expand-btn');
      const filtered = _rlQuery
        ? reviewLinks.filter(l => (l.label||l.platform||'').toLowerCase().includes(_rlQuery.toLowerCase()))
        : reviewLinks;
      const active = filtered.filter(l => l.active !== false);
      const toShow = _rlExpanded || _rlQuery ? filtered : (active.length > 0 ? active : filtered.slice(0, 3));
      if (btn) btn.textContent = _rlExpanded ? 'Collapse' : 'Show All';

      el.innerHTML = toShow.length === 0
        ? `<div style="font-size:13px;color:var(--lbl3);padding:8px 0">No links match your search.</div>`
        : toShow.map(l => {
            const realIdx = reviewLinks.indexOf(l);
            const isActive = l.active !== false;
            const isFirst = reviewLinks.findIndex(x => x.active !== false) === realIdx;
            return `
            <div style="display:flex;align-items:center;gap:12px;
              background:${isActive?'rgba(255,255,255,.05)':'rgba(255,255,255,.02)'};
              border:1px solid ${isFirst?'rgba(0,229,160,.3)':isActive?'rgba(255,255,255,.1)':'rgba(255,255,255,.05)'};
              border-radius:var(--r-md);padding:12px 14px;margin-bottom:8px;
              opacity:${isActive?'1':'0.45'};transition:opacity .2s">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <span style="font-weight:600;font-size:14px">${esc(l.label||l.platform||'Link')}</span>
                  ${isFirst?`<span style="background:rgba(0,229,160,.15);color:var(--brand);font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid rgba(0,229,160,.3)">5★ REDIRECT</span>`:''}
                </div>
                <div style="font-size:11px;color:var(--lbl2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>
              </div>
              <div class="toggle${isActive?' on':''}" id="rl-tog-${realIdx}" onclick="window._rlToggle(${realIdx})"><div class="toggle-thumb"></div></div>
            </div>`;
          }).join('') +
          (!_rlExpanded && !_rlQuery && filtered.length > toShow.length
            ? `<div style="font-size:12px;color:var(--lbl3);text-align:center;padding:4px 0">${filtered.length - toShow.length} more — tap "Show All"</div>`
            : '');
    }

    window._rlToggleExpand = function() {
      _rlExpanded = !_rlExpanded;
      _rlRender();
    };

    window._rlSearch = function(q) {
      _rlQuery = q;
      _rlExpanded = q.length > 0;
      _rlRender();
    };

    // ── Review link handlers ────────────────────────────────────────────────
    window._rlToggle = function(i){
      reviewLinks[i].active = reviewLinks[i].active === false ? true : false;
      _rlRender();
    };

    // Direct add — no platform picker needed
    window._rlAdd = function(){
      showModal(`
        <div class="modal-head"><div class="modal-title">Add Review Link</div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;flex-direction:column;gap:14px;padding:0 20px 20px">
          <div>
            <div class="field-lbl">Label</div>
            <input class="inp" id="rl-label" placeholder="e.g. Google, Yelp, TripAdvisor"/>
          </div>
          <div>
            <div class="field-lbl">URL</div>
            <input class="inp" id="rl-url" placeholder="https://…"/>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._rlSave()">Add Link</button>
        </div>`);
      window._rlSave = function(){
        const label = document.getElementById('rl-label')?.value?.trim();
        const url   = document.getElementById('rl-url')?.value?.trim();
        if(!label){ showToast('Enter a label'); return; }
        if(!url){ showToast('Enter a URL'); return; }
        const fullUrl = url.startsWith('http') ? url : 'https://' + url;
        reviewLinks.push({ label, url: fullUrl, platform: label.toLowerCase(), active: true });
        closeModal(); draw();
      };
    };

    // ── Bulletin handlers ───────────────────────────────────────────────────
    window._rmBull=function(i){bulletinLinks.splice(i,1);drawBulletin();};
    window._addBull=function(){
      let bullImageData = undefined;
      showModal(`
        <div class="modal-head"><div class="modal-title">Add Bulletin Item</div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;flex-direction:column;gap:14px;padding:0 20px 20px">
          <div>
            <div class="field-lbl">Type</div>
            <select class="sel" id="bl-t" onchange="window._blTog(this.value)">
              <option value="text">Text Block</option>
              <option value="custom">Link</option>
              <option value="spotify">Spotify</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <div class="field-lbl">Title</div>
            <input class="inp" id="bl-l" placeholder="e.g. Happy Hour"/>
          </div>
          <div id="bl-uw" style="display:none">
            <div class="field-lbl">URL</div>
            <input class="inp" id="bl-u" placeholder="https://…"/>
          </div>
          <div id="bl-editor-wrap">
            <div class="field-lbl">Content</div>
            <div style="background:rgba(255,255,255,.05);border:1px solid var(--sep);border-radius:var(--r-sm);overflow:hidden">
              <div style="display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid var(--sep);flex-wrap:wrap">
                <button type="button" onclick="document.execCommand('bold')" style="background:none;border:none;color:var(--lbl);cursor:pointer;padding:4px 8px;border-radius:4px;font-weight:700;font-family:inherit;font-size:13px">B</button>
                <button type="button" onclick="document.execCommand('italic')" style="background:none;border:none;color:var(--lbl);cursor:pointer;padding:4px 8px;border-radius:4px;font-style:italic;font-family:inherit;font-size:13px">I</button>
                <button type="button" onclick="document.execCommand('underline')" style="background:none;border:none;color:var(--lbl);cursor:pointer;padding:4px 8px;border-radius:4px;text-decoration:underline;font-family:inherit;font-size:13px">U</button>
                <div style="width:1px;background:var(--sep);margin:2px 4px"></div>
                <button type="button" onclick="document.execCommand('formatBlock',false,'h2')" style="background:none;border:none;color:var(--lbl);cursor:pointer;padding:4px 8px;border-radius:4px;font-weight:700;font-family:inherit;font-size:13px">H</button>
                <button type="button" onclick="document.execCommand('insertUnorderedList')" style="background:none;border:none;color:var(--lbl);cursor:pointer;padding:4px 8px;border-radius:4px;font-family:inherit;font-size:13px">• List</button>
                <button type="button" onclick="document.execCommand('removeFormat')" style="background:none;border:none;color:var(--lbl2);cursor:pointer;padding:4px 8px;border-radius:4px;font-family:inherit;font-size:12px">Clear</button>
              </div>
              <div id="bl-editor" contenteditable="true"
                style="min-height:120px;padding:12px;color:var(--lbl);font-size:15px;line-height:1.6;outline:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif"></div>
            </div>
          </div>
          <div id="bl-img-wrap">
            <div class="field-lbl">Image (optional)</div>
            <div style="display:flex;gap:8px;align-items:center">
              <div id="bl-img-prev" style="width:48px;height:48px;border-radius:8px;background:var(--fill-ultra);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--lbl3);flex-shrink:0">+</div>
              <button onclick="window._pickBullImg()" class="btn btn-ghost btn-sm" style="flex:1">Upload Image</button>
            </div>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._doAddBull()">Add Item</button>
        </div>`);

      window._blTog=function(t){
        const uw=$('bl-uw');
        const ew=document.getElementById('bl-editor-wrap');
        const iw=document.getElementById('bl-img-wrap');
        if(uw)uw.style.display=t==='text'?'none':'block';
        if(ew)ew.style.display=t==='text'?'block':'none';
        if(iw)iw.style.display=t==='text'?'block':'none';
      };
      window._blTog('text');

      window._pickBullImg=function(){
        const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
        inp.onchange=e=>{
          const f=e.target.files[0];if(!f)return;
          const r=new FileReader();
          r.onload=ev=>{
            bullImageData=ev.target.result;
            const prev=document.getElementById('bl-img-prev');
            if(prev)prev.innerHTML=`<img src="${ev.target.result}" style="width:48px;height:48px;border-radius:8px;object-fit:cover"/>`;
          };r.readAsDataURL(f);
        };inp.click();
      };

      window._doAddBull=function(){
        const type=$('bl-t')?.value||'text';
        const label=$('bl-l')?.value?.trim()||'';
        let url=$('bl-u')?.value?.trim()||'';
        const html=document.getElementById('bl-editor')?.innerHTML?.trim()||'';
        if(!label){showToast('Title required');return;}
        if(type!=='text'&&!url){showToast('URL required');return;}
        if(url&&!url.startsWith('http'))url='https://'+url;
        const item={type,label,url,html:type==='text'?html:'',image:bullImageData||''};
        bulletinLinks.push(item);
        closeModal();drawBulletin();showToast('Added');
      };
    };

    // ── Shifts ────────────────────────────────────────────────────────────────
    function drawShiftsList(){
      const role = State.session?.role;
      if(!(role==='bizAdmin'||role==='owner')) return;
      const el = document.getElementById('s-shifts-list'); if(!el) return;
      const shifts = State.biz?.shifts || [];
      el.innerHTML = shifts.length
        ? shifts.map((sh,i)=>`
          <div style="display:flex;align-items:center;gap:10px;background:var(--sys-bg2);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:8px">
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600">${esc(sh.name)}</div>
              <div style="font-size:12px;color:var(--lbl3);margin-top:2px">${esc(sh.start)} – ${esc(sh.end)}</div>
            </div>
            <button onclick="window._rmShift('${sh.id}')" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:var(--r-xs);padding:5px 10px;font-size:12px;font-weight:600;color:var(--red);cursor:pointer;font-family:inherit">Remove</button>
          </div>`).join('')
        : `<div style="font-size:13px;color:var(--lbl3);margin-bottom:8px">No shifts yet.</div>`;
    }
    drawShiftsList();

    window._rmShift = async function(id){
      const shifts = (State.biz?.shifts||[]).filter(s=>s.id!==id);
      const bizId = State.session?.bizId||State.biz?.id;
      try {
        await API.business.update(bizId, { shifts });
        State.biz = {...State.biz, shifts};
        drawShiftsList();
        showToast('Shift removed');
      } catch(e){ showToast(e.message||'Failed'); }
    };

    window._addShift = function(){
      showModal(`
        <div class="modal-head"><div class="modal-title">Add Shift</div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;flex-direction:column;gap:14px;padding:0 20px 24px">
          <div>
            <div class="field-lbl">Shift Name</div>
            <input class="inp" id="sh-name" placeholder="e.g. Morning, Lunch, Dinner"/>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div class="field-lbl">Start Time</div>
              <input class="inp" id="sh-start" type="time" value="08:00"/>
            </div>
            <div>
              <div class="field-lbl">End Time</div>
              <input class="inp" id="sh-end" type="time" value="16:00"/>
            </div>
          </div>
          <button class="btn btn-primary btn-full" onclick="window._saveShift()">Add Shift</button>
        </div>`);
      window._saveShift = async function(){
        const name  = document.getElementById('sh-name')?.value?.trim();
        const start = document.getElementById('sh-start')?.value;
        const end   = document.getElementById('sh-end')?.value;
        if(!name){ showToast('Enter a shift name'); return; }
        if(!start||!end){ showToast('Set start and end times'); return; }
        const newShift = { id: Date.now().toString(36), name, start, end };
        const shifts = [...(State.biz?.shifts||[]), newShift];
        const bizId = State.session?.bizId||State.biz?.id;
        try {
          await API.business.update(bizId, { shifts });
          State.biz = {...State.biz, shifts};
          closeModal(); drawShiftsList(); showToast('Shift added');
        } catch(e){ showToast(e.message||'Failed'); }
      };
    };

    // Logo upload
    window._pickLogo=function(){
      const i=document.createElement('input');i.type='file';i.accept='image/*';
      i.onchange=e=>{
        const f=e.target.files[0];if(!f)return;
        const reader=new FileReader();
        reader.onload=function(ev){
          const dataUrl=ev.target.result;
          const img=new Image();
          img.onload=function(){
            const MAX=600;
            let w=img.width,h=img.height;
            if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
            if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
            const canvas=document.createElement('canvas');
            canvas.width=w;canvas.height=h;
            canvas.getContext('2d').drawImage(img,0,0,w,h);
            const compressed=canvas.toDataURL('image/jpeg',0.82);
            window._logoData=compressed;
            const li=$('s-logo');if(li)li.value='';
            let p=$('s-logo-prev');
            if(!p){p=document.createElement('img');p.id='s-logo-prev';
              p.style='height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block';
              $('s-logo').parentNode.insertAdjacentElement('afterend',p);}
            p.src=compressed;
          };
          img.onerror=function(){
            window._logoData=dataUrl;
            let p=$('s-logo-prev');
            if(!p){p=document.createElement('img');p.id='s-logo-prev';
              p.style='height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block';
              $('s-logo').parentNode.insertAdjacentElement('afterend',p);}
            p.src=dataUrl;
          };
          img.src=dataUrl;
        };
        reader.readAsDataURL(f);
      };i.click();
    };
  }

  const role = State.session?.role;
  const adminPinWrap = document.getElementById('s-adminpin-wrap');
  if (adminPinWrap && role === 'manager') adminPinWrap.style.display = 'none';

  window._savePins = async function() {
    const adminPin = document.getElementById('s-adminpin')?.value?.trim();
    const mgrPin   = document.getElementById('s-mgrpin')?.value?.trim();
    if (!adminPin && !mgrPin) { showToast('Enter at least one PIN'); return; }
    if (adminPin && adminPin.length < 4) { showToast('Admin PIN must be 4+ digits'); return; }
    if (mgrPin   && mgrPin.length < 4)   { showToast('Manager PIN must be 4+ digits'); return; }
    if (adminPin && mgrPin && adminPin === mgrPin) { showToast('PINs must be different'); return; }
    const updates = {};
    if (adminPin && role !== 'manager') updates.adminPin   = adminPin;
    if (mgrPin)                         updates.managerPin = mgrPin;
    const bizId = State.session?.bizId || State.biz?.id;
    try {
      await API.business.update(bizId, updates);
      showToast('PINs updated');
      const a = document.getElementById('s-adminpin'); if(a) a.value = '';
      const m = document.getElementById('s-mgrpin');   if(m) m.value = '';
    } catch(e) { showToast(e.message || 'Failed to update PINs'); }
  };

  window._saveBranding = async function(){
    const allowed={};
    ['spotify','phone','email','instagram','tiktok','custom'].forEach(t=>{allowed[t]=!!$('tog-'+t)?.classList.contains('on');});
    const logoUrl=window._logoData||$('s-logo')?.value?.trim()||b.logoUrl||'';
    const updates={
      reviewLinks: reviewLinks.filter(l => l.active !== false),
      branding:{
        ...b,
        name:        $('s-name')?.value?.trim()||b.name,
        tagline:     $('s-tag')?.value?.trim()||'',
        logoUrl,
        brandColor:  $('s-bc')?.value||'#00e5a0',
        bgColor:     $('s-bg')?.value||'#07080c',
        textColor:   $('s-tc')?.value||'#ffffff',
        ratingQuestion: $('s-q')?.value?.trim()||b.ratingQuestion,
        reviewPrompt:   $('s-rp')?.value?.trim()||b.reviewPrompt,
        thankYouMsg:    $('s-ty')?.value?.trim()||b.thankYouMsg,
        lowRatingMsg:   $('s-lr')?.value?.trim()||b.lowRatingMsg,
        bulletinLinks,
        allowedStaffLinks: allowed,
      }
    };
    try{
      const bizId=State.session?.bizId||State.biz?.id;
      const d=await API.business.update(bizId,updates);
      State.biz={...State.biz,...d.business};
      window._logoData=undefined;
      showToast('Branding saved');
      draw();
    }catch(e){showToast(e.message||'Save failed');}
  };

  window._toggleBranding = function() {
    brandingOpen = !brandingOpen;
    const sec = document.getElementById('branding-section');
    const chev = document.getElementById('branding-chevron');
    if (sec) sec.style.display = brandingOpen ? 'block' : 'none';
    if (chev) chev.style.transform = brandingOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  };

  draw();
}