import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// helper for transactions later
export async function withTx<T>(fn: (c: import('pg').PoolClient)=>Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('begin'); const r = await fn(client); await client.query('commit'); return r; }
  catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
}

export async function withTenant<T>(
  tenantId: string,
  fn: (c: import('pg').PoolClient) => Promise<T>
) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    // set transaction-local GUC using parameters
    await c.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
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
