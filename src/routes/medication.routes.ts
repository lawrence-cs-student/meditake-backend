import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createMedicationSchema, updateMedicationSchema } from '../types/validation';
import * as medicationController from '../controllers/medication.controller';

const router = Router();
router.use(authenticate);

router.get('/', medicationController.list);
router.post('/', validate(createMedicationSchema), medicationController.create);
router.get('/:id', medicationController.getOne);
router.patch('/:id', validate(updateMedicationSchema), medicationController.update);
router.delete('/:id', medicationController.remove);

export { router as medicationRouter };