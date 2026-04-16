// api/accounts.js
// GET    /api/accounts  — list all Firebase Auth users (superAdmin only)
// DELETE /api/accounts  — delete a Firebase Auth user by uid
// PUT    /api/accounts  — update a user's email by uid

const { auth } = require('../lib/firebase');
const { handleCors, ok, err, getSession, requireRole } = require('../lib/utils');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const session = getSession(req);
  const guard   = requireRole(session, 'superAdmin');
  if (guard) return err(res, guard.error, guard.status);

  // ── GET — list all Firebase Auth users ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const users = [];
      let pageToken;
      do {
        const result = await auth.listUsers(1000, pageToken);
        result.users.forEach(u => {
          users.push({
            uid:           u.uid,
            email:         u.email || null,
            displayName:   u.displayName || null,
            createdAt:     u.metadata?.creationTime
              ? new Date(u.metadata.creationTime).getTime()
              : null,
            lastSignIn:    u.metadata?.lastSignInTime
              ? new Date(u.metadata.lastSignInTime).getTime()
              : null,
            emailVerified: u.emailVerified,
            disabled:      u.disabled,
          });
        });
        pageToken = result.pageToken;
      } while (pageToken);

      users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return ok(res, { users, total: users.length });
    } catch(e) {
      console.error('List users error:', e.message);
      return err(res, 'Failed to list users: ' + e.message, 500);
    }
  }

  // ── PUT — update a user's email ──────────────────────────────────────────
  if (req.method === 'PUT') {
    const { uid, email } = req.body || {};
    if (!uid)   return err(res, 'uid required');
    if (!email) return err(res, 'email required');
    if (!email.includes('@')) return err(res, 'Invalid email');

    try {
      await auth.updateUser(uid, { email });
      return ok(res, { message: 'Email updated', uid, email });
    } catch(e) {
      console.error('Update email error:', e.message);
      return err(res, 'Failed to update email: ' + e.message, 500);
    }
  }

  // ── DELETE — remove a Firebase Auth user ────────────────────────────────
  if (req.method === 'DELETE') {
    const { uid } = req.body || {};
    if (!uid) return err(res, 'uid required');

    try {
      await auth.deleteUser(uid);
      return ok(res, { message: 'User deleted', uid });
    } catch(e) {
      console.error('Delete user error:', e.message);
      return err(res, 'Failed to delete user: ' + e.message, 500);
    }
  }

  return err(res, 'Method not allowed', 405);
};