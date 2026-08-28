import mongoose from 'mongoose';
import dotenv from 'dotenv';
import APIKey from './src/models/APIKey.js';
import EphemeralToken from './src/models/EphemeralToken.js';
import RiskEvent from './src/models/RiskEvent.js';
import NHIProfile from './src/models/NHIProfile.js';
import ContainmentPolicy from './src/models/ContainmentPolicy.js';
import CompromisedCredential from './src/models/CompromisedCredential.js';
import User from './src/models/User.js';
import { generateAPIKey, encrypt, hashFingerprint } from './src/utils/crypto.js';
import { scoreNHIRequest } from './src/services/riskEngine.js';
import { quarantineKey, releaseQuarantine } from './src/services/containmentService.js';
import { updateNHIProfile } from './src/services/profileBuilder.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/akira_db';
const MASTER_KEY = process.env.MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function runEnterpriseTests() {
  console.log('\n======================================================================');
  console.log('🛡️  AKIRA ENTERPRISE AI RISK & THREAT SENTINEL TEST SUITE (A+ TIER)');
  console.log('======================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Setup Test Actor
    let user = await User.findOne({ username: 'enterprise_sec_ops' });
    if (!user) {
      user = await User.create({
        username: 'enterprise_sec_ops',
        email: 'sec_ops@akira.security',
        passwordHash: 'dummyhash',
        role: 'Admin'
      });
    }

    // 2. Issue Payment Machine Key
    const rawKey = generateAPIKey();
    const encryptedData = encrypt(rawKey, MASTER_KEY);
    const [iv, authTag, encryptedKey] = encryptedData.split(':');
    const fingerprint = hashFingerprint(rawKey);

    const testKey = await APIKey.create({
      owner: user._id,
      name: 'Global-Payment-Orchestrator-01',
      encryptedKey,
      iv,
      authTag,
      keyFingerprint: fingerprint,
      scopes: ['payment:initiate', 'payment:authorize', 'ledger:read'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    console.log(`✅ Provisioned Machine Identity: ${testKey.name}`);

    // 3. Train Baseline (NYC Datacenter, Clean Client Fingerprint, Standard Endpoints)
    console.log('\n--- 1. Training Machine Behavioral Baseline (NYC Datacenter) ---');
    const legitIP = '10.0.1.25'; // NYC
    const legitUserAgent = 'Akira-PaymentCore-Service/2.4 (Enclave-Node-NYC)';
    const legitHeaders = { 'accept': 'application/json', 'accept-encoding': 'gzip, br' };

    for (let i = 0; i < 11; i++) {
      await updateNHIProfile({
        keyId: testKey._id,
        machineName: testKey.name,
        clientIP: legitIP,
        userAgent: legitUserAgent,
        headers: legitHeaders,
        requestPath: '/api/v1/payment/charge',
        requestMethod: 'POST',
        scopes: ['payment:initiate', 'ledger:read']
      });
    }

    const profile = await NHIProfile.findOne({ apiKey: testKey._id });
    console.log(`✅ Baseline Locked: ${profile.baselineEstablished}`);
    console.log(`   Known Locations:`, profile.knownLocations.map(l => `${l.city}, ${l.country}`));
    console.log(`   Known Endpoints:`, profile.knownEndpoints);
    console.log(`   Known Device Signatures: ${profile.knownDeviceFingerprints.length}`);

    // 4. Verify Legitimate Clean Request
    console.log('\n--- 2. Evaluating Legitimate Transaction (Score &lt; 25) ---');
    const cleanEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: legitIP,
      userAgent: legitUserAgent,
      headers: legitHeaders,
      body: { amount: 150.00 },
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    console.log(`✅ Clean Evaluation: Score ${cleanEval.riskScore}/100 [Level: ${cleanEval.riskLevel}, Action: ${cleanEval.action}]`);
    if (cleanEval.action !== 'ALLOWED') throw new Error(`Expected ALLOWED, received ${cleanEval.action}`);

    // 5. Test Geolocation Physics: Impossible Travel
    console.log('\n--- 3. Testing Geolocation Physics & Impossible Travel Detection ---');
    const tokyoIP = '203.0.113.50'; // Tokyo Japan (10,800 km away)
    const travelEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: tokyoIP,
      userAgent: legitUserAgent,
      headers: legitHeaders,
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    console.log(`🚨 Impossible Travel Score: ${travelEval.riskScore}/100`);
    const travelSig = travelEval.signals.find(s => s.signal === 'IMPOSSIBLE_TRAVEL');
    if (!travelSig) throw new Error('Failed to detect IMPOSSIBLE_TRAVEL anomaly');
    console.log(`   Signal Verified: IMPOSSIBLE_TRAVEL (+${travelSig.weight}) -> ${travelSig.details.distanceKm} in ${travelSig.details.elapsedMinutes}`);

    // 6. Test Threat Intel: Malicious Tor Exit Node
    console.log('\n--- 4. Testing Threat Intelligence Feed (Tor Exit Node) ---');
    const torIP = '185.220.101.99'; // Known Tor exit subnet
    const threatEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: torIP,
      userAgent: 'TorBrowser/12.0',
      headers: { 'accept': '*/*' },
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    console.log(`🚨 Threat Intel Score: ${threatEval.riskScore}/100`);
    const malSig = threatEval.signals.find(s => s.signal === 'MALICIOUS_IP');
    if (!malSig) throw new Error('Failed to detect MALICIOUS_IP from threat feed');
    console.log(`   Signal Verified: MALICIOUS_IP (+${malSig.weight}) Categories: ${malSig.details.categories.join(', ')}`);

    // 7. Test Device Fingerprint Deviation
    console.log('\n--- 5. Testing Client / Device Fingerprint Anomaly ---');
    const spoofEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: legitIP,
      userAgent: 'Adversary-Python-HTTP-Client/1.0',
      headers: { 'x-device-signature': 'unverified-hardware' },
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    const devSig = spoofEval.signals.find(s => s.signal === 'DEVICE_ANOMALY');
    if (!devSig) throw new Error('Failed to detect DEVICE_ANOMALY');
    console.log(`✅ Signal Verified: DEVICE_ANOMALY (+${devSig.weight})`);

    // 8. Test DarkWeb Compromised Credential Breach Feed
    console.log('\n--- 6. Testing Compromised Credential Database Interception ---');
    await CompromisedCredential.create({
      keyFingerprint: testKey.keyFingerprint,
      source: 'DarkWeb-Breach-Dump-2026',
      reason: 'Key found on public pastebin dump',
      severity: 'CRITICAL'
    });

    const breachEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: legitIP,
      userAgent: legitUserAgent,
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    const compSig = breachEval.signals.find(s => s.signal === 'COMPROMISED_CREDENTIAL');
    if (!compSig) throw new Error('Failed to detect COMPROMISED_CREDENTIAL');
    console.log(`🚨 Signal Verified: COMPROMISED_CREDENTIAL (+${compSig.weight}) -> Action: ${breachEval.action}`);

    // 9. Test Payload Sensitivity & High-Value Settlement
    console.log('\n--- 7. Testing Payload Sensitivity Analysis ($85,000 Bulk Batch) ---');
    const sensitiveEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: legitIP,
      userAgent: legitUserAgent,
      body: { amount: 85000, count: 150 },
      requestPath: '/api/v1/payment/settle',
      requestMethod: 'POST',
      requestedScopes: ['payment:settle']
    });
    const sensSig = sensitiveEval.signals.find(s => s.signal === 'SENSITIVE_OPERATION');
    if (!sensSig) throw new Error('Failed to detect SENSITIVE_OPERATION');
    console.log(`✅ Signal Verified: SENSITIVE_OPERATION (+${sensSig.weight}) -> Patterns: ${sensSig.details.detectedPatterns.join(', ')}`);

    // 10. Test Multi-Session Concurrency
    console.log('\n--- 8. Testing Concurrent Token Splitting ---');
    await EphemeralToken.create({
      parentKey: testKey._id,
      jti: 'token-session-A-' + Date.now(),
      ttl: 300,
      scopes: ['payment:initiate'],
      expiresAt: new Date(Date.now() + 300 * 1000)
    });
    await EphemeralToken.create({
      parentKey: testKey._id,
      jti: 'token-session-B-' + Date.now(),
      ttl: 300,
      scopes: ['payment:initiate'],
      expiresAt: new Date(Date.now() + 300 * 1000)
    });

    const concEval = await scoreNHIRequest({
      keyRecord: testKey,
      clientIP: legitIP,
      userAgent: legitUserAgent,
      requestPath: '/api/v1/payment/charge',
      requestMethod: 'POST',
      requestedScopes: ['payment:initiate']
    });
    const concSig = concEval.signals.find(s => s.signal === 'CONCURRENT_SESSIONS');
    if (!concSig) throw new Error('Failed to detect CONCURRENT_SESSIONS');
    console.log(`✅ Signal Verified: CONCURRENT_SESSIONS (+${concSig.weight}) -> Active: ${concSig.details.activeSessionCount}`);

    // 11. Cleanup Test Artifacts
    await APIKey.deleteOne({ _id: testKey._id });
    await NHIProfile.deleteOne({ apiKey: testKey._id });
    await EphemeralToken.deleteMany({ parentKey: testKey._id });
    await RiskEvent.deleteMany({ apiKey: testKey._id });
    await CompromisedCredential.deleteMany({ keyFingerprint: testKey.keyFingerprint });

    console.log('\n======================================================================');
    console.log('🎉 ALL ENTERPRISE (A+ TIER) RISK SENTINEL TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('❌ Enterprise Test Suite Failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runEnterpriseTests();
