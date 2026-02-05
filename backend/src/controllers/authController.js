import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { signData } from '../utils/crypto.js';

// Setup Email Transporter
// 1. Using Port 587 (TLS) is less likely to be blocked than 465
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Must be false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Store OTPs in memory
export const otpStore = {};

// Helper to initiate MFA (Generate OTP & Send Email)
const initiateMfa = (user, statusCode, res) => {
  const email = user.email;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[email] = {
    code: otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 Minutes
    attempts: 0
  };

  console.log(`\n=== AKIRA MFA GATEWAY ===`);
  console.log(`User: ${email}`);
  console.log(`FAIL-SAFE OTP: ${otp}`);
  console.log(`========================\n`);

  const mailOptions = {
    from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your AKIRA Verification Code',
    text: `Your Identity Verification Code is: ${otp}`
  };

  transporter.sendMail(mailOptions)
    .then(() => console.log(`Email sent to ${email}`))
    .catch((err) => console.log("Email failed, use Console OTP:", err.message));

  res.status(statusCode).json({
    success: true,
    requireMfa: true,
    message: 'OTP initiated for identity verification',
    tempUser: {
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    }
  });
};

// Helper to set cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  const options = {
    expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token, // Keeping for transitional support
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
};

// 1. REGISTER
export const register = async (req, res) => {
  try {
    const { username, email: rawEmail, password } = req.body;
    const email = String(rawEmail).toLowerCase();

    // PASSWORD POLICY (Enforce: 8+ chars, 1 Upper, 1 Lower, 1 Number, 1 Special)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_\-\.]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Security Policy Violation: Password must be at least 8 characters long and include an Uppercase letter, a Lowercase letter, a Number, and a Special character (!@#$%^&*_-.).'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await argon2.hash(password);
    // SECURITY FIX: Hardcode role to Developer to prevent Mass Assignment (Privilege Escalation)
    const newUser = new User({ username, email, passwordHash, role: 'Developer' });
    await newUser.save();

    // AUDIT LOG
    const logEntry = {
      action: 'USER_REGISTERED',
      actor: newUser._id,
      actorDisplay: newUser.username,
      ipAddress: req.ip,
      details: { email: newUser.email }
    };

    await AuditLog.create({
      ...logEntry,
      integritySignature: signData(logEntry, process.env.MASTER_KEY)
    });

    console.log(`User Registered! Initiating Identity Verification for: ${email}`);
    initiateMfa(newUser, 201, res);
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// 2. LOGIN (With Fail-Safe)
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = String(rawEmail).toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Account not found. Please register.' });

    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    console.log(`Login Authorized! Initiating Identity Verification for: ${email}`);
    initiateMfa(user, 200, res);
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login Error' });
  }
};

// 3. VERIFY MFA
export const verifyMFA = async (req, res) => {
  try {
    const { email: rawEmail, otp: rawOtp } = req.body;
    const email = String(rawEmail).toLowerCase();
    const otp = String(rawOtp); // SECURITY FIX: NoSQL Injection Prevention

    // Debug Log
    const storedData = otpStore[email];
    console.log(`🔍 Verifying: ${email} with Code: ${otp}`);

    if (!storedData) {
      return res.status(400).json({ error: 'No active session found. Please login again.' });
    }

    // A. Check Expiry
    if (Date.now() > storedData.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // B. Check Lockout (Too many attempts)
    if (storedData.attempts >= 5) {
      delete otpStore[email];
      return res.status(403).json({ error: 'Too many failed attempts. Security lockout. Please login again.' });
    }

    // C. Verify Code
    if (storedData.code === otp) {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // AUDIT LOG: SUCCESSFUL LOGIN
      const logEntry = {
        action: 'USER_LOGIN_SUCCESS',
        actor: user._id,
        actorDisplay: user.username,
        ipAddress: req.ip,
        details: { email: user.email }
      };

      await AuditLog.create({
        ...logEntry,
        integritySignature: signData(logEntry, process.env.MASTER_KEY)
      });

      delete otpStore[email];
      sendTokenResponse(user, 200, res);
    } else {
      storedData.attempts += 1;

      // AUDIT LOG: FAILED MFA
      const failLog = {
        action: 'MFA_FAILED',
        actorDisplay: email, // Use email as display for unknown/failed attempts
        ipAddress: req.ip,
        details: { email, attempts: storedData.attempts }
      };

      await AuditLog.create({
        ...failLog,
        integritySignature: signData(failLog, process.env.MASTER_KEY)
      });

      res.status(400).json({
        error: `Invalid Code. ${5 - storedData.attempts} attempts remaining.`
      });
    }
  } catch (error) {
    console.error("MFA Verify Error:", error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// 4. 🚀 GOOGLE ACCESS (The Fix for Existing Users)
export const googleAccess = async (req, res) => {
  try {
    const { email: rawEmail, profilePicture } = req.body; // We trust this email from Google
    const email = String(rawEmail).toLowerCase(); // SECURITY FIX: NoSQL Injection Prevention

    // A. Check if user exists
    let user = await User.findOne({ email });

    // B. If NOT exist, Create them (Auto-Register)
    if (!user) {
      const username = email.split('@')[0];
      // We set a random password because they will login via Google anyway
      const randomPass = await argon2.hash(Math.random().toString(36));

      user = new User({
        username,
        email,
        passwordHash: randomPass,
        role: 'Developer',
        profilePicture: profilePicture // Save Google picture if new
      });
      await user.save();
      console.log(`New Google User Created: ${email}`);
    } else {
      console.log(`User Found via Google: ${email}`);
      // IF existing user doesn't have a picture, sync with Google
      if (profilePicture && !user.profilePicture) {
        user.profilePicture = profilePicture;
        await user.save();
        console.log(`🔄 Synced Google Picture for ${email}`);
      }
    }

    console.log(`Google Auth Authorized! Initiating Identity Verification for: ${email}`);
    initiateMfa(user, 200, res);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ success: false, error: 'Google Login Failed' });
  }
};

// 5. GET CURRENT USER (For Refresh)
export const getMe = async (req, res) => {
  try {
    // req.user is set by the verifyToken middleware
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 6. LOGOUT
export const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000), // 5 seconds
    httpOnly: true
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};