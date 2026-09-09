import crypto from 'crypto';
import { authenticateSvidToken } from './auth.js';
import { createFailClosedError } from './policies/failure-policy.js';

/**
 * MCP Session Identity Manager (§10)
 * 
 * Binds an active MCP connection (SSE or stdio) to a verified SVID.
 * Enforces identity immutability and per-call re-verification.
 */
export class McpSession {
  constructor(sessionId = crypto.randomUUID()) {
    this.sessionId = sessionId;
    this.boundIdentityId = null;     // Immutable once set
    this.boundIdentityName = null;
    this.initialTokenJti = null;
    this.createdAt = new Date();
    this.lastActiveAt = new Date();
  }

  /**
   * Binds an initial SVID identity to the session.
   */
  async bindInitialIdentity(tokenString) {
    const identity = await authenticateSvidToken(tokenString);

    this.boundIdentityId = identity.id;
    this.boundIdentityName = identity.name;
    this.initialTokenJti = identity.jti;
    this.lastActiveAt = new Date();

    return identity;
  }

  /**
   * Re-validates the caller identity on EVERY tool invocation (§10.2, §10.4).
   * Ensures the session has not expired mid-flight and hasn't changed identity.
   */
  async validateActiveCall(tokenString) {
    this.lastActiveAt = new Date();

    const identity = await authenticateSvidToken(tokenString);

    // If session is already bound, assert that identity is immutable
    if (this.boundIdentityId) {
      if (String(identity.id) !== String(this.boundIdentityId)) {
        const hijackErr = new Error('Session Hijacking Attempt: Mid-session identity switch prohibited');
        hijackErr.code = 'IDENTITY_SWITCH_DETECTED';
        throw createFailClosedError('AUTH_VALIDATION', hijackErr);
      }
    } else {
      this.boundIdentityId = identity.id;
      this.boundIdentityName = identity.name;
    }

    return identity;
  }
}

// Session Registry for stateful transport (SSE / persistent connections)
const activeSessions = new Map();

export const getOrCreateSession = (sessionId) => {
  const sid = sessionId || crypto.randomUUID();
  if (!activeSessions.has(sid)) {
    activeSessions.set(sid, new McpSession(sid));
  }
  return activeSessions.get(sid);
};

export const terminateSession = (sessionId) => {
  activeSessions.delete(sessionId);
};
