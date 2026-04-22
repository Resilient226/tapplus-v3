// ── Firebase Storage upload (self-contained, no extra file needed) ─────────────
async function _uploadToStorage(dataUrl, path) {
  const BUCKET  = 'tapplus-a2d09.appspot.com';
  const BASE    = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o`;

  let authToken = null;
  try {
    if (window._fbAuth?.currentUser) {
      authToken = await window._fbAuth.currentUser.getIdToken();
    }
  } catch(e) {}

  // Convert base64 data URL → Blob
  const [header, b64] = dataUrl.split(',');
  const contentType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  const blob = new Blob([arr], { type: contentType });

  const encodedPath = encodeURIComponent(path);
  const uploadUrl   = `${BASE}/${encodedPath}?uploadType=media&name=${encodedPath}`;
  const headers     = { 'Content-Type': contentType };
  if (authToken) headers['Authorization'] = `Firebase ${authToken}`;

  const res = await fetch(uploadUrl, { method: 'POST', headers, body: blob });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Storage upload failed (${res.status})`);
  }
  const data = await res.json();
  return `${BASE}/${encodeURIComponent(data.name)}?alt=media&token=${data.downloadTokens}`;
}

window._uploadLogo = function(dataUrl, bizId) {
  const ext  = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const path = `logos/${bizId}_${Date.now()}.${ext}`;
  return _uploadToStorage(dataUrl, path);
};

window._uploadStaffPhoto = function(dataUrl, bizId, staffId) {
  const ext  = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const path = `staff/${bizId}_${staffId}_${Date.now()}.${ext}`;
  return _uploadToStorage(dataUrl, path);
};

window._uploadBulletinImage = function(dataUrl, bizId) {
  const ext  = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const path = `bulletin/${bizId}_${Date.now()}.${ext}`;
  return _uploadToStorage(dataUrl, path);
};

// settings.js — patched: logo upload now goes to Firebase Storage
// All other logic unchanged. Only _pickLogo and _saveBranding are modified.

