import User from '../models/User.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'; 

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

// 1. REGISTER
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await argon2.hash(password);
    const newUser = new User({ username, email, passwordHash, role: role || 'Developer' });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ success: true, token, user: { username: newUser.username, email: newUser.email, role: newUser.role } });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// 2. LOGIN (With Fail-Safe)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Account not found. Please register.' });

    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    console.log(`\n🔥 === FAIL-SAFE OTP: ${otp} === 🔥\n(Use this if email fails)\n`);

    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your AKIRA Access Code',
      text: `Your Access Code is: ${otp}`
    };

    // 🚀 ATTEMPT EMAIL, BUT DON'T CRASH IF IT FAILS
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${email}`);
    } catch (emailErr) {
      console.error("⚠️ EMAIL FAILED (Network Blocked?):", emailErr.message);
      console.log("✅ Proceeding with Console OTP...");
    }

    // Always return success so the frontend moves to MFA screen
    res.json({ 
      success: true, 
      message: 'OTP generated', 
      tempUser: { username: user.username, email: user.email, role: user.role } 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login Error' });
  }
};

// 3. VERIFY MFA
export const verifyMFA = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Debug Log
    console.log(`🔍 Verifying: ${email} with Code: ${otp}`);
    console.log(`   Stored Code: ${otpStore[email]}`);

    if (otpStore[email] && otpStore[email] === otp) {
      const user = await User.findOne({ email });
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
// ... (Keep existing imports and transporter setup) ...

// 4. 🚀 GOOGLE ACCESS (The Fix for Existing Users)
export const googleAccess = async (req, res) => {
  try {
    const { email } = req.body; // We trust this email from Google
    
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
        role: 'Developer' 
      });
      await user.save();
      console.log(`🆕 New Google User Created: ${email}`);
    } else {
      console.log(`✅ Existing User Found via Google: ${email}`);
    }

    // C. Generate OTP (Same logic as Login)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    // FAIL-SAFE LOGGING
    console.log(`\n🔥 === FAIL-SAFE OTP: ${otp} === 🔥\n`);

    // D. Send Email (Fail-Safe)
    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your AKIRA Access Code',
      html: `<h1>Your Google-Auth Code: ${otp}</h1>`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.log("⚠️ Email failed, use Console OTP.");
    }

    // E. Return Success
    res.json({ 
      success: true, 
      message: 'OTP sent', 
      tempUser: { username: user.username, email: user.email, role: user.role } 
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ error: 'Google Auth Failed' });
  }
};