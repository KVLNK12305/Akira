import APIKey from '../models/APIKey.js';

/**
 * Confused-Deputy Scoping Module (§29)
 * 
 * Prevents a low-privilege identity with read scope from accessing arbitrary keys
 * across tenant/team/owner boundaries.
 * 
 * Authorization is two-dimensional:
 * 1. Does the identity have the required MCP scope? (Evaluated in authorization.js)
 * 2. Is the specific target keyId within this identity's authorized domain? (Evaluated here)
 */

export const verifyCallerTargetAccess = async (caller, targetKeyId) => {
  if (!caller) {
    return {
      allowed: false,
      code: 'MISSING_CALLER_IDENTITY',
      reason: 'No bound caller identity provided for confused-deputy check'
    };
  }

  // If the target keyId is the caller's own identity, access to self is always permitted
  if (caller.id && String(caller.id) === String(targetKeyId)) {
    return {
      allowed: true,
      queryConstraint: { _id: targetKeyId }
    };
  }

  // If caller has administrative or SOC-wide governance scope
  const hasGlobalGovernance = (caller.scopes || []).some(s => 
    ['mcp:admin', 'admin', 'read:data', 'mcp:forensics:read'].includes(s)
  );

  // If caller has strict self-only flag
  if (caller.selfOnly) {
    return {
      allowed: false,
      code: 'CONFUSED_DEPUTY_SELF_ONLY',
      reason: `Calling identity [${caller.name || caller.id}] is restricted to self-inspection and cannot target key ${targetKeyId}`
    };
  }

  // Verify that the target exists and matches owner / tenant boundary
  try {
    const targetKey = await APIKey.findById(targetKeyId).select('owner name status');
    if (!targetKey) {
      return {
        allowed: false,
        code: 'TARGET_NOT_FOUND',
        reason: `Target key ${targetKeyId} does not exist`
      };
    }

    // If caller has an owner and is not global admin, enforce owner matching
    if (!hasGlobalGovernance && caller.owner && targetKey.owner) {
      if (String(caller.owner) !== String(targetKey.owner)) {
        return {
          allowed: false,
          code: 'CONFUSED_DEPUTY_BOUNDARY_VIOLATION',
          reason: `Access Denied: Target key [${targetKey.name}] belongs to another tenant/owner domain`
        };
      }
    }

    return {
      allowed: true,
      queryConstraint: { _id: targetKeyId, ...(caller.owner && !hasGlobalGovernance ? { owner: caller.owner } : {}) }
    };
  } catch (err) {
    return {
      allowed: false,
      code: 'CONFUSED_DEPUTY_LOOKUP_FAULT',
      reason: `Failed to verify confused-deputy authorization: ${err.message}`
    };
  }
};
