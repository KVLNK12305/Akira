import express from 'express';
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../controllers/policyController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getPolicies);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router;
