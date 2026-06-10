import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getProfile, updateProfile } from '../controllers/user.controller';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../types/validation';

const router = Router();
router.use(authenticate);
router.get('/me', getProfile);
router.patch('/me', validate(updateProfileSchema), updateProfile);
export { router as userRouter };