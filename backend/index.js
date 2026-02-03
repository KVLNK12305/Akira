import dotenv from 'dotenv';
import userRoutes from './src/routes/users.js';

dotenv.config();
console.log("DEBUG: Mongo URI is:", process.env.MONGO_URI); // <--- Add this
// ... imports
import dataRoutes from './src/routes/dataRoutes.js'; // <-- Import
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/db.js'; // Note the .js extension
import authRoutes from './src/routes/authRoutes.js'; // <-- NEW
import keyRoutes from './src/routes/keyRoutes.js';   // <-- NEW
import auditRoutes from './src/routes/auditRoutes.js'; // 🟢 Import this

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// 1. Connect to Database
connectDB();

// 2. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration (Allow Frontend)
app.use(cors({
  origin: 'http://localhost:5173', // Vite Frontend
  credentials: true
}));

app.use('/api/auth', authRoutes); // <-- NEW
app.use('/api/keys', keyRoutes);  // <-- NEW
app.use('/api/audit-logs', auditRoutes);
app.use('/api/v1', dataRoutes); // <-- Mount here
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
  console.log(`\n🚀 AKIRA Gateway System Online`);
  console.log(`   📡 Port: ${PORT}`);
  console.log(`   🔗 Mode: ${process.env.NODE_ENV || 'Development'}`);
});