import { Router } from 'express';
import { withTenant } from '../db';
import { createAsset, createAssetSchema, listAssets, updateAsset, updateAssetSchema } from '../assets';

const router = Router();

function getTenantId(req: any, res: any): string | undefined {
  const t = req.tenantId; // set by authMiddleware from session cookie
  if (!t) { res.status(401).json({ error: 'unauthenticated' }); return; }
  return t;
}


// POST /assets  (create)
router.post('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;

    const parsed = createAssetSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const asset = await withTenant(tenantId, async (c) => createAsset(c, parsed.data));
    res.status(201).json(asset);
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'asset_tag exists for tenant' });
    next(e);
  }
});

// GET /assets  (basic list)
router.get('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;
    const rows = await withTenant(tenantId, async () => listAssets(tenantId, 50));

    res.json(rows);
  } catch (e) { next(e); }
});

// GET /assets/list  (list with joins for table view)
router.get('/list', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;
    const rows = await withTenant(tenantId, async (c) => {
      const { rows } = await c.query(`
        select a.asset_tag, a.description, c.name as category,
               a.acquisition_cost, a.currency, l.name as location, a.created_at
          from assets a
          left join asset_categories c on a.category_id = c.id
          left join locations l on a.location_id = l.id
         order by a.created_at desc
      `);
      return rows;
    });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /assets/:id  (detail by id)
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;
    const row = await withTenant(tenantId, async (c) => {
      const { rows } = await c.query('select * from assets where id = $1', [req.params.id]);
      return rows[0];
    });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// PATCH /assets/:id  (update description/cost/location by id)
router.patch('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;
    const parsed = updateAssetSchema.safeParse({ tenantId, id: req.params.id, ...req.body });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await withTenant(tenantId, async (c) => updateAsset(c, parsed.data));
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

// GET /assets/by-tag/:tag  (detail by asset_tag)
router.get('/by-tag/:tag', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;
    const row = await withTenant(tenantId, async (c) => {
      const { rows } = await c.query('select * from assets where asset_tag = $1', [req.params.tag]);
      return rows[0];
    });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// PATCH /assets/by-tag/:tag  (update by tag; ignore empty fields)
router.patch('/by-tag/:tag', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req, res); if (!tenantId) return;

    const desc = typeof req.body.description === 'string' && req.body.description.trim() !== '' ? req.body.description.trim() : undefined;
    const cost = typeof req.body.acquisition_cost === 'string' && req.body.acquisition_cost.trim() !== '' ? req.body.acquisition_cost.trim() : undefined;
    const loc  = typeof req.body.location_id === 'string' && req.body.location_id.trim()  !== '' ? req.body.location_id.trim()  : undefined;

    if (!desc && !cost && !loc) return res.status(400).json({ error: 'Nothing to update' });

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (loc && !uuidRe.test(loc)) return res.status(400).json({ error: 'invalid location_id' });

    const sets: string[] = []; const params: any[] = []; let i = 1;
    if (desc) { sets.push(`description = $${i++}`);      params.push(desc); }
    if (cost) { sets.push(`acquisition_cost = $${i++}`); params.push(cost); }
    if (loc)  { sets.push(`location_id = $${i++}`);      params.push(loc); }

    const row = await withTenant(tenantId, async (c) => {
      params.push(req.params.tag);
      const { rows } = await c.query(
        `update assets
            set ${sets.join(', ')}, updated_at = now()
          where asset_tag = $${i}
          returning id, asset_tag, description, acquisition_cost, currency, location_id, updated_at`,
        params
      );
      return rows[0];
    });

    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) { next(e); }
});

export default router;
