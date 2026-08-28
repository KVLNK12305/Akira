import express from 'express';
import {
  getRiskEvents,
  getRiskStats,
  getNHIProfile,
  getAllNHIProfiles,
  quarantineNHI,
  releaseNHI,
  getActiveContainments,
  simulateRiskAttack
} from '../controllers/riskController.js';
import { verifyToken, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Threat Intel & Risk Evaluation Endpoints (Protected by JWT)
router.get('/events', verifyToken, getRiskEvents);
router.get('/stats', verifyToken, getRiskStats);
router.get('/profiles', verifyToken, getAllNHIProfiles);
router.get('/profile/:keyId', verifyToken, getNHIProfile);

// Containment Controls
router.get('/containment/active', verifyToken, getActiveContainments);
router.post('/containment/:keyId/quarantine', verifyToken, quarantineNHI);
router.post('/containment/:keyId/release', verifyToken, releaseNHI);

// Demo / Simulation Trigger
router.post('/simulate-attack', verifyToken, simulateRiskAttack);

export default router;
