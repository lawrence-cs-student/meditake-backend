import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import * as eventController from '../controllers/event.controller';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', eventController.getToday);
router.patch(
  '/:id/status',
  validate(z.object({ status: z.enum(['taken', 'missed', 'skipped']) })),
  eventController.updateStatus
);

export { router as eventRouter };