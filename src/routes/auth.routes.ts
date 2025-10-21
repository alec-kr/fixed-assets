import { Router } from 'express';
import { pool } from '../db';
import { createSession, setSessionCookie, clearSessionCookie, verifyPassword, requireAuth } from '../auth';

const router = Router();

// POST /auth/login { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const { rows } = await pool.query('select id, tenant_id, password_hash from users where email=$1', [email]);
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const sid = await createSession(u.id);
    setSessionCookie(res, sid);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const sid = (req as any).cookies?.sid;
    if (sid) await pool.query('delete from sessions where id=$1', [sid]);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /auth/me
router.get('/me', requireAuth, (req: any, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, tenantId: req.user.tenantId } });
});

export default router;
