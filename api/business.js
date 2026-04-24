// api/business.js
// GET /api/business?slug=xxx - get business by slug
// GET /api/business?code=xxxx - get business by store code
// POST /api/business - create business (Firebase Auth required)
// PUT /api/business?id=xxx - update business (bizAdmin+)
// DELETE /api/business?id=xxx - delete business (superAdmin)

const { db, auth } = require('../lib/firebase');
const {
  handleCors, ok, err,
  getSession, requireRole,
  hashPin, toSlug, genCode, uid,
} = require('../lib/utils');

const COL = 'businesses';

// ── INPUT SANITIZATION ────────────────────────────────────────────────────────

function sanitizeStr(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, maxLen);
}

function sanitizePin(val) {
  if (typeof val !== 'string' && typeof val !== 'number') return '';
  return String(val).replace(/\D/g, '').slice(0, 6);
}

function sanitizeUrl(val, allowData = false) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  // Allow base64 data URLs for images (logo, staff photo)
  if (allowData && /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(trimmed)) {
    return trimmed.slice(0, 5 * 1024 * 1024); // 5MB cap
  }
  const clipped = trimmed.slice(0, 500);
  if (!/^https?:\/\//i.test(clipped)) return '';
  if (/^(javascript|vbscript):/i.test(clipped)) return '';
  return clipped;
}

function sanitizeColor(val) {
  if (typeof val !== 'string') return '';
  const match = val.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  return match ? val.trim() : '';
}

function sanitizeBranding(b) {
  if (!b || typeof b !== 'object') return {};
  return {
    name:               sanitizeStr(b.name, 100),
    tagline:            sanitizeStr(b.tagline, 150),
    logoUrl:            sanitizeUrl(b.logoUrl, true),  // allow data: URLs
    brandColor:         sanitizeColor(b.brandColor) || '#00e5a0',
    bgColor:            sanitizeColor(b.bgColor) || '#07080c',
    textColor:          sanitizeColor(b.textColor) || '#ffffff',
    ratingQuestion:     sanitizeStr(b.ratingQuestion, 200),
    reviewPrompt:       sanitizeStr(b.reviewPrompt, 300),
    thankYouMsg:        sanitizeStr(b.thankYouMsg, 300),
    lowRatingMsg:       sanitizeStr(b.lowRatingMsg, 300),
    bulletinLinks:      Array.isArray(b.bulletinLinks)
                          ? b.bulletinLinks.slice(0, 20).map(sanitizeBulletinLink).filter(Boolean)
                          : [],
    allowedStaffLinks:  sanitizeAllowedLinks(b.allowedStaffLinks),
  };
}

function sanitizeBulletinLink(l) {
  if (!l || typeof l !== 'object') return null;
  return {
    type:  l.type  ? sanitizeStr(l.type, 20)  : 'text',
    label: sanitizeStr(l.label, 80),
    url:   sanitizeUrl(l.url),
    html:  l.html  ? sanitizeStr(l.html, 5000) : '',
    image: l.image ? sanitizeUrl(l.image, true) : '',
  };
}

function sanitizeAllowedLinks(a) {
  if (!a || typeof a !== 'object') return {};
  const keys = ['spotify','phone','email','instagram','tiktok','custom'];
  const result = {};
  for (const k of keys) result[k] = Boolean(a[k]);
  return result;
}

function sanitizeLink(l) {
  if (!l || typeof l !== 'object') return null;
  const out = {
    label:    sanitizeStr(l.label, 80),
    url:      sanitizeUrl(l.url),
    platform: sanitizeStr(l.platform, 40),
    active:   typeof l.active === 'boolean' ? l.active : true,
  };
  if (l.icon) out.icon = sanitizeStr(l.icon, 10);
  return out;
}

function sanitizeLinks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 50).map(sanitizeLink).filter(Boolean);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

async function slugExists(slug, excludeId = null) {
  const snap = await db.collection(COL).where('slug', '==', slug).get();
  return snap.docs.some(d => d.id !== excludeId);
}

async function codeExists(code, excludeId = null) {
  const snap = await db.collection(COL).where('storeCode', '==', code).get();
  return snap.docs.some(d => d.id !== excludeId);
}

async function uniqueCode(excludeId = null) {
  let code, attempts = 0;
  do {
    code = genCode();
    attempts++;
    if (attempts > 20) throw new Error('Could not generate unique code');
  } while (await codeExists(code, excludeId));
  return code;
}

