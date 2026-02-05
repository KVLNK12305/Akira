import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import keyRoutes from './src/routes/keyRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import dataRoutes from './src/routes/dataRoutes.js';
import userRoutes from './src/routes/users.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// 1. Connect to Database
connectDB();

// 2. SECURITY MIDDLEWARE (MITM & DAST Fixes)
// HELMET: Sets security headers (HSTS, CSP, Frame Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000"],
      connectSrc: ["'self'", "http://localhost:5000"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images from backend
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// RATE LIMITING: Prevents Brute Force/DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api/', limiter);

// HIDE FINGERPRINTING
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration (Allow Frontend)
app.use(cors({
  origin: 'http://localhost:5173', // Vite Frontend
  credentials: true
}));

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/v1', dataRoutes);
app.use('/api/users', userRoutes);

// 3. Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    system: 'AKIRA Secure Gateway',
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    security_level: 'High (NIST-800-63-2)'
  });
});

// 4. Start Server
app.listen(PORT, () => {
  console.log(`\nAKIRA Gateway System Online`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'Development'}`);
});