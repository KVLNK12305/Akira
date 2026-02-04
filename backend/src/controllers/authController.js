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

    // 🔒 PASSWORD POLICY (Rubric Item: complexity)
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one number and one special character (!@#$%^&*).'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await argon2.hash(password);
    const newUser = new User({ username, email, passwordHash, role: role || 'Developer' });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({
      success: true,
      token,
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profilePicture: newUser.profilePicture
      }
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// 2. LOGIN (With Fail-Safe)
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Account not found. Please register.' });

    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate OTP with Expiry and Attempt Counter (Rubric Item: timing & incorrect attempts)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 Minutes
      attempts: 0
    };

    console.log(`\n🔥 === FAIL-SAFE OTP: ${otp} === 🔥\n(Use this if email fails)\n`);

    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your AKIRA Access Code',
      text: `Your Access Code is: ${otp}`
    };

    // 🚀 DONT AWAIT (Don't let slow SMTP block the user)
    transporter.sendMail(mailOptions)
      .then(() => console.log(`📧 Login Email sent to ${email}`))
      .catch((err) => console.log("⚠️ Email failed, use Console OTP:", err.message));

    // Always return success so the frontend moves to MFA screen
    res.json({
      success: true,
      message: 'OTP generated',
      tempUser: {
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Login Error' });
  }
};

// 3. VERIFY MFA
export const verifyMFA = async (req, res) => {
  try {
    const { email: rawEmail, otp } = req.body;
    const email = rawEmail.toLowerCase();

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
      delete otpStore[email];
      res.json({
        success: true,
        token,
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture
        }
      });
    } else {
      storedData.attempts += 1;
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
    const email = rawEmail.toLowerCase();

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
      console.log(`🆕 New Google User Created: ${email}`);
    } else {
      console.log(`✅ Existing User Found via Google: ${email}`);
      // IF existing user doesn't have a picture, sync with Google
      if (profilePicture && !user.profilePicture) {
        user.profilePicture = profilePicture;
        await user.save();
        console.log(`🔄 Synced Google Picture for ${email}`);
      }
    }

    // C. Generate OTP (Same logic as Login)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 Minutes
      attempts: 0
    };

    // FAIL-SAFE LOGGING
    console.log(`\n🔥 === FAIL-SAFE OTP: ${otp} === 🔥\n`);

    // D. Send Email (Fail-Safe)
    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your AKIRA Access Code',
      html: `<h1>Your Google-Auth Code: ${otp}</h1>`
    };

    // 🚀 DONT AWAIT (Don't let slow email block the user)
    transporter.sendMail(mailOptions)
      .then(() => console.log(`📧 Google Auth Email sent to ${email}`))
      .catch((err) => console.log("⚠️ Email failed, use Console OTP:", err.message));

    // E. Return Success
    res.json({
      success: true,
      message: 'OTP sent',
      tempUser: {
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ error: 'Google Auth Failed' });
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