import { pool, withTenant } from './db';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_HOURS = 24;

export async function createSession(userId: string) {
  const { rows } = await pool.query(
    `insert into sessions (user_id, expires_at)
     values ($1, now() + interval '${SESSION_TTL_HOURS} hours')
     returning id`, [userId]);
  return rows[0].id as string;
}

export async function getSession(sessionId: string) {
  const { rows } = await pool.query(`
    select s.id, s.expires_at, u.id as user_id, u.email, u.tenant_id
      from sessions s
      join users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now()`, [sessionId]);
  return rows[0] || null;
}

export async function destroySession(sessionId: string) {
  await pool.query('delete from sessions where id=$1', [sessionId]);
}

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true, sameSite: 'strict', secure: false, // set secure:true in prod HTTPS
    maxAge: 1000 * 60 * 60 * SESSION_TTL_HOURS
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'strict', secure: false });
}

/** Middleware: load session → attach req.user + req.tenantId */
export async function authMiddleware(req: Request & { user?: any; tenantId?: string }, res: Response, next: NextFunction) {
  try {
    const sid = req.cookies?.[SESSION_COOKIE];
    if (!sid) return next();
    const sess = await getSession(sid);
    if (!sess) return next();
    req.user = { id: sess.user_id, email: sess.email, tenantId: sess.tenant_id };
    req.tenantId = sess.tenant_id;
    next();
  } catch (e) { next(e); }
}

/** Require auth for protected routes */
export function requireAuth(req: Request & { tenantId?: string }, res: Response, next: NextFunction) {
  if (!req.tenantId) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

/** Password utils */
export async function hashPassword(pw: string) { return bcrypt.hash(pw, 10); }
export async function verifyPassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }
