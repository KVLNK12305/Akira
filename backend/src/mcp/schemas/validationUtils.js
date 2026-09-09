/**
 * Validation utilities for MCP input schemas.
 * Enforces strict JSON safety, prototype pollution prevention, and ID format verification.
 */

// MongoDB 24-character hexadecimal ObjectId regex
export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Checks for prototype pollution and NoSQL injection characters.
 * Rejects objects with '__proto__', 'constructor', 'prototype', or keys starting with '$'.
 */
export const assertSafeObject = (obj, path = 'root') => {
  if (obj === null || typeof obj !== 'object') return;

  // Reject functions or non-plain objects
  if (typeof obj === 'function') {
    throw new Error(`Security Violation: Functions not permitted in tool arguments at ${path}`);
  }

  // Detect prototype tampering or override
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null && !Array.isArray(obj)) {
    throw new Error(`Security Violation: Prototype tampering detected at ${path}`);
  }

  const protoKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (protoKeys.includes(key) || key.startsWith('$') || key.includes('.')) {
      throw new Error(`Security Violation: Illegal parameter key '${key}' detected at ${path}`);
    }
    const val = obj[key];
    if (val !== null && typeof val === 'object') {
      assertSafeObject(val, `${path}.${key}`);
    }
  }
};

/**
 * Asserts that a value is a valid 24-character hex ObjectId.
 */
export const assertValidKeyId = (keyId, fieldName = 'keyId') => {
  if (typeof keyId !== 'string' || !OBJECT_ID_REGEX.test(keyId)) {
    throw new Error(`Invalid parameter: '${fieldName}' must be a 24-character hexadecimal string`);
  }
};

/**
 * Asserts that an input object only contains allowlisted keys.
 */
export const assertStrictKeys = (obj, allowedKeys, toolName) => {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(`Invalid arguments for ${toolName}: expected JSON object`);
  }
  const inputKeys = Object.keys(obj);
  const unknownKeys = inputKeys.filter(k => !allowedKeys.includes(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Strict Schema Violation in ${toolName}: Unknown parameter(s) [${unknownKeys.join(', ')}]`);
  }
};
