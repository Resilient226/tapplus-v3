async function renderTapPage(bizSlug, staffSlug) {
  showLoading();
  let biz;
  try { const d = await API.business.getBySlug(bizSlug); biz = d.business; }
  catch { showError('Business not found'); return; }

  const b = biz.branding || {};
  const brandColor = b.brandColor || '#00e5a0';
  const bgColor    = b.bgColor    || '#07080c';
  const textColor  = b.textColor  || '#ffffff';
  document.body.style.background = bgColor;

  var staffRec = null;
  try {
    var sr = await fetch('/api/staff?bizId=' + biz.id + '&public=1');
    if (sr.ok) {
      var sd = await sr.json();
      staffRec = (sd.staff || []).find(s => {
        var slug = (s.firstName + '-' + s.lastInitial).toLowerCase().replace(/[^a-z0-9-]/g, '');
        return slug === staffSlug || s.id === staffSlug;
      });
    }
  } catch(e) {}

  const ck   = 'tp_' + biz.id + '_' + staffSlug;
  const last = parseInt(sessionStorage.getItem(ck) || '0');
  const now  = Date.now();
  const dup  = now - last < 1800000;
  let tapId  = sessionStorage.getItem(ck + '_id') || null;
  if (!dup) {
    sessionStorage.setItem(ck, String(now));
    API.taps.log({ bizId: biz.id, bizSlug: biz.slug, staffId: staffSlug, staffName: staffSlug, status: 'tapped' })
      .then(d => { tapId = d.tap.id; sessionStorage.setItem(ck + '_id', tapId); })
      .catch(console.error);
  }

  const bulletinLinks = b.bulletinLinks || [];
  const reviewLinks   = biz.reviewLinks || biz.links || [];

  function linkRow(l) {
    const url = l.url || l.href || '';
    if (l.type === 'text') return `<div style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:18px 22px;margin-bottom:12px"><div style="font-weight:700;font-size:15px;letter-spacing:-.01em">${esc(l.label)}</div>${l.sublabel?`<div style="font-size:13px;opacity:.45;margin-top:5px">${esc(l.sublabel)}</div>`:''}</div>`;
    if (l.type === 'spotify') { const m=url.match(/spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/); if(m)return`<div style="width:100%;border-radius:16px;overflow:hidden;margin-bottom:12px"><iframe src="https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0" width="100%" height="80" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture" style="border-radius:16px;display:block"></iframe></div>`; }
    const ytId = (url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/))?.[1];
    if (ytId) return `<div style="width:100%;border-radius:16px;overflow:hidden;margin-bottom:12px;position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:16px;display:block"></iframe></div>`;
    const vmId = url.match(/vimeo\.com\/([0-9]+)/)?.[1];
    if (vmId) return `<div style="width:100%;border-radius:16px;overflow:hidden;margin-bottom:12px;position:relative;padding-top:56.25%"><iframe src="https://player.vimeo.com/video/${vmId}?color=${brandColor.replace('#','')}&byline=0&portrait=0" frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:16px;display:block"></iframe></div>`;
    const ICONS = {google:'🔍',yelp:'⭐',tripadvisor:'🦉',opentable:'🍽️',custom:'🔗',spotify:'🎵',phone:'📞',email:'✉️',instagram:'📸',tiktok:'🎵',youtube:'▶️',vimeo:'🎬'};
    const icon = ICONS[(l.type||l.platform||'').toLowerCase()]||'🔗';
    const href = l.type==='phone'?'tel:'+url:l.type==='email'?'mailto:'+url:url||'#';
    return `<a href="${esc(href)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:16px 20px;text-decoration:none;margin-bottom:12px"><div style="width:46px;height:46px;border-radius:14px;background:${esc(brandColor)}18;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${icon}</div><div style="flex:1;text-align:left"><div style="font-weight:700;font-size:15px;letter-spacing:-.01em;color:${esc(textColor)}">${esc(l.label||l.platform||'Link')}</div>${l.sublabel?`<div style="font-size:12px;opacity:.4;margin-top:3px">${esc(l.sublabel)}</div>`:''}</div><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 5l5 5-5 5" stroke="${esc(brandColor)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>`;
  }

  function updateStars(r) {
    for (let i = 1; i <= 5; i++) {
      const el = $('cs' + i);
      if (!el) continue;
      el.className = 'star' + (i <= r ? ' lit' : '');
      if (i === r) { el.style.transform = 'scale(1.35)'; setTimeout(() => { el.style.transform = ''; }, 220); }
    }
  }

  function afterRate(r) {
    const el = $('after'); if (!el) return;
    if (r === 5) {
      const primary = reviewLinks[0];
      el.innerHTML = `<div style="text-align:center;padding:32px 0 24px;animation:fadeUp .4s ease"><div style="font-size:52px;margin-bottom:18px">🙏</div><div style="font-size:22px;font-weight:900;letter-spacing:-.02em;margin-bottom:10px">${esc(b.thankYouMsg||'Thank you!')}</div>${primary?`<div style="font-size:14px;color:rgba(255,255,255,.35);font-weight:500">Taking you to ${esc(primary.label||primary.platform)}…</div>`:''}</div>`;
      if (tapId) API.taps.update(tapId, {rating:r, status:'rated'}).catch(console.error);
      if (primary) setTimeout(() => { window.location.href = primary.url; }, 1800);
    } else if (r === 4) {
      const lh = reviewLinks.length ? reviewLinks.map(l=>linkRow(l)).join('') : `<div style="padding:20px;text-align:center;color:rgba(255,255,255,.3);font-size:14px">No review links configured</div>`;
      el.innerHTML = `<div style="text-align:center;margin-bottom:24px;animation:fadeUp .3s ease"><div style="font-size:20px;font-weight:800;letter-spacing:-.02em">${esc(b.reviewPrompt||'Share your experience!')}</div></div>${lh}`;
      if (tapId) API.taps.update(tapId, {rating:r, status:'rated'}).catch(console.error);
    } else {
      el.innerHTML = `<div style="text-align:center;margin-bottom:24px;animation:fadeUp .3s ease"><div style="font-size:20px;font-weight:800;letter-spacing:-.02em">${esc(b.lowRatingMsg||"We're sorry to hear that.")}</div></div><textarea id="fb-t" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px;color:inherit;font-size:15px;font-family:'Nunito',sans-serif;outline:none;resize:none;min-height:110px;margin-bottom:14px;line-height:1.6" placeholder="Tell us what happened…"></textarea><button onclick="window._fb(${r})" style="width:100%;background:${esc(brandColor)};color:#07080c;border:none;border-radius:16px;padding:16px;font-size:16px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;letter-spacing:-.01em">Submit Feedback</button>`;
      window._fb = async function(rating) {
        const text = $('fb-t')?.value?.trim()||'';
        if (tapId) await API.taps.update(tapId, {rating, feedback:text, status:'rated'}).catch(console.error);
        el.innerHTML = `<div style="text-align:center;padding:32px 0;animation:fadeUp .4s ease"><div style="font-size:52px;margin-bottom:18px">🙏</div><div style="font-size:22px;font-weight:900;letter-spacing:-.02em">${esc(b.thankYouMsg||'Thank you for your feedback!')}</div></div>`;
      };
    }
  }

  window._cs = function(r) { updateStars(r); setTimeout(() => afterRate(r), 250); };
  window._toggleStaffCard = function() { var c=document.getElementById('staff-popup'); if(c) c.style.display=c.style.display==='none'?'block':'none'; };
  document.addEventListener('click', function(e) { var p=document.getElementById('staff-popup'),bu=document.getElementById('staff-bubble'); if(p&&bu&&!bu.contains(e.target)&&!p.contains(e.target))p.style.display='none'; });

  var staffBubbleHTML = staffRec ? (
    `<div id="staff-bubble" onclick="window._toggleStaffCard()" style="position:absolute;top:20px;right:20px;cursor:pointer;z-index:10">${staffRec.photo?`<img src="${esc(staffRec.photo)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2.5px solid ${esc(brandColor)};display:block;box-shadow:0 4px 16px rgba(0,0,0,.4)"/>`:`<div style="width:52px;height:52px;border-radius:50%;background:${esc(brandColor)}22;border:2.5px solid ${esc(brandColor)};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;color:${esc(brandColor)};box-shadow:0 4px 16px rgba(0,0,0,.4)">${(staffRec.firstName[0]+(staffRec.lastInitial||'')[0]).toUpperCase()}</div>`}</div><div id="staff-popup" style="display:none;position:absolute;top:80px;right:20px;background:#0e0f15;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:18px 20px;min-width:170px;max-width:250px;z-index:20;box-shadow:0 12px 40px rgba(0,0,0,.6)"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${staffRec.photo?`<img src="${esc(staffRec.photo)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>`:`<div style="width:40px;height:40px;border-radius:50%;background:${esc(brandColor)}22;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:${esc(brandColor)}">${(staffRec.firstName[0]+(staffRec.lastInitial||'')[0]).toUpperCase()}</div>`}<div><div style="font-weight:800;font-size:15px">${esc(staffRec.firstName+' '+staffRec.lastInitial+'.')}</div>${staffRec.title?`<div style="font-size:11px;color:${esc(brandColor)};font-weight:600;margin-top:2px">${esc(staffRec.title)}</div>`:''}</div></div>${(staffRec.links||[]).filter(l=>(b.allowedStaffLinks||{})[l.type]).map(l=>{const icons={spotify:'🎵',phone:'📞',email:'✉️',instagram:'📸',tiktok:'🎵',custom:'🔗'};const href=l.type==='phone'?'tel:'+l.url:l.type==='email'?'mailto:'+l.url:l.url;return`<a href="${esc(href)}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06);text-decoration:none"><span style="font-size:16px">${icons[l.type]||'🔗'}</span><span style="font-size:13px;font-weight:600;color:${esc(textColor)}">${esc(l.label||l.type)}</span></a>`;}).join('')}</div>`
  ) : '';

  app().innerHTML = `
    <style>
      body{background:${esc(bgColor)};color:${esc(textColor)}}
      .star{cursor:pointer;font-size:54px;line-height:1;transition:transform .2s cubic-bezier(.34,1.56,.64,1),opacity .2s,filter .2s;filter:grayscale(1);opacity:.22;user-select:none;-webkit-tap-highlight-color:transparent}
      .star.lit{filter:none;opacity:1}
      .star:active{transform:scale(1.15)}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    </style>
    <div style="position:relative;padding:36px 24px 60px;max-width:440px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;align-items:center">
      ${staffBubbleHTML}
      <div style="margin-top:24px;margin-bottom:40px;text-align:center;width:100%;animation:fadeUp .4s ease">
        ${b.logoUrl?`<img src="${esc(b.logoUrl)}" style="height:88px;max-width:240px;object-fit:contain;border-radius:18px"/>`:`<div style="font-size:30px;font-weight:900;letter-spacing:-.03em">${esc(b.name)}</div>`}
        ${b.tagline?`<div style="font-size:14px;opacity:.35;margin-top:10px;font-weight:500">${esc(b.tagline)}</div>`:''}
      </div>
      <div style="text-align:center;width:100%;margin-bottom:40px;animation:fadeUp .45s ease">
        <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1.3;margin-bottom:32px;padding:0 8px">${esc(b.ratingQuestion||'How was your experience today?')}</div>
        <div style="display:flex;gap:14px;justify-content:center;align-items:center">
          ${[1,2,3,4,5].map(i=>`<div id="cs${i}" class="star" onclick="window._cs(${i})">★</div>`).join('')}
        </div>
      </div>
      <div id="after" style="width:100%"></div>
      ${bulletinLinks.length?`<div style="width:100%;margin-top:24px"><div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.22;margin-bottom:18px;text-align:center">${esc(b.name||'')}</div>${bulletinLinks.map(l=>linkRow(l)).join('')}</div>`:''}
    </div>
    <div style="position:fixed;bottom:14px;left:0;right:0;text-align:center;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.07;pointer-events:none">POWERED BY TAP+</div>`;
}
