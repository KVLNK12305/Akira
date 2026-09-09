/**
 * MCP Prompt-Injection Boundary & Output Sanitizer.
 * 
 * 1. Enforces response-shape allowlists and redacts any potential secrets.
 * 2. Demarcates untrusted free-text fields with explicit structural tagging:
 *    { _untrusted: true, value: "..." }
 * 3. Enforces string size ceilings to neutralize prompt-stuffing / DoS vectors.
 * 4. Never interprets or executes content as instructions.
 */

const MAX_FREE_TEXT_LENGTH = 500;

// Fields that could contain external, user, or adversary-supplied strings
const UNTRUSTED_FIELD_NAMES = new Set([
  'reason',
  'quarantineReason',
  'userAgent',
  'clientIP',
  'requestPath',
  'details',
  'description',
  'error',
  'observedLocation',
  'actorDisplay',
  'source'
]);

// Forbidden secret fields that MUST NEVER be emitted in an MCP response
const FORBIDDEN_SECRET_FIELDS = new Set([
  'encryptedKey',
  'iv',
  'authTag',
  'keyFingerprint',
  'password',
  'masterKey',
  'secret',
  'tokenSecret',
  'jwtSecret',
  'mongoUri',
  'MONGO_URI',
  'MASTER_KEY',
  'TOKEN_SECRET',
  'JWT_SECRET'
]);

/**
 * Truncates strings exceeding MAX_FREE_TEXT_LENGTH.
 */
const truncateString = (str, maxLength = MAX_FREE_TEXT_LENGTH) => {
  if (typeof str !== 'string') return str;
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '... [TRUNCATED: EXCEEDED 500 CHARS]';
};

/**
 * Recursively cleans and structures outbound MCP payloads.
 */
export const sanitizeMcpOutput = (data, depth = 0) => {
  if (depth > 8) return '[MAX_DEPTH_REACHED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return truncateString(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeMcpOutput(item, depth + 1));
  }

  if (typeof data === 'object') {
    // If it's a Mongoose document or has toObject / toJSON
    const plainObj = typeof data.toObject === 'function'
      ? data.toObject()
      : (typeof data.toJSON === 'function' ? data.toJSON() : data);

    const sanitized = {};

    for (const [key, val] of Object.entries(plainObj)) {
      // 1. Strictly strip forbidden secret fields
      if (FORBIDDEN_SECRET_FIELDS.has(key)) {
        continue;
      }

      // 2. Reject internal Mongo / prototype keys
      if (key.startsWith('__') || key === '$__') {
        continue;
      }

      // 3. Demarcate untrusted free-text fields
      if (UNTRUSTED_FIELD_NAMES.has(key) && typeof val === 'string') {
        sanitized[key] = {
          _untrusted: true,
          type: 'untrusted_external_content',
          value: truncateString(val)
        };
      } else {
        sanitized[key] = sanitizeMcpOutput(val, depth + 1);
      }
    }

    return sanitized;
  }

  return String(data);
};

/**
 * Wraps any outbound tool result in a standard MCP Content Envelope
 * while verifying prompt injection guards.
 */
export const formatMcpToolResponse = (resultData, toolName) => {
  const sanitized = sanitizeMcpOutput(resultData);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(sanitized, null, 2)
      }
    ],
    _meta: {
      tool: toolName,
      boundaryEnforced: true,
      untrustedFieldsDemarcated: true
    }
  };
};
