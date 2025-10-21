import type { PoolClient } from 'pg';
import Decimal from 'decimal.js';
import { z } from 'zod';

export const createAssetSchema = z.object({
  tenantId: z.preprocess((v) => String(v), z.string().uuid()),
  asset_tag: z.string().min(1),
  description: z.string().min(1),
  category_id: z.string().uuid(),
  acquisition_cost: z.string().regex(/^\d+(\.\d{1,4})?$/),
  currency: z.string().length(3),
  location_id: z.string().uuid()
});

export const updateAssetSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
  description: z.string().min(1).optional(),
  acquisition_cost: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  location_id: z.string().uuid().optional(),
}).refine(d => d.description || d.acquisition_cost || d.location_id, { message: 'Nothing to update' });

export async function createAsset(client: PoolClient, input: z.infer<typeof createAssetSchema>) {
  const cost = new Decimal(input.acquisition_cost).toFixed(4);
  const sql = `
    insert into assets
      (id, tenant_id, asset_tag, description, category_id, acquisition_cost, currency, location_id, status)
    values (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,'active')
    returning id, asset_tag, description
  `;
  const { rows } = await client.query(sql, [
    input.tenantId, input.asset_tag, input.description, input.category_id,
    cost, input.currency, input.location_id
  ]);
  return rows[0];
}

export async function updateAsset(client: PoolClient, input: z.infer<typeof updateAssetSchema>) {
  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (input.description) { sets.push(`description = $${i++}`); params.push(input.description); }
  if (input.acquisition_cost) {
    const cost = new Decimal(input.acquisition_cost).toFixed(4);
    sets.push(`acquisition_cost = $${i++}`); params.push(cost);
  }
  if (input.location_id) { sets.push(`location_id = $${i++}`); params.push(input.location_id); }

  params.push(input.id);

  const sql = `
    update assets
       set ${sets.join(', ')}, updated_at = now()
     where id = $${i}
     returning id, asset_tag, description, acquisition_cost, currency, location_id, created_at
  `;
  const { rows } = await client.query(sql, params);
  return rows[0] || null;
}

export async function listAssets(client: PoolClient, limit = 50) {
  const { rows } = await client.query(
    `select id, asset_tag, description, status
       from assets
       order by asset_tag
       limit $1`,
    [limit]
  );
  return rows;
}