function sanitize(id, data, keepOwner = false) {
  const { adminPinHash, mgrPinHash, ownerId, ...safe } = data;
  const result = { id, ...safe };
  if (keepOwner && ownerId) result.ownerId = ownerId;
  return result;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  // ── GET ──────────────────────────────────────────────────────────────────

  if (req.method === 'GET') {
    const { slug, code, id } = req.query;

    if (id) {
      const doc = await db.collection(COL).doc(id).get();
      if (!doc.exists) return err(res, 'Business not found', 404);
      return ok(res, { business: sanitize(doc.id, doc.data()) });
    }

    if (slug) {
      const snap = await db.collection(COL).where('slug', '==', slug).limit(1).get();
      if (snap.empty) return err(res, 'Business not found', 404);
      const doc = snap.docs[0];
      return ok(res, { business: sanitize(doc.id, doc.data()) });
    }

    if (code) {
      const snap = await db.collection(COL).where('storeCode', '==', code).limit(1).get();
      if (snap.empty) return err(res, 'Invalid store code', 404);
      const doc = snap.docs[0];
      const d = doc.data();
      return ok(res, {
        business: {
          id: doc.id,
          name: d.name,
          slug: d.slug,
          branding: d.branding || {},
          platformLinks: d.platformLinks || [],
          reviewLinks: d.reviewLinks || [],
          links: d.links || [],
        }
      });
    }

    if (req.query.listAll) {
      const session = getSession(req);
      const guard = requireRole(session, 'superAdmin');
      if (guard) return err(res, guard.error, guard.status);

      try {
        const snap = await db.collection(COL).get();
        const businesses = snap.docs
          .map(d => sanitize(d.id, d.data(), true))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return ok(res, { businesses });
      } catch (e) {
        console.error('Business listAll error:', e.message);
        return err(res, 'Database error: ' + e.message, 500);
      }
    }

    return err(res, 'Provide slug, code, or id');
  }

  // ── POST ─────────────────────────────────────────────────────────────────

  if (req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    let uid_;

    try {
      const decoded = await auth.verifyIdToken(token);
      uid_ = decoded.uid;
    } catch {
      try {
        const session = getSession(req);
        if (session && (session.role === 'owner' || session.role === 'bizAdmin' || session.role === 'superAdmin')) {
          uid_ = session.uid || req.body?.ownerUid;
        }
        if (!uid_) return err(res, 'Invalid Firebase Auth token', 401);
      } catch {
        return err(res, 'Invalid Firebase Auth token', 401);
      }
    }

    const body = req.body || {};
    const name       = sanitizeStr(body.name, 100);
    const adminPin   = sanitizePin(body.adminPin);
    const managerPin = sanitizePin(body.managerPin);

    if (!name)                          return err(res, 'Business name required');
    if (!adminPin)                      return err(res, 'Admin PIN required');
    if (!managerPin)                    return err(res, 'Manager PIN required');
    if (adminPin.length < 4)            return err(res, 'PIN must be at least 4 digits');
    if (managerPin.length < 4)          return err(res, 'Manager PIN must be at least 4 digits');
    if (adminPin === managerPin)        return err(res, 'Admin and Manager PINs must be different');

    let slug = toSlug(name);
    if (await slugExists(slug)) slug = slug + '-' + uid().slice(0, 4);

    const storeCode = await uniqueCode();

    const bizData = {
      name,
      slug,
      storeCode,
      ownerId: uid_,
      adminPinHash: hashPin(adminPin),
      mgrPinHash: hashPin(managerPin),
      subscriptionStatus: 'inactive',
      branding: {
        name,
        tagline: '',
        logoUrl: '',
        brandColor: '#00e5a0',
        bgColor: '#07080c',
        textColor: '#ffffff',
        ratingQuestion: 'How was your experience today?',
        reviewPrompt: 'Glad to hear it! Share your experience:',
        thankYouMsg: 'Thank you! Your feedback means a lot.',
        lowRatingMsg: "We\'re sorry. Tell us what happened:",
        bulletinLinks: [],
        allowedStaffLinks: {
          spotify: true, phone: false, email: false,
          instagram: false, tiktok: false, custom: false,
        },
      },
      platformLinks: [],
      reviewLinks: [],
      links: [],
      teamGoals: [],
      createdAt: Date.now(),
    };

    const ref = await db.collection(COL).add(bizData);
    return ok(res, { business: sanitize(ref.id, bizData), message: 'Business created' }, 201);
  }

  // ── PUT ──────────────────────────────────────────────────────────────────

  if (req.method === 'PUT') {
    const session = getSession(req);
    const isManager  = session?.role === 'manager';
    const isBizAdmin = session?.role === 'bizAdmin' || session?.role === 'superAdmin';

    if (!isManager && !isBizAdmin) return err(res, 'Forbidden', 403);

    const { id } = req.query;
    if (!id) return err(res, 'Business ID required');

    if (session.role !== 'superAdmin' && session.bizId !== id) return err(res, 'Forbidden', 403);

    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) return err(res, 'Business not found', 404);

    const body = req.body || {};
    const updates = {};

    if (session.role === 'superAdmin' && body.ownerId !== undefined) {
      updates.ownerId = sanitizeStr(body.ownerId, 128);
    }

    if (isManager) {
      if (body.teamGoals !== undefined) {
        updates.teamGoals = Array.isArray(body.teamGoals)
          ? body.teamGoals.slice(0, 20).map(g => ({
              label:  sanitizeStr(g?.label, 100),
              target: typeof g?.target === 'number' ? g.target : 0,
            }))
          : [];
      }
    }

    if (isBizAdmin) {
      if (body.name !== undefined) {
        const newName = sanitizeStr(body.name, 100);
        if (!newName) return err(res, 'Business name cannot be empty');
        updates.name = newName;
        let newSlug = toSlug(newName);
        if (await slugExists(newSlug, id)) newSlug = newSlug + '-' + uid().slice(0, 4);
        updates.slug = newSlug;
      }
      if (body.branding      !== undefined) updates.branding      = sanitizeBranding(body.branding);
      if (body.links         !== undefined) updates.links         = sanitizeLinks(body.links);
      if (body.platformLinks !== undefined) updates.platformLinks = sanitizeLinks(body.platformLinks);
      if (body.reviewLinks   !== undefined) updates.reviewLinks   = sanitizeLinks(body.reviewLinks);
      if (body.teamGoals     !== undefined) {
        updates.teamGoals = Array.isArray(body.teamGoals)
          ? body.teamGoals.slice(0, 20).map(g => ({
              label:  sanitizeStr(g?.label, 100),
              target: typeof g?.target === 'number' ? g.target : 0,
            }))
          : [];
      }
      if (body.shifts !== undefined) {
        updates.shifts = Array.isArray(body.shifts)
          ? body.shifts.slice(0, 50).map(s => ({
              name:      sanitizeStr(s?.name, 80),
              startTime: sanitizeStr(s?.startTime, 10),
              endTime:   sanitizeStr(s?.endTime, 10),
              days:      Array.isArray(s?.days) ? s.days.filter(d => typeof d === 'string').slice(0, 7) : [],
            }))
          : [];
      }
      if (body.adminPin)   updates.adminPinHash = hashPin(sanitizePin(body.adminPin));
      if (body.managerPin) updates.mgrPinHash   = hashPin(sanitizePin(body.managerPin));
    }

    if (session.role === 'superAdmin' && body.subscriptionStatus !== undefined) {
      const allowed = ['active', 'inactive', 'canceled', 'past_due', 'trialing'];
      if (allowed.includes(body.subscriptionStatus)) {
        updates.subscriptionStatus = body.subscriptionStatus;
      }
    }

    updates.updatedAt = Date.now();

    try {
      await db.collection(COL).doc(id).update(updates);
      const updated = await db.collection(COL).doc(id).get();
      return ok(res, { business: sanitize(updated.id, updated.data()) });
    } catch (e) {
      console.error('Business update error:', e.message, e.code || '');
      const msg = /too large|maximum size|1 MiB|exceeds the max/i.test(e.message || '')
        ? 'Data too large to save (Firestore 1MB document limit). Try a smaller logo or fewer bulletin images.'
        : (e.message || 'Failed to update business');
      return err(res, msg, 500);
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────

  if (req.method === 'DELETE') {
    const session = getSession(req);
    const guard = requireRole(session, 'superAdmin');
    if (guard) return err(res, guard.error, guard.status);

    const { id } = req.query;
    if (!id) return err(res, 'Business ID required');

    const staffSnap = await db.collection(COL).doc(id).collection('staff').get();
    const batch = db.batch();
    staffSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await db.collection(COL).doc(id).delete();
    return ok(res, { message: 'Business deleted' });
  }

  return err(res, 'Method not allowed', 405);
};
