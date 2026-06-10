import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import * as inventoryController from '../controllers/inventory.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', inventoryController.getInventory);
router.post(
  '/batches/:medicationPlanId',
  validate(z.object({ quantityReceived: z.number().int().min(1), expiryDate: z.string().optional() })),
  inventoryController.addBatch
);
router.get('/transactions/:medicationPlanId', inventoryController.getTransactions);

export { router as inventoryRouter };