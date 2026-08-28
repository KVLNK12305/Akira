import NHIProfile from '../models/NHIProfile.js';
import { getGeoLocation, generateDeviceFingerprint } from './threatIntelService.js';

/**
 * Updates the behavioral baseline profile for a machine identity after an authorized request.
 */
export const updateNHIProfile = async ({
  keyId,
  machineName,
  clientIP,
  userAgent = '',
  headers = {},
  requestPath = '',
  requestMethod = 'GET',
  scopes = []
}) => {
  try {
    let profile = await NHIProfile.findOne({ apiKey: keyId });
    const now = new Date();
    const currentGeo = getGeoLocation(clientIP);
    const deviceFingerprint = generateDeviceFingerprint(userAgent, headers);
    const endpointKey = `${requestMethod}:${requestPath}`;
    const currentHour = now.getUTCHours();

    if (!profile) {
      profile = new NHIProfile({
        apiKey: keyId,
        machineName,
        knownIPs: clientIP ? [clientIP] : [],
        knownLocations: [currentGeo],
        lastLocation: { ...currentGeo, timestamp: now },
        knownDeviceFingerprints: [deviceFingerprint],
        knownEndpoints: [endpointKey],
        typicalScopes: scopes,
        requestTimestamps: [now],
        hourlyDistribution: (() => {
          const dist = new Array(24).fill(0);
          dist[currentHour] = 1;
          return dist;
        })(),
        totalRequests: 1,
        learningWindowRequests: 1,
        lastSeen: now
      });
    } else {
      profile.totalRequests += 1;
      profile.learningWindowRequests += 1;
      profile.lastSeen = now;
      profile.lastLocation = { ...currentGeo, timestamp: now };

      // Update hourly distribution
      if (!profile.hourlyDistribution || profile.hourlyDistribution.length !== 24) {
        profile.hourlyDistribution = new Array(24).fill(0);
      }
      profile.hourlyDistribution[currentHour] = (profile.hourlyDistribution[currentHour] || 0) + 1;

      // 1. Maintain learned IPs & Locations (during learning phase)
      if (clientIP && !profile.knownIPs.includes(clientIP)) {
        if (!profile.baselineEstablished) {
          profile.knownIPs.push(clientIP);
        }
      }

      if (!profile.knownLocations) profile.knownLocations = [];
      const hasGeoMatch = profile.knownLocations.some(l =>
        l.country === currentGeo.country &&
        Math.abs(l.latitude - currentGeo.latitude) < 8 &&
        Math.abs(l.longitude - currentGeo.longitude) < 8
      );
      if (!hasGeoMatch && !profile.baselineEstablished) {
        profile.knownLocations.push(currentGeo);
      }

      // 2. Maintain device fingerprints & endpoints
      if (!profile.knownDeviceFingerprints) profile.knownDeviceFingerprints = [];
      if (!profile.knownDeviceFingerprints.includes(deviceFingerprint) && !profile.baselineEstablished) {
        profile.knownDeviceFingerprints.push(deviceFingerprint);
      }

      if (!profile.knownEndpoints) profile.knownEndpoints = [];
      if (!profile.knownEndpoints.includes(endpointKey) && !profile.baselineEstablished) {
        profile.knownEndpoints.push(endpointKey);
      }

      // 3. Maintain typical scopes
      for (const s of scopes) {
        if (!profile.typicalScopes.includes(s)) {
          if (!profile.baselineEstablished) {
            profile.typicalScopes.push(s);
          }
        }
      }

      // 4. Maintain sliding window of request timestamps
      if (!profile.requestTimestamps) profile.requestTimestamps = [];
      profile.requestTimestamps.push(now);
      if (profile.requestTimestamps.length > 100) {
        profile.requestTimestamps = profile.requestTimestamps.slice(-100);
      }

      // 5. Calculate rate metrics (reqs per hour estimate from sliding window)
      if (profile.requestTimestamps.length >= 5) {
        const oldest = new Date(profile.requestTimestamps[0]);
        const timespanHours = Math.max((now.getTime() - oldest.getTime()) / (1000 * 60 * 60), 0.05);
        const currentRate = profile.requestTimestamps.length / timespanHours;
        
        // Exponential Moving Average
        profile.avgRequestsPerHour = profile.avgRequestsPerHour === 0
          ? currentRate
          : (profile.avgRequestsPerHour * 0.8) + (currentRate * 0.2);

        if (currentRate > profile.peakRequestsPerHour) {
          profile.peakRequestsPerHour = currentRate;
        }
      }

      // 6. Check if baseline should now be marked as established
      if (!profile.baselineEstablished && profile.learningWindowRequests >= profile.learningThreshold) {
        profile.baselineEstablished = true;
        profile.baselineEstablishedAt = now;
      }
    }

    await profile.save();
    return profile;
  } catch (err) {
    console.error('Error updating NHI profile baseline:', err.message);
  }
};
