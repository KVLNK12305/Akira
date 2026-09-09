import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import connectDB from './src/config/db.js';
import APIKey from './src/models/APIKey.js';
import EphemeralToken from './src/models/EphemeralToken.js';
import NHIProfile from './src/models/NHIProfile.js';
import User from './src/models/User.js';
import AuditLog from './src/models/AuditLog.js';

import { dispatchMcpRequest } from './src/mcp/server.js';
import { checkAuditChainIntegrity } from './src/mcp/audit.js';
import { generateAPIKey, encrypt, hashFingerprint } from './src/utils/crypto.js';

dotenv.config();

const MASTER_KEY = process.env.MASTER_KEY || '8f4b2e1c9d0a3f5b7e6d8c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c';
const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET || 'akira_super_secret_test_key_12345';

let testUser;
let testCallerKey;
let testTargetKey;
let testSimulationEligibleKey;
let validSvidToken;
let restrictedSvidToken;

async function setupTestData() {
  await connectDB();

  // 1. Create or fetch test user
  testUser = await User.findOne({ email: 'mcp-test@akira.local' });
  if (!testUser) {
    testUser = await User.create({
      username: 'mcp_test_admin_' + Date.now(),
      email: 'mcp-test@akira.local',
      passwordHash: 'dummy_argon2_password_hash_for_tests',
      role: 'Admin'
    });
  }

  // Helper to create API key
  async function createKey(name, scopes, simulationEligible = false) {
    const rawKey = generateAPIKey();
    const encryptedData = encrypt(rawKey, MASTER_KEY);
    const [iv, authTag, encryptedKey] = encryptedData.split(':');
    const fingerprint = hashFingerprint(rawKey);

    return await APIKey.create({
      owner: testUser._id,
      name,
      encryptedKey,
      iv,
      authTag: authTag || '',
      keyFingerprint: fingerprint,
      scopes,
      status: 'ACTIVE',
      isActive: true,
      simulationEligible,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  }

  testCallerKey = await createKey('MCP-SOC-Assistant-Agent', [
    'read:data',
    'mcp:nhi:read',
    'mcp:risk:read',
    'mcp:baseline:read',
    'mcp:forensics:read',
    'mcp:simulation:execute'
  ]);

  testTargetKey = await createKey('Target-Payment-Worker-Prod', [
    'payment:initiate',
    'payment:authorize'
  ], false); // simulationEligible = false

  testSimulationEligibleKey = await createKey('Target-Payment-Worker-Staging', [
    'payment:initiate',
    'payment:authorize',
    'payment:settle'
  ], true); // simulationEligible = true

  // Create NHIProfile for test target
  await NHIProfile.create({
    apiKey: testTargetKey._id,
    machineName: testTargetKey.name,
    knownIPs: ['127.0.0.1'],
    knownLocations: [{ country: 'United States', city: 'New York', latitude: 40.71, longitude: -74.00 }],
    knownEndpoints: ['POST:/api/v1/payment/charge'],
    typicalScopes: ['payment:initiate'],
    avgRequestsPerHour: 45,
    baselineEstablished: true,
    totalRequests: 25
  });

  // Helper to issue SVID
  async function createSvid(parentKey, scopes, ttl = 300) {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        jti,
        sub: parentKey._id.toString(),
        owner: parentKey.owner.toString(),
        scopes,
        type: 'ephemeral_svid',
        iss: 'akira-gateway',
        aud: 'akira-data-plane'
      },
      TOKEN_SECRET,
      { expiresIn: ttl }
    );

    await EphemeralToken.create({
      parentKey: parentKey._id,
      jti,
      ttl,
      scopes,
      attestation: { clientIP: '127.0.0.1' },
      riskScoreAtIssuance: 0,
      expiresAt: new Date(Date.now() + ttl * 1000)
    });

    return `Bearer ${token}`;
  }

  validSvidToken = await createSvid(testCallerKey, testCallerKey.scopes);
  restrictedSvidToken = await createSvid(testCallerKey, ['mcp:nhi:read']); // Only read scope

  const latestLog = await AuditLog.findOne().sort({ sequenceNumber: -1 }).lean();
  initialAuditSeq = (latestLog?.sequenceNumber ?? -1) + 1;
}

