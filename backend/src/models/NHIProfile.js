import mongoose from 'mongoose';

const NHIProfileSchema = new mongoose.Schema({
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    required: true,
    unique: true,
    index: true
  },
  machineName: { type: String, required: true },

  // Behavioral baseline attributes (learned over time)
  knownIPs: [{ type: String }],
  knownLocations: [{
    country: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  }],
  lastLocation: {
    country: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date }
  },

  knownDeviceFingerprints: [{ type: String }],
  knownEndpoints: [{ type: String }],
  typicalScopes: [{ type: String }],
  
  // Velocity & activity metrics
  avgRequestsPerHour: { type: Number, default: 0 },
  peakRequestsPerHour: { type: Number, default: 0 },
  requestTimestamps: [{ type: Date }], // Rolling window for velocity calculation
  hourlyDistribution: {
    type: [Number],
    default: () => new Array(24).fill(0)
  },
  
  // Operational schedule (Days: 0=Sun..6=Sat, Hours: UTC)
  typicalWorkingDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5] // Monday-Friday default
  },
  typicalHoursUTC: {
    start: { type: Number, default: 0 },
    end: { type: Number, default: 23 }
  },
  
  lastSeen: { type: Date, default: Date.now },
  totalRequests: { type: Number, default: 0 },
  violationCount: { type: Number, default: 0 },

  // Learning phase
  baselineEstablished: { type: Boolean, default: false },
  baselineEstablishedAt: { type: Date },
  learningWindowRequests: { type: Number, default: 0 },
  learningThreshold: { type: Number, default: 10 }, // After 10 requests, baseline established for lab/demo

  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before save
NHIProfileSchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.model('NHIProfile', NHIProfileSchema);
