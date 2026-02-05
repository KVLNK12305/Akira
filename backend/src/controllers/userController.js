import User from '../models/User.js';
import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import nodemailer from 'nodemailer'; // Import nodemailer
import argon2 from 'argon2';
import { otpStore } from './authController.js';
import { signData } from '../utils/crypto.js';

// 🟢 Setup Email Transporter (Reusing your config)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Must be false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// GET /api/users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// PUT /api/users/:id/role (Admin Only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    // 1. Prevent changing your own role (Safety check)
    if (req.user.id === id) {
      return res.status(400).json({ error: "You cannot change your own role." });
    }

    // 2. Update the User in DB
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: '-passwordHash' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3. 📧 SEND EMAIL NOTIFICATION (The New Feature)
    console.log(`📝 Sending Role Update Email to: ${updatedUser.email}`);

    const mailOptions = {
      from: `"AKIRA Security System" <${process.env.EMAIL_USER}>`,
      to: updatedUser.email,
      subject: '🔔 Access Level Updated',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #10b981;">Role Updated</h2>
          <p>Hello <strong>${updatedUser.username}</strong>,</p>
          <p>Your permissions on AKIRA Gate have been updated by an Administrator.</p>
          <p><strong>New Role:</strong> <span style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px; font-weight: bold; border: 1px solid #ddd;">${role}</span></p>
          <p>Please log out and log back in for changes to take effect.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">System Notification | AKIRA Gate v2.0</p>
        </div>
      `
    };

    // Send asynchronously (don't wait for it to return response)
    transporter.sendMail(mailOptions).catch(err => console.error("⚠️ Email failed:", err.message));

    // Return success immediately
    res.json({ success: true, user: updatedUser, message: "Role updated & Email sent" });

  } catch (err) {
    console.error("Update Role Error:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
};

// 👤 UPDATE PROFILE (Username, Profile Picture)
export const updateProfile = async (req, res) => {
  try {
    const { username: rawUsername, profilePicture } = req.body;
    const username = String(rawUsername); // 🛡️ SECURITY FIX: NoSQL Injection Prevention
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, profilePicture },
      { new: true, select: '-passwordHash' }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// 🔐 REQUEST PASSWORD CHANGE (Sends OTP)
export const requestPasswordChange = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🛡️ SECURITY FIX: Use the same robust OTP structure as login to prevent brute force
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user.email] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
      attempts: 0
    };

    console.log(`\n🔥 === PASSWORD CHANGE OTP for ${user.email}: ${otp} === 🔥\n`);

    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔐 Password Change Verification Code',
      text: `Your password change verification code is: ${otp}`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("⚠️ Email failed:", err.message);
    }

    res.json({ success: true, message: "Verification code sent to email" });
  } catch (err) {
    console.error("Request Password Change Error:", err);
    res.status(500).json({ error: "Failed to request password change" });
  }
};

// ✅ CONFIRM PASSWORD CHANGE (Verifies OTP & Updates Password)
export const confirmPasswordChange = async (req, res) => {
  try {
    const { otp: rawOtp, newPassword: rawNewPassword } = req.body;
    const otp = String(rawOtp);
    const newPassword = String(rawNewPassword); // 🛡️ SECURITY FIX: NoSQL Injection Prevention

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const storedData = otpStore[user.email];

    if (!storedData || typeof storedData !== 'object') {
      return res.status(400).json({ error: "No active password change session found." });
    }

    // A. Check Expiry
    if (Date.now() > storedData.expiresAt) {
      delete otpStore[user.email];
      return res.status(400).json({ error: "Code has expired." });
    }

    // B. Check Attempts (Brute Force Protection)
    if (storedData.attempts >= 5) {
      delete otpStore[user.email];
      return res.status(403).json({ error: "Too many failed attempts. Security lockout." });
    }

    // C. Verify
    if (storedData.code === otp) {
      // 🔒 PASSWORD POLICY
      const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long and include at least one number and one special character (!@#$%^&*).'
        });
      }

      const passwordHash = await argon2.hash(newPassword);
      user.passwordHash = passwordHash;
      await user.save();

      delete otpStore[user.email];
      res.json({ success: true, message: "Password updated successfully" });
    } else {
      storedData.attempts += 1;
      res.status(400).json({ error: `Invalid Code. ${5 - storedData.attempts} attempts remaining.` });
    }
  } catch (err) {
    console.error("Confirm Password Change Error:", err);
    res.status(500).json({ error: "Failed to confirm password change" });
  }
};

// DELETE /api/users/:id (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ error: "Self-deletion is prohibited for security reasons." });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2. Cascade Delete: Remove their API Keys
    await APIKey.deleteMany({ owner: id });

    // 3. Delete the User
    await User.findByIdAndDelete(id);

    // 4. Audit Log
    const logEntry = {
      action: 'USER_DELETED',
      actor: req.user.id,
      actorDisplay: req.user.username,
      timestamp: new Date(),
      details: { deletedUserId: id, deletedUsername: userToDelete.username }
    };

    await AuditLog.create({
      ...logEntry,
      integritySignature: signData(logEntry, process.env.MASTER_KEY)
    });

    res.json({ success: true, message: `User ${userToDelete.username} and their assets have been removed.` });

  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
};

// UPLOAD AVATAR
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Return the relative path to the uploaded file
    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("Upload Avatar Error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
};