// src/db.ts
import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type PgCtx = { userId?: string; reqId?: string; reason?: string };

// Run a transaction and (optionally) set app.* context for audit
export async function withTx<T>(
  fn: (c: import('pg').PoolClient) => Promise<T>,
  ctx?: PgCtx
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    // Make GUCs transaction-local (reset on commit/rollback)
    if (ctx?.userId)     await client.query(`select set_config('app.user_id', $1, true)`, [ctx.userId]);
    if (ctx?.reqId)      await client.query(`select set_config('app.request_id', $1, true)`, [ctx.reqId]);
    if (ctx?.reason)     await client.query(`select set_config('app.reason', $1, true)`, [ctx.reason]);

    const r = await fn(client);
    await client.query('commit');
    return r;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

// Same idea, but always sets tenant; also accepts ctx for audit
export async function withTenant<T>(
  tenantId: string,
  fn: (c: import('pg').PoolClient) => Promise<T>,
  ctx?: PgCtx
) {
  const c = await pool.connect();
  try {
    await c.query('begin');

    await c.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
    if (ctx?.userId) await c.query(`select set_config('app.user_id', $1, true)`, [ctx.userId]);
    if (ctx?.reqId)  await c.query(`select set_config('app.request_id', $1, true)`, [ctx.reqId]);
    if (ctx?.reason) await c.query(`select set_config('app.reason', $1, true)`, [ctx.reason]);

    const result = await fn(c);
    await c.query('commit');
    return result;
  } catch (err) {
    await c.query('rollback');
    throw err;
  } finally {
    c.release();
  }
}
