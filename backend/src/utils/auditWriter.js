import AuditLog from '../models/AuditLog.js';
import { signChainedData } from './crypto.js';

// Mutex to prevent race conditions on the chain
let chainLock = Promise.resolve();

export const writeAuditLog = async (logEntry) => {
  // Serialize writes to maintain chain integrity
  chainLock = chainLock.then(async () => {
    // 1. Find the log with the highest valid numeric sequenceNumber
    const lastLogWithSeq = await AuditLog.findOne({ sequenceNumber: { $exists: true, $ne: null } })
      .sort({ sequenceNumber: -1 })
      .lean();

    // Fall back to latest log by insertion order (_id) if no sequenceNumber exists yet
    const lastLog = lastLogWithSeq || await AuditLog.findOne().sort({ _id: -1 }).lean();

    const previousHash = lastLog ? (lastLog.integritySignature || 'GENESIS') : 'GENESIS';
    const lastSeq = (lastLogWithSeq && typeof lastLogWithSeq.sequenceNumber === 'number' && !isNaN(lastLogWithSeq.sequenceNumber))
      ? lastLogWithSeq.sequenceNumber
      : -1;

    const sequenceNumber = lastSeq + 1;

    // Normalize entry before signing to ensure saved fields match signed fields
    const normalizedEntry = {
      action: logEntry.action,
      actor: logEntry.actor || null,
      actorDisplay: logEntry.actorDisplay || 'System',
      ipAddress: logEntry.ipAddress || null,
      timestamp: logEntry.timestamp || new Date(),
      details: logEntry.details || {}
    };

    // 2. Sign with chain context
    const signature = signChainedData(
      normalizedEntry,
      process.env.MASTER_KEY || 'default_master_key',
      previousHash,
      sequenceNumber
    );

    // 3. Write
    return AuditLog.create({
      ...normalizedEntry,
      previousHash,
      sequenceNumber,
      integritySignature: signature
    });
  });

  return chainLock;
};
