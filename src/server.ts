import express from 'express';
import crypto from 'crypto';
import 'dotenv/config';
import cookieParser from 'cookie-parser';

import { pool } from './db';
import { authMiddleware } from './auth';
import authRoutes from './routes/auth.routes';
import router from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

/** ---- Core middleware (order matters) ---- */
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth first so req.user/tenantId are available
app.use(authMiddleware);

// ✅ Set Postgres audit ctx BEFORE any routes
app.use((req: any, _res, next) => {
  const userId =
    req.user?.id ||
    (req.headers['x-user-id'] as string) || // dev/testing fallback
    'anonymous';

  req._pgCtx = {
    userId,
    reqId: crypto.randomUUID(),
  };
  next();
});

// (Optional) very light request log
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url} uid=${(req as any)._pgCtx?.userId}`);
  next();
});

/** ---- Health & basic pages ---- */
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (err) {
    console.error('DB health check failed:', err);
    res.status(500).json({ ok: false });
  }
});

app.get('/', (_req, res) => {
  res.send(`<!doctype html>
  <h1>Fixed Assets</h1>
  <ul>
    <li><a href="/login.html">Sign in</a></li>
    <li><a href="/form.html">Create Asset</a></li>
    <li><a href="/list.html">Asset List</a></li>
    <li><a href="/edit.html">Edit Asset</a></li>
  </ul>`);
});

/** ---- Routes ---- */
app.use('/auth', authRoutes);
app.use('/', router); // mount once

/** ---- Global error handler ---- */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/** ---- Start ---- */
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
