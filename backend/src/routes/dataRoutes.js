import express from 'express';
import { verifyApiKey } from '../middleware/apiKeyMiddleware.js';

const router = express.Router();

// Protected by API Key
router.get('/secret-report', verifyApiKey, (req, res) => {
  res.json({
    status: 'success',
    data: 'This is confidential data meant only for machines.',
    identity: `Authenticated as ${req.machine.name}`,
    scopes: req.machine.scopes
  });
});

export default router;