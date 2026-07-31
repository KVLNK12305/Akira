import express from 'express';
import { issueEphemeralToken, revokeEphemeralToken } from '../controllers/tokenController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Machine-facing: exchange root key for ephemeral token (no human JWT needed)
router.post('/issue', issueEphemeralToken);

// Human-facing: revoke a token (requires human JWT)
router.post('/revoke', verifyToken, revokeEphemeralToken);

export default router;
