function renderSettingsTab(body) {
  const biz = State.biz;
  const b   = biz?.branding || {};
  const platformLinks = biz?.platformLinks || [];
  let reviewLinks = [...(biz?.reviewLinks || [])];
  let bulletinLinks = [...(b.bulletinLinks || [])];
  let dragIdx = null;

  function availablePlatforms() {
    const added = new Set(reviewLinks.map(l => l.platform));
    return platformLinks.filter(p => p.enabled && !added.has(p.platform));
  }
  function _platIcon(p, linkObj) {
    if (linkObj && linkObj.icon) return linkObj.icon;
    return {google:'🔍',yelp:'⭐',tripadvisor:'🦉',opentable:'🍽️',facebook:'👍',custom:'🔗'}[(p||'').toLowerCase()]||'🔗';
  }

  function draw() {
    const avail = availablePlatforms();
    body.innerHTML = `
      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:700;font-size:15px;margin-bottom:16px">🎨 Branding</div>

        <div class="field-lbl">Business Name</div>
        <input class="inp" id="s-name" value="${esc(b.name||biz?.name||'')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Tagline</div>
        <input class="inp" id="s-tag" value="${esc(b.tagline||'')}" placeholder="We Create Memories" style="margin-bottom:10px"/>

        <div class="field-lbl">Logo URL or Upload</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input class="inp" id="s-logo" value="${esc(b.logoUrl||'')}" placeholder="https://…" style="flex:1"/>
          <button onclick="window._pickLogo()" class="btn btn-ghost btn-sm">📷</button>
        </div>
        ${b.logoUrl?`<img src="${esc(b.logoUrl)}" id="s-logo-prev" style="height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block"/>`:''}

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
          <div><div class="field-lbl">Brand</div><input type="color" id="s-bc" value="${esc(b.brandColor||'var(--brand)')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
          <div><div class="field-lbl">Background</div><input type="color" id="s-bg" value="${esc(b.bgColor||'#07080c')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
          <div><div class="field-lbl">Text</div><input type="color" id="s-tc" value="${esc(b.textColor||'#ffffff')}" style="width:100%;height:42px;border:none;border-radius:var(--r-xs);background:transparent;cursor:pointer;padding:2px"/></div>
        </div>

        <div class="field-lbl">Rating Question</div>
        <input class="inp" id="s-q" value="${esc(b.ratingQuestion||'How was your experience today?')}" style="margin-bottom:10px"/>
        <div class="field-lbl">5★ Review Prompt</div>
        <input class="inp" id="s-rp" value="${esc(b.reviewPrompt||'Share your experience!')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Thank You (shown after 5★ before redirect)</div>
        <input class="inp" id="s-ty" value="${esc(b.thankYouMsg||'Thank you! Redirecting you now…')}" style="margin-bottom:10px"/>
        <div class="field-lbl">Low Rating Message</div>
        <input class="inp" id="s-lr" value="${esc(b.lowRatingMsg||"We're sorry to hear that.")}" style="margin-bottom:10px"/>
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px">⭐ Review Links</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:14px">First = 5★ auto-redirect · 4★ shows all · Drag to reorder</div>
        <div id="rl-list" style="margin-bottom:12px">
          ${reviewLinks.length===0
            ? `<div style="background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.1);border-radius:var(--r-md);padding:20px;text-align:center;color:var(--lbl2);font-size:13px">No review links yet. Tap + to add.</div>`
            : reviewLinks.map((l,i)=>`
              <div draggable="true" ondragstart="window._rlDs(${i})" ondragover="event.preventDefault()" ondrop="window._rlDr(${i})"
                style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid ${i===0?'rgba(0,229,160,.3)':'rgba(255,255,255,.07)'};border-radius:var(--r-md);padding:12px 14px;margin-bottom:8px;cursor:grab">
                <div style="font-size:16px;color:rgba(238,240,248,.2);user-select:none">⠿</div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span style="font-size:16px">${_platIcon(l.platform, l)}</span>
                    <span style="font-weight:700;font-size:14px">${esc(l.label||l.platform)}</span>
                    ${i===0?`<span style="background:rgba(0,229,160,.15);color:var(--brand);font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid rgba(0,229,160,.3)">5★ REDIRECT</span>`:''}
                  </div>
                  <div style="font-size:11px;color:var(--lbl2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>
                </div>
                <button onclick="window._rlRm(${i})" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:var(--r-xs);padding:5px 9px;font-size:12px;font-weight:700;color:var(--red);cursor:pointer;font-family:inherit;flex-shrink:0">✕</button>
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
        <div style="font-weight:700;font-size:15px;margin-bottom:4px">📌 Bulletin Board</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:12px">Extra links shown on every tap page</div>
        <div id="s-bulletin" style="margin-bottom:8px"></div>
        <button class="btn btn-ghost btn-full" onclick="window._addBull()">+ Add Bulletin Item</button>
      </div>

      <div class="plain-card" style="margin-bottom:10px">
        <div class="field-lbl">Staff Can Add</div>
        <div style="border-radius:var(--r-md);padding:4px 0">
          ${['spotify','phone','email','instagram','tiktok','custom'].map(t=>{
            const TL={spotify:'🎵 Spotify',phone:'📞 Phone',email:'✉️ Email',instagram:'📸 Instagram',tiktok:'🎵 TikTok',custom:'🔗 Custom'};
            const on=(b.allowedStaffLinks||{})[t];
            return`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px;font-weight:600">${TL[t]}</span><div class="toggle${on?' on':''}" id="tog-${t}" onclick="this.classList.toggle('on')"><div class="toggle-thumb"></div></div></div>`;
          }).join('')}
        </div>
      </div>

      <div style="background:var(--sys-bg2);border:none;border-radius:var(--r-md);padding:14px;margin-bottom:16px;text-align:center">
        <div class="field-lbl">Store Code</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:.2em;color:var(--brand)">${esc(biz?.storeCode)}</div>
        <div style="font-size:12px;color:var(--lbl2);margin-top:4px">Staff use this to log in</div>
      </div>

      <button onclick="window._saveBranding()" class="btn btn-primary btn-full">Save Branding</button>

      <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,.07)">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px">🔑 Change PINs</div>
        <div style="font-size:12px;color:var(--lbl2);margin-bottom:14px">Leave blank to keep current PIN</div>
        <div id="s-adminpin-wrap">
          <div class="field-lbl">New Admin PIN (4-6 digits)</div>
          <input class="inp" id="s-adminpin" type="number" inputmode="numeric" placeholder="Leave blank to keep" style="margin-bottom:10px"/>
        </div>
        <div class="field-lbl">New Manager PIN (4-6 digits)</div>
        <input class="inp" id="s-mgrpin" type="number" inputmode="numeric" placeholder="Leave blank to keep" style="margin-bottom:12px"/>
        <button onclick="window._savePins()" class="btn btn-ghost btn-full">Update PINs</button>
      </div>`;

    // Bulletin board
    function drawBulletin(){
      const el=$('s-bulletin');if(!el)return;
      el.innerHTML=bulletinLinks.length?bulletinLinks.map((l,i)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;background:var(--sys-bg2);border:none;border-radius:var(--r-sm);padding:10px 12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700">${esc(l.label)}</div>
            ${l.url?`<div style="font-size:11px;color:var(--lbl2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</div>`:''}
          </div>
          <button onclick="window._rmBull(${i})" style="background:rgba(255,68,85,.08);border:1px solid rgba(255,68,85,.2);border-radius:7px;padding:4px 8px;font-size:11px;font-weight:700;color:var(--red);cursor:pointer;font-family:inherit">✕</button>
        </div>`).join(''):`<div style="font-size:12px;color:var(--lbl2);margin-bottom:8px">No items yet.</div>`;
    }
    drawBulletin();

    // Drag handlers for review links
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
        <div style="display:flex;flex-direction:column;gap:10px">
          ${avail2.map((p,i)=>`
            <button onclick="window._rlPick(${i})"
              style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:var(--r-md);padding:14px 16px;cursor:pointer;text-align:left;font-family:inherit;width:100%">
              <div style="font-size:24px">${_platIcon(p.platform, p)}</div>
              <div style="min-width:0">
                <div style="font-weight:700;font-size:14px;color:#eef0f8">${esc(p.label||p.platform)}</div>
                <div style="font-size:11px;color:rgba(238,240,248,.35);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${esc(p.url)}</div>
              </div>
            </button>`).join('')}
        </div>`);
      window._rlPick=function(i){
        const p=avail2[i];
        reviewLinks.push({platform:p.platform,label:p.label||p.platform,url:p.url});
        closeModal(); draw();
      };
    };

    // Bulletin handlers
    window._rmBull=function(i){bulletinLinks.splice(i,1);drawBulletin();};
    window._addBull=function(){
      showModal(`
        <div class="modal-head"><div class="modal-title">Add Bulletin Item</div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div><div class="field-lbl">Type</div><select class="sel" id="bl-t" onchange="window._blTog(this.value)"><option value="custom">🔗 Link</option><option value="text">📝 Text Only</option><option value="spotify">🎵 Spotify</option></select></div>
          <div><div class="field-lbl">Title</div><input class="inp" id="bl-l" placeholder="e.g. Happy Hour 4-6pm"/></div>
          <div id="bl-uw"><div class="field-lbl">URL</div><input class="inp" id="bl-u" placeholder="https://…"/></div>
          <div><div class="field-lbl">Description (optional)</div><input class="inp" id="bl-s" placeholder="More details…"/></div>
          <button class="btn btn-primary btn-full" onclick="window._doAddBull()">Add</button>
        </div>`);
      window._blTog=function(t){const w=$('bl-uw');if(w)w.style.display=t==='text'?'none':'block';};
      window._doAddBull=function(){
        const type=$('bl-t')?.value||'custom',label=$('bl-l')?.value?.trim()||'';
        let url=$('bl-u')?.value?.trim()||'';const sub=$('bl-s')?.value?.trim()||'';
        if(!label){showToast('Title required');return;}
        if(type!=='text'&&!url){showToast('URL required');return;}
        if(url&&!url.startsWith('http'))url='https://'+url;
        bulletinLinks.push({type,label,url,sublabel:sub});closeModal();drawBulletin();showToast('Added ✓');
      };
    };

    // Logo upload
    window._pickLogo=function(){
      const i=document.createElement('input');i.type='file';i.accept='image/*';
      i.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
        r.onload=ev=>{window._logoData=ev.target.result;const li=$('s-logo');if(li)li.value='';
          let p=$('s-logo-prev');if(!p){p=document.createElement('img');p.id='s-logo-prev';
            p.style='height:48px;object-fit:contain;border-radius:var(--r-xs);margin-bottom:10px;display:block';
            $('s-logo').parentNode.insertAdjacentElement('afterend',p);}p.src=ev.target.result;};
        r.readAsDataURL(f);};i.click();};
  }

  // Hide admin PIN field for managers (they can only change manager PIN)
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
      showToast('PINs updated ✓');
      // Clear fields
      const a = document.getElementById('s-adminpin'); if(a) a.value = '';
      const m = document.getElementById('s-mgrpin');   if(m) m.value = '';
    } catch(e) { showToast(e.message || 'Failed to update PINs'); }
  };

  window._saveBranding = async function(){
    const allowed={};
    ['spotify','phone','email','instagram','tiktok','custom'].forEach(t=>{allowed[t]=!!$('tog-'+t)?.classList.contains('on');});
    const logoUrl=window._logoData||$('s-logo')?.value?.trim()||b.logoUrl||'';
    const updates={
      reviewLinks,
      branding:{
        ...b,
        name:        $('s-name')?.value?.trim()||b.name,
        tagline:     $('s-tag')?.value?.trim()||'',
        logoUrl,
        brandColor:  $('s-bc')?.value||'var(--brand)',
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
      showToast('Branding saved ✓');
      draw();
    }catch(e){showToast(e.message||'Save failed');}
  };

  draw();
}


// ── Owner Dashboard ───────────────────────────────────────────────────────────