function renderSettingsTab(body) {
  const biz = State.biz;
  const b   = biz?.branding || {};
  const platformLinks = biz?.platformLinks || [];
  let reviewLinks   = [...(biz?.reviewLinks || [])];
  let bulletinLinks = [...(b.bulletinLinks || [])];
  let dragIdx = null;

  function availablePlatforms() {
    const added = new Set(reviewLinks.map(l => l.platform));
    return platformLinks.filter(p => p.enabled && !added.has(p.platform));
  }
  function _platIcon(p, linkObj) {
    if (linkObj && linkObj.icon) return linkObj.icon;
    return { google:'G', yelp:'Y', tripadvisor:'TA', opentable:'OT', facebook:'FB', custom:'→' }[(p||'').toLowerCase()] || '→';
  }

  let brandingOpen = false;
  // _logoUrl holds the final URL (either existing or newly uploaded)
  // _logoUploading tracks upload state
  let _pendingLogoUrl = null;  // set after successful Storage upload
  let _logoUploading = false;

  function draw() {
    const avail = availablePlatforms();
    const biz = State.biz;
    const shifts = biz?.shifts || [];
    const role = State.session?.role;
    const isBizAdmin = role === 'bizAdmin' || role === 'superAdmin';

    body.innerHTML = `
      <!-- ── General Section ─────────────────────────────── -->
      <div class="sec-lbl">General</div>

      <!-- Store Code -->
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:20px;margin-bottom:10px;text-align:center">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--lbl3);margin-bottom:8px">Store Code</div>
        <div style="font-size:48px;font-weight:700;color:var(--brand);letter-spacing:.2em;font-variant-numeric:tabular-nums">${esc(biz?.storeCode||'----')}</div>
        <div style="font-size:13px;color:var(--lbl3);margin-top:6px">Staff use this to log in</div>
      </div>

      <!-- Change PINs -->
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

      <!-- Shift Schedule -->
      <div style="background:var(--bg2);border-radius:var(--r-lg);padding:18px;margin-bottom:10px">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Shift Schedule</div>
        <div style="font-size:13px;color:var(--lbl3);margin-bottom:16px">Define your recurring daily shifts</div>
        <div id="s-shifts-list"></div>
        <button class="btn btn-ghost btn-full" onclick="window._addShift()" style="border-radius:var(--r-lg)">+ Add Shift</button>
      </div>

      <!-- Branding toggle button -->
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

      <!-- Branding section (collapsible) -->
      <div id="branding-section" style="display:${brandingOpen?'block':'none'}">
      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:600;font-size:15px;margin-bottom:16px">Branding</div>

        <div class="field-lbl">Business Name</div>
        <input class="inp" id="s-name" value="${esc(b.name||biz?.name||'')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Tagline</div>
        <input class="inp" id="s-tag" value="${esc(b.tagline||'')}" placeholder="We Create Memories" style="margin-bottom:10px"/>

        <div class="field-lbl">Logo</div>
        <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">
          <input class="inp" id="s-logo" value="${esc(b.logoUrl||'')}" placeholder="https://…" style="flex:1"/>
          <button onclick="window._pickLogo()" class="btn btn-ghost btn-sm" id="s-logo-btn">Upload</button>
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
        <div style="font-weight:600;font-size:15px;margin-bottom:4px">Review Links</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:14px">First = 5★ auto-redirect · 4★ shows all · Drag to reorder</div>
        <div id="rl-list" style="margin-bottom:12px">
          ${reviewLinks.length===0
            ? `<div style="background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);border-radius:var(--r-md);padding:20px;text-align:center;color:var(--lbl2);font-size:13px">No review links yet.</div>`
            : reviewLinks.map((l,i)=>`
              <div draggable="true" ondragstart="window._rlDs(${i})" ondragover="event.preventDefault()" ondrop="window._rlDr(${i})"
                style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid ${i===0?'rgba(0,229,160,.3)':'rgba(255,255,255,.07)'};border-radius:var(--r-md);padding:12px 14px;margin-bottom:8px;cursor:grab">
                <div style="color:rgba(238,240,248,.2);user-select:none;font-size:14px">≡</div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span style="font-weight:600;font-size:14px">${esc(l.label||l.platform)}</span>
                    ${i===0?`<span style="background:rgba(0,229,160,.15);color:var(--brand);font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;border:1px solid rgba(0,229,160,.3)">5★ REDIRECT</span>`:''}
                  </div>
                  <div style="font-size:11px;color:var(--lbl2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>
                </div>
                <button onclick="window._rlRm(${i})" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:var(--r-xs);padding:5px 9px;font-size:12px;font-weight:600;color:var(--red);cursor:pointer;font-family:inherit;flex-shrink:0">Remove</button>
              </div>`).join('')
          }
        </div>
        ${avail.length>0
          ? `<button onclick="window._rlAdd()" class="btn btn-ghost btn-full" style="margin-bottom:4px">+ Add Review Platform</button>`
          : platformLinks.length===0
            ? `<div style="background:rgba(255,165,0,.06);border:1px solid rgba(255,165,0,.2);border-radius:var(--r-sm);padding:12px;font-size:12px;color:rgba(255,165,0,.8);text-align:center">No platforms configured — contact your administrator.</div>`
            : `<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:var(--r-sm);padding:10px;font-size:12px;color:var(--lbl2);text-align:center">All available platforms added.</div>`
        }
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:600;font-size:15px;margin-bottom:4px">Bulletin Board</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:12px">Shown on every tap page</div>
        <div id="s-bulletin" style="margin-bottom:8px"></div>
        <button class="btn btn-ghost btn-full" onclick="window._addBull()">+ Add Item</button>
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
      </div><!-- end branding section -->`;

    // ── Bulletin board list ─────────────────────────────────────────────────
    function drawBulletin(){
      const el=$('s-bulletin');if(!el)return;
      el.innerHTML=bulletinLinks.length?bulletinLinks.map((l,i)=>`
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;background:var(--sys-bg2);border-radius:var(--r-sm);padding:10px 12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${esc(l.label)}</div>
            ${l.image?`<img src="${esc(l.image)}" style="width:100%;border-radius:6px;margin-top:6px;max-height:80px;object-fit:cover"/>`:``}
            ${l.html?`<div style="font-size:11px;color:var(--lbl2);margin-top:4px;overflow:hidden;max-height:32px">${l.html}</div>`:l.url?`<div style="font-size:11px;color:var(--lbl2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${esc(l.url)}</div>`:''}
          </div>
          <button onclick="window._rmBull(${i})" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:7px;padding:4px 8px;font-size:11px;font-weight:600;color:var(--red);cursor:pointer;font-family:inherit;flex-shrink:0">Remove</button>
        </div>`).join(''):`<div style="font-size:12px;color:var(--lbl2);margin-bottom:8px">No items yet.</div>`;
    }
    drawBulletin();

    // ── Review link handlers ────────────────────────────────────────────────
    window._rlDs = function(i){ dragIdx=i; };
    window._rlDr = function(toIdx){
      if(dragIdx===null||dragIdx===toIdx)return;
      const moved=reviewLinks.splice(dragIdx,1)[0];
      reviewLinks.splice(toIdx,0,moved);
      dragIdx=null; draw();
    };
    window._rlRm = function(i){ reviewLinks.splice(i,1); draw(); };
    window._rlAdd = function(){
      const avail2=availablePlatforms();
      showModal(`
        <div class="modal-head"><div class="modal-title">Add Review Platform</div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:0 20px 20px">
          ${avail2.map((p,i)=>`
            <button onclick="window._rlPick(${i})"
              style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:var(--r-md);padding:14px 16px;cursor:pointer;text-align:left;font-family:inherit;width:100%">
              <div style="min-width:0">
                <div style="font-weight:600;font-size:14px;color:var(--lbl)">${esc(p.label||p.platform)}</div>
                <div style="font-size:11px;color:var(--lbl3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${esc(p.url)}</div>
              </div>
            </button>`).join('')}
        </div>`);
      window._rlPick=function(i){
        const p=avail2[i];
        reviewLinks.push({platform:p.platform,label:p.label||p.platform,url:p.url});
        closeModal(); draw();
      };
    };

    // ── Bulletin handlers ───────────────────────────────────────────────────
    window._rmBull=function(i){bulletinLinks.splice(i,1);drawBulletin();};
    window._addBull=function(){
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
              <button onclick="window._pickBullImg()" class="btn btn-ghost btn-sm" id="bl-img-btn" style="flex:1">Upload Image</button>
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

      // ── Bulletin image: upload to Storage ─────────────────────────────
      let _bullImageUrl = null;
      window._pickBullImg = async function(){
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = async function(e) {
          const f = e.target.files[0]; if (!f) return;
          const btn = document.getElementById('bl-img-btn');
          if (btn) { btn.textContent = 'Uploading…'; btn.disabled = true; }
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise((res, rej) => {
              reader.onload = ev => res(ev.target.result);
              reader.onerror = rej;
              reader.readAsDataURL(f);
            });
            // Compress
            const compressed = await _compressImage(dataUrl, 800, 0.82);
            const bizId = State.session?.bizId || State.biz?.id || 'unknown';
            _bullImageUrl = await window._uploadBulletinImage(compressed, bizId);
            const prev = document.getElementById('bl-img-prev');
            if (prev) prev.innerHTML = `<img src="${_bullImageUrl}" style="width:48px;height:48px;border-radius:8px;object-fit:cover"/>`;
            if (btn) { btn.textContent = 'Uploaded ✓'; btn.disabled = false; }
          } catch(err) {
            if (btn) { btn.textContent = 'Upload Image'; btn.disabled = false; }
            showToast('Image upload failed: ' + (err.message || 'try again'));
          }
        };
        inp.click();
      };

      window._doAddBull=function(){
        const type=$('bl-t')?.value||'text';
        const label=$('bl-l')?.value?.trim()||'';
        let url=$('bl-u')?.value?.trim()||'';
        const html=document.getElementById('bl-editor')?.innerHTML?.trim()||'';
        if(!label){showToast('Title required');return;}
        if(type!=='text'&&!url){showToast('URL required');return;}
        if(url&&!url.startsWith('http'))url='https://'+url;
        const item={type,label,url,html:type==='text'?html:'',image:_bullImageUrl||''};
        bulletinLinks.push(item);
        closeModal();drawBulletin();showToast('Added');
      };
    };

    // ── Shifts list ───────────────────────────────────────────────────────────
    function drawShiftsList(){
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
          closeModal();
          drawShiftsList();
          showToast('Shift added');
        } catch(e){ showToast(e.message||'Failed'); }
      };
    };

    // ── Logo upload → Firebase Storage ────────────────────────────────────
    window._pickLogo = function(){
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async function(e) {
        const f = e.target.files[0]; if (!f) return;
        const btn = document.getElementById('s-logo-btn');
        if (btn) { btn.textContent = 'Uploading…'; btn.disabled = true; }
        try {
          // Read file
          const reader = new FileReader();
          const dataUrl = await new Promise((res, rej) => {
            reader.onload = ev => res(ev.target.result);
            reader.onerror = rej;
            reader.readAsDataURL(f);
          });
          // Compress to max 600px
          const compressed = await _compressImage(dataUrl, 600, 0.82);
          // Upload to Firebase Storage
          const bizId = State.session?.bizId || State.biz?.id || 'unknown';
          const storageUrl = await window._uploadLogo(compressed, bizId);
          // Store the URL (not the base64)
          _pendingLogoUrl = storageUrl;
          // Update preview
          const logoInput = document.getElementById('s-logo');
          if (logoInput) logoInput.value = storageUrl;
          let prev = document.getElementById('s-logo-prev');
          if (!prev) {
            prev = document.createElement('img');
            prev.id = 's-logo-prev';
            prev.style = 'height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block';
            const logoWrap = document.getElementById('s-logo')?.parentNode;
            if (logoWrap) logoWrap.insertAdjacentElement('afterend', prev);
          }
          prev.src = storageUrl;
          if (btn) { btn.textContent = 'Uploaded ✓'; btn.disabled = false; }
          showToast('Logo uploaded ✓');
        } catch(err) {
          if (btn) { btn.textContent = 'Upload'; btn.disabled = false; }
          showToast('Upload failed: ' + (err.message || 'try again'));
          console.error('Logo upload error:', err);
        }
      };
      inp.click();
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

  // ── Save branding: logo is now a Storage URL, not base64 ──────────────────
  window._saveBranding = async function(){
    const allowed={};
    ['spotify','phone','email','instagram','tiktok','custom'].forEach(t=>{allowed[t]=!!$('tog-'+t)?.classList.contains('on');});

    // Priority: newly uploaded URL → manually typed URL → existing
    const logoUrl = _pendingLogoUrl
      || document.getElementById('s-logo')?.value?.trim()
      || b.logoUrl
      || '';

    const updates={
      reviewLinks,
      branding:{
        ...b,
        name:        $('s-name')?.value?.trim()||b.name,
        tagline:     $('s-tag')?.value?.trim()||'',
        logoUrl,                               // always a URL now, never base64
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
      _pendingLogoUrl = null;
      showToast('Branding saved ✓');
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

// ── Shared image compression utility ─────────────────────────────────────────
function _compressImage(dataUrl, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function() {
      let w = img.width, h = img.height;
      if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
      if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });