import crypto from 'crypto';

// Known malicious subnets & threat intelligence IPs (Tor exit nodes, Botnet C2, Scanner proxies)
const THREAT_INTEL_SUBNETS = [
  '198.51.100.',  // TEST-NET-2 / Threat Sim
  '203.0.113.',   // TEST-NET-3 / Exfil Sim
  '185.220.101.', // Tor exit node subnet
  '185.220.102.',
  '194.26.29.',
  '45.154.255.',
  '91.240.118.'
];

// IP Range to Geolocation mapping for deterministic, high-speed resolution
const IP_GEO_MAP = [
  { prefix: '10.0.', country: 'United States', city: 'New York', latitude: 40.7128, longitude: -74.0060 },
  { prefix: '192.168.', country: 'United States', city: 'San Francisco', latitude: 37.7749, longitude: -122.4194 },
  { prefix: '127.0.0.1', country: 'Localhost', city: 'DataCenter-Primary', latitude: 40.7128, longitude: -74.0060 },
  { prefix: '::1', country: 'Localhost', city: 'DataCenter-Primary', latitude: 40.7128, longitude: -74.0060 },
  { prefix: '198.51.100.', country: 'Russia', city: 'Moscow', latitude: 55.7558, longitude: 37.6173 },
  { prefix: '203.0.113.', country: 'Japan', city: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { prefix: '185.220.101.', country: 'Netherlands', city: 'Amsterdam', latitude: 52.3676, longitude: 4.9041 },
  { prefix: '45.154.255.', country: 'North Korea', city: 'Pyongyang', latitude: 39.0392, longitude: 125.7625 }
];

/**
 * Resolves IP to Geolocation data.
 */
export const getGeoLocation = (ip) => {
  if (!ip) return { country: 'Unknown', city: 'Unknown', latitude: 0, longitude: 0 };

  const matched = IP_GEO_MAP.find(entry => ip.startsWith(entry.prefix));
  if (matched) {
    return {
      country: matched.country,
      city: matched.city,
      latitude: matched.latitude,
      longitude: matched.longitude
    };
  }

  // Deterministic fallback based on IP hash
  const hash = crypto.createHash('md5').update(ip).digest('hex');
  const lat = ((parseInt(hash.substring(0, 4), 16) % 18000) / 100) - 90;
  const lon = ((parseInt(hash.substring(4, 8), 16) % 36000) / 100) - 180;

  return {
    country: 'External Cloud',
    city: 'Global Transit',
    latitude: parseFloat(lat.toFixed(4)),
    longitude: parseFloat(lon.toFixed(4))
  };
};

/**
 * Calculates Great-Circle Distance using the Haversine Formula (in kilometers).
 */
export const calculateDistance = (loc1, loc2) => {
  if (!loc1 || !loc2 || loc1.latitude === undefined || loc2.latitude === undefined) return 0;

  const R = 6371; // Earth radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Evaluates client IP against Threat Intelligence feeds and reputation databases.
 */
export const checkIPReputation = (ip) => {
  if (!ip) return { threatLevel: 0, isMalicious: false, categories: [] };

  const isKnownBadSubnet = THREAT_INTEL_SUBNETS.some(subnet => ip.startsWith(subnet));
  if (isKnownBadSubnet) {
    return {
      threatLevel: 0.95,
      isMalicious: true,
      categories: ['TOR_EXIT_NODE', 'THREAT_ACTOR_INFRASTRUCTURE', 'EXPLOITATION_FEED'],
      firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };
  }

  return {
    threatLevel: 0.05,
    isMalicious: false,
    categories: ['CLEAN_DATACENTER']
  };
};

/**
 * Generates an immutable Device/Client Fingerprint from headers & platform clues.
 */
export const generateDeviceFingerprint = (userAgent = '', headers = {}) => {
  const accept = headers['accept'] || '';
  const encoding = headers['accept-encoding'] || '';
  const lang = headers['accept-language'] || '';
  const customSignature = headers['x-device-signature'] || '';

  const raw = `${userAgent}|${accept}|${encoding}|${lang}|${customSignature}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
};

/**
 * Analyzes request payload for elevated financial risk patterns (e.g. large amounts, bulk settlements).
 */
export const analyzePayloadSensitivity = (body = {}, path = '') => {
  let isSensitive = false;
  const detectedPatterns = [];

  // Check financial amount threshold (&ge; $10,000 USD is high sensitivity)
  if (body.amount && (parseFloat(body.amount) >= 10000 || body.amount >= 10000)) {
    isSensitive = true;
    detectedPatterns.push(`HIGH_VALUE_TRANSACTION ($${body.amount})`);
  }

  // Check refund operations
  if (path.includes('/refund') || body.refundAmount) {
    isSensitive = true;
    detectedPatterns.push('PAYMENT_REFUND_PIPELINE');
  }

  // Check batch settlement count
  if (body.count && parseInt(body.count) > 50) {
    isSensitive = true;
    detectedPatterns.push(`MASS_BATCH_SETTLEMENT (${body.count} records)`);
  }

  return {
    isSensitive,
    detectedPatterns,
    level: isSensitive ? 'HIGH' : 'STANDARD'
  };
};
