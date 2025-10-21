import express from 'express';
import 'dotenv/config';
import router from './routes';
import { pool } from './db';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './auth';
import authRoutes from './routes/auth.routes';

const app = express();
const PORT = process.env.PORT || 3000;


// server.ts (middleware order)
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);            // must be before API routes

app.use('/auth', authRoutes);
app.use('/', router);               // <-- mount your API routes here (you were missing this)


// Simple request logger (optional)
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health checks
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

// in server.ts (after health routes, before app.use('/', router))
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


// Mount all API routes
app.use('/', router);

// Global error handler (catch-all)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
