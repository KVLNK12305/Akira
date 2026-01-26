import User from '../models/User.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'; 

// Setup Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Store OTPs in memory
export const otpStore = {}; 

// ==========================================
// 1. REGISTER (Restored!)
// ==========================================
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash Password
    const passwordHash = await argon2.hash(password);

    // Create User
    const newUser = new User({
      username,
      email,
      passwordHash,
      role: role || 'Developer'
    });

    await newUser.save();

    // Generate Token immediately for registration (optional, or force login)
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.status(201).json({ 
      success: true, 
      token, 
      user: { username: newUser.username, email: newUser.email, role: newUser.role } 
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ==========================================
// 2. LOGIN (With Email OTP)
// ==========================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if Account Exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please register.' });
    }

    // Verify Password
    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate REAL 6-Digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to memory linked to this email
    otpStore[email] = otp;

    // Send Real Email
    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your AKIRA Access Code',
      html: `
        <div style="font-family: monospace; padding: 20px; background: #000; color: #fff;">
          <h2>AKIRA Identity Verification</h2>
          <p>Request initiated for: <strong style="color: #34d399">${user.username}</strong></p>
          <p>Your Access Code is:</p>
          <h1 style="letter-spacing: 5px; color: #34d399; font-size: 32px;">${otp}</h1>
          <p style="color: #666; font-size: 12px;">Valid for 2 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${email} (OTP: ${otp})`); 

    // Send Success (Wait for MFA)
    res.json({ 
      success: true, 
      message: 'OTP sent to email',
      tempUser: { 
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login Error' });
  }
};

// ==========================================
// 3. VERIFY MFA
// ==========================================
export const verifyMFA = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Strict Check
    if (otpStore[email] && otpStore[email] === otp) {
      // OTP Matches!
      const user = await User.findOne({ email });
      
      const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      // Clear OTP
      delete otpStore[email];

      res.json({ success: true, token, user: { username: user.username, role: user.role } });
    } else {
      res.status(400).json({ error: 'Invalid or Expired Code' });
    }
  } catch (error) {
    console.error("MFA Verify Error:", error);
    res.status(500).json({ error: 'Verification failed' });
  }
};