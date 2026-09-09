/**
 * Tool Risk Classification and Scope Policy (§11, §12)
 */

export const TOOL_RISK_CLASSES = {
  READ: 'READ',                     // Low risk
  INVESTIGATION: 'INVESTIGATION',   // Medium risk (heavier aggregation)
  SIMULATION: 'SIMULATION',         // Medium/High risk (triggers risk engine & containment)
  CONTAINMENT: 'CONTAINMENT'        // Critical risk (requires human-in-the-loop)
};

export const TOOL_DEFINITIONS = {
  get_nhi_profile: {
    name: 'get_nhi_profile',
    description: 'Retrieves the identity profile, registration metadata, and operational status for an authorized Non-Human Identity.',
    riskClass: TOOL_RISK_CLASSES.READ,
    requiredScopes: ['mcp:nhi:read'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: '24-character hexadecimal identifier of the NHI / API Key'
        }
      },
      required: ['keyId']
    }
  },

  get_risk_score: {
    name: 'get_risk_score',
    description: 'Fetches the current 0-100 real-time risk score, threat level, and containment status of a machine identity.',
    riskClass: TOOL_RISK_CLASSES.READ,
    requiredScopes: ['mcp:risk:read'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: '24-character hexadecimal identifier of the NHI / API Key'
        }
      },
      required: ['keyId']
    }
  },

  get_risk_events: {
    name: 'get_risk_events',
    description: 'Retrieves security incident reports and anomaly events evaluated by the AKIRA Risk Sentinel.',
    riskClass: TOOL_RISK_CLASSES.READ,
    requiredScopes: ['mcp:risk:read'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: 'Optional 24-char hex keyId to filter events for a specific identity'
        },
        level: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Filter events by risk level'
        },
        action: {
          type: 'string',
          enum: ['ALLOWED', 'FLAGGED', 'CONTAINED'],
          description: 'Filter events by containment outcome'
        },
        limit: {
          type: 'number',
          description: 'Max events to return (default 20, max 100)'
        },
        page: {
          type: 'number',
          description: 'Pagination offset page (1-indexed)'
        }
      }
    }
  },

  get_behavioral_baseline: {
    name: 'get_behavioral_baseline',
    description: 'Inspects learned behavioral baselines (typical working hours, normal endpoints, observed locations, and request velocity).',
    riskClass: TOOL_RISK_CLASSES.READ,
    requiredScopes: ['mcp:baseline:read'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: '24-character hexadecimal identifier of the NHI / API Key'
        }
      },
      required: ['keyId']
    }
  },

  investigate_nhi: {
    name: 'investigate_nhi',
    description: 'Compiles a complete forensic dossier for an identity aggregating profile, active credentials, recent risk events, and baseline deviations.',
    riskClass: TOOL_RISK_CLASSES.INVESTIGATION,
    requiredScopes: ['mcp:forensics:read', 'mcp:nhi:read'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: '24-character hexadecimal identifier of the NHI / API Key'
        },
        timeWindowHours: {
          type: 'number',
          description: 'Lookback window in hours (default 24, max 168)'
        }
      },
      required: ['keyId']
    }
  },

  simulate_attack: {
    name: 'simulate_attack',
    description: 'Executes a controlled attack scenario through the live AI Risk Sentinel against a simulation-eligible target identity.',
    riskClass: TOOL_RISK_CLASSES.SIMULATION,
    requiredScopes: ['mcp:simulation:execute'],
    inputSchema: {
      type: 'object',
      properties: {
        keyId: {
          type: 'string',
          description: '24-character hexadecimal identifier of a SIMULATION-ELIGIBLE machine identity'
        },
        attackScenario: {
          type: 'string',
          enum: [
            'PAYMENT_EXFILTRATION',
            'IMPOSSIBLE_TRAVEL',
            'COMPROMISED_KEY_BREACH',
            'UNAUTHORIZED_REFUND'
          ],
          description: 'Controlled adversary simulation scenario'
        }
      },
      required: ['keyId', 'attackScenario']
    }
  }
};
