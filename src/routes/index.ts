import { Router } from 'express';
import assetRoutes from './asset.routes';
import categoryRoutes from './category.routes';
import locationRoutes from './location.routes';
import currencyRoutes from './currency.routes';

const router = Router();
router.use('/assets', assetRoutes);
router.use('/categories', categoryRoutes);
router.use('/locations', locationRoutes);
router.use('/currencies', currencyRoutes);

export default router;
