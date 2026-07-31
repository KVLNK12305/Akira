import AuditLog from '../models/AuditLog.js';
import { signChainedData } from './crypto.js';

// Mutex to prevent race conditions on the chain
let chainLock = Promise.resolve();

export const writeAuditLog = async (logEntry) => {
  // Serialize writes to maintain chain integrity
  chainLock = chainLock.then(async () => {
    // 1. Get the latest log for chain linkage
    const lastLog = await AuditLog.findOne().sort({ sequenceNumber: -1 }).lean();

    const previousHash = lastLog ? lastLog.integritySignature : 'GENESIS';
    const sequenceNumber = lastLog ? lastLog.sequenceNumber + 1 : 0;

    // 2. Sign with chain context
    const signature = signChainedData(
      logEntry,
      process.env.MASTER_KEY,
      previousHash,
      sequenceNumber
    );

    // 3. Write
    return AuditLog.create({
      ...logEntry,
      previousHash,
      sequenceNumber,
      integritySignature: signature
    });
  });

  return chainLock;
};
