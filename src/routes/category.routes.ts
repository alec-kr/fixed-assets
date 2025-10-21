import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'select id, code, name from asset_categories order by name'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