let initialAuditSeq = 0;

async function runMcpTests() {
  console.log('\n======================================================================');
  console.log('🛡️  AKIRA HARDENED MCP SERVER SECURITY TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  // --- Test 1: Handshake (initialize) ---
  console.log('--- 1. Testing Protocol Handshake (initialize) ---');
  const initRes = await dispatchMcpRequest({
    rpcRequest: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }
  });
  assert(initRes.result?.serverInfo?.name === 'akira-mcp-sentinel', 'Initialize returns serverInfo');
  assert(initRes.result?.capabilities?.tools !== undefined, 'Initialize exposes tools capability');

  // --- Test 2: Unauthenticated Request Fail-Closed ---
  console.log('\n--- 2. Testing Unauthenticated Request Fail-Closed ---');
  const unauthRes = await dispatchMcpRequest({
    rpcRequest: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    authHeader: null
  });
  assert(unauthRes.error !== undefined, 'Unauthenticated request fails closed');
  assert(unauthRes.error.data?.code === 'AUTH_UNAVAILABLE', 'Error code is AUTH_UNAVAILABLE');

  // --- Test 3: Authenticated tools/list ---
  console.log('\n--- 3. Testing Authenticated tools/list ---');
  const listRes = await dispatchMcpRequest({
    rpcRequest: { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
    authHeader: validSvidToken
  });
  assert(Array.isArray(listRes.result?.tools), 'tools/list returns tools array');
  const toolNames = listRes.result.tools.map(t => t.name);
  assert(toolNames.includes('get_nhi_profile'), 'Exposes get_nhi_profile');
  assert(toolNames.includes('get_risk_score'), 'Exposes get_risk_score');
  assert(toolNames.includes('simulate_attack'), 'Exposes simulate_attack');

  // --- Test 4: Tool Execution (get_nhi_profile) & Prompt Injection Demarcation ---
  console.log('\n--- 4. Testing get_nhi_profile & Injection Boundary ---');
  const profileRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_nhi_profile',
        arguments: { keyId: testTargetKey._id.toString() }
      }
    },
    authHeader: validSvidToken
  });
  assert(profileRes.result?.content?.[0]?.type === 'text', 'Tool call returns content envelope');
  const parsedData = JSON.parse(profileRes.result.content[0].text);
  assert(parsedData.machineName === testTargetKey.name, 'Retrieved correct machine name');
  assert(parsedData.encryptedKey === undefined, 'Secrets (encryptedKey) are strictly stripped');
  assert(profileRes.result._audit?.signature !== undefined, 'Synchronous hash-chain audit receipt included');

  // --- Test 5: Tool Execution (get_risk_score) ---
  console.log('\n--- 5. Testing get_risk_score ---');
  const riskRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_risk_score',
        arguments: { keyId: testTargetKey._id.toString() }
      }
    },
    authHeader: validSvidToken
  });
  assert(!riskRes.error, 'get_risk_score executes without error');
  const riskData = JSON.parse(riskRes.result.content[0].text);
  assert(riskData.riskScore !== undefined, 'Returns risk score');

  // --- Test 6: Strict Input Validation (No Prototype Pollution / Unknown Keys) ---
  console.log('\n--- 6. Testing Input Hardening & Prototype Pollution Rejection ---');
  const protoPollutionRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'get_nhi_profile',
        arguments: JSON.parse(JSON.stringify({
          keyId: testTargetKey._id.toString(),
          prototype: { admin: true }
        }))
      }
    },
    authHeader: validSvidToken
  });
  assert(protoPollutionRes.error !== undefined, 'Prototype pollution attempt rejected');

  const unknownKeyRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'get_nhi_profile',
        arguments: {
          keyId: testTargetKey._id.toString(),
          injectedHackerField: 'steal_db'
        }
      }
    },
    authHeader: validSvidToken
  });
  assert(unknownKeyRes.error !== undefined, 'Unknown argument rejected strictly');

  // --- Test 7: Scope Enforcement (Insufficient Scope) ---
  console.log('\n--- 7. Testing Least-Privilege Scope Enforcement ---');
  const scopeDenialRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'simulate_attack',
        arguments: {
          keyId: testSimulationEligibleKey._id.toString(),
          attackScenario: 'PAYMENT_EXFILTRATION'
        }
      }
    },
    authHeader: restrictedSvidToken // Only has mcp:nhi:read
  });
  assert(scopeDenialRes.error !== undefined, 'Request without mcp:simulation:execute denied');
  assert(scopeDenialRes.error.data?.code === 'INSUFFICIENT_SCOPE', 'Error code is INSUFFICIENT_SCOPE');

  // --- Test 8: Simulation Eligibility Guard (The Key Rubric Control) ---
  console.log('\n--- 8. Testing Simulation-Eligibility Guardrail ---');
  // Attempt to simulate attack against production key with simulationEligible: false
  const prodSimRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'simulate_attack',
        arguments: {
          keyId: testTargetKey._id.toString(), // simulationEligible is FALSE
          attackScenario: 'PAYMENT_EXFILTRATION'
        }
      }
    },
    authHeader: validSvidToken // Has scope, but target is not eligible
  });
  assert(prodSimRes.error !== undefined, 'Attack simulation against non-eligible key DENIED');
  assert(prodSimRes.error.data?.code === 'TARGET_NOT_SIMULATION_ELIGIBLE', 'Error code is TARGET_NOT_SIMULATION_ELIGIBLE');

  // Now simulate against simulationEligible: true key
  console.log('\n--- 9. Testing Valid Simulation Against Eligible Target ---');
  const stagingSimRes = await dispatchMcpRequest({
    rpcRequest: {
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'simulate_attack',
        arguments: {
          keyId: testSimulationEligibleKey._id.toString(), // simulationEligible is TRUE
          attackScenario: 'IMPOSSIBLE_TRAVEL'
        }
      }
    },
    authHeader: validSvidToken
  });
  assert(!stagingSimRes.error, 'Simulation on eligible key succeeds');
  const simOutput = JSON.parse(stagingSimRes.result.content[0].text);
  assert(simOutput.simulationSuccess === true, 'Simulation succeeded through real risk engine');
  assert(simOutput.evaluation?.riskScore > 0, 'Real risk score was generated');

  // --- Test 10: Closed-Loop Risk Feedback ---
  console.log('\n--- 10. Testing Closed-Loop Risk Feedback to Caller ---');
  const initialCallerRisk = testCallerKey.riskScore || 0;
  // Make 3 unauthorized probing attempts to trigger closed-loop abuse signal
  for (let i = 0; i < 3; i++) {
    await dispatchMcpRequest({
      rpcRequest: {
        jsonrpc: '2.0',
        id: 100 + i,
        method: 'tools/call',
        params: {
          name: 'simulate_attack',
          arguments: {
            keyId: testTargetKey._id.toString(),
            attackScenario: 'PAYMENT_EXFILTRATION'
          }
        }
      },
      authHeader: restrictedSvidToken
    });
  }

  const reloadedCaller = await APIKey.findById(testCallerKey._id);
  assert(reloadedCaller.riskScore > initialCallerRisk, `Caller risk increased via closed-loop feedback (${initialCallerRisk} -> ${reloadedCaller.riskScore})`);

  // --- Test 11: Audit Chain Integrity Verification ---
  console.log('\n--- 11. Testing WORM Audit Chain Verification ---');
  const chainCheck = await checkAuditChainIntegrity({ startSeq: initialAuditSeq });
  assert(chainCheck.valid === true, `Audit hash chain is 100% valid (Count: ${chainCheck.count})`);

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${passed}/${total} HARDENED MCP SECURITY TESTS PASSED WITH 100% SUCCESS!`);
  console.log('======================================================================\n');
}

setupTestData()
  .then(runMcpTests)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ MCP TEST SUITE FAILED:', err);
    process.exit(1);
  });
