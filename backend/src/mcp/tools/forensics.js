import { investigateNHI } from '../../services/nhiService.js';
import { validateForensicsInput } from '../schemas/forensics.schema.js';
import { createFailClosedError } from '../policies/failure-policy.js';

/**
 * MCP Tool Handler: investigate_nhi
 */
export const handleInvestigateNhi = async (rawArgs, context = {}) => {
  const { keyId, timeWindowHours } = validateForensicsInput(rawArgs);

  try {
    const dossier = await investigateNHI(keyId, { timeWindowHours });
    if (!dossier) {
      const err = new Error(`Identity not found for forensic investigation: ${keyId}`);
      err.code = 'IDENTITY_NOT_FOUND';
      throw err;
    }
    return dossier;
  } catch (err) {
    if (err.code === 'IDENTITY_NOT_FOUND') throw err;
    throw createFailClosedError('DATA_STORE', err);
  }
};
