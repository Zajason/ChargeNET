import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken.ts';
import { createSetupIntent, executePayment, savePaymentMethod } from '../controllers/paymentController.ts';

const router = Router();

router.use(verifyToken);

router.post('/create-setup-intent', createSetupIntent);
router.post('/save-method', savePaymentMethod);
router.post('/charge', executePayment);

export default router;
