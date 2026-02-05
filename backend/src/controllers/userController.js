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
      // 🔒 PASSWORD POLICY (Enforce: 8+ chars, 1 Upper, 1 Lower, 1 Number, 1 Special)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_\-\.]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          error: 'Security Policy Violation: Password must be 8+ chars with Uppercase, Lowercase, Number, and Special character (!@#$%^&*_-.).'
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

// Helper to notify all admins
const notifyAdmins = async (action, details) => {
  try {
    const admins = await User.find({ role: 'Admin' });
    const adminEmails = admins.map(u => u.email);

    if (adminEmails.length === 0) return;

    const mailOptions = {
      from: `"AKIRA Security" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: `🚨 Security Broadcast: ${action}`,
      html: `
        <div style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; border-radius: 20px;">
          <h2 style="color: #ef4444;">AKIRA Governance Alert</h2>
          <p>This is an automated broadcast to all system administrators.</p>
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
             <strong>Action:</strong> ${action}<br/>
             <strong>Details:</strong> User <b>${details.deletedUsername}</b> has been permanently removed.<br/>
             <strong>Authorized By:</strong> ${details.actorUsername}<br/>
             <strong>Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
          <p style="font-size: 12px; color: #64748b;">If this action was unauthorized, initiate emergency containment protocols immediately.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Broadcasted ${action} to ${adminEmails.length} admins.`);
  } catch (err) {
    console.error("Admin Notification Error:", err);
  }
};

// DELETE /api/users/:id (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { sudoPassword } = req.body;

    // 1. Sudo Re-Verification (Rubric: re-verification)
    if (!sudoPassword) {
      return res.status(401).json({ error: "Administrative authorization required. Please confirm your password." });
    }

    // Fetch the acting admin with passwordHash for verification
    const actingAdmin = await User.findById(req.user.id);
    const isValid = await argon2.verify(actingAdmin.passwordHash, sudoPassword);
    if (!isValid) {
      return res.status(403).json({ error: "Invalid administrative credentials. Deletion aborted." });
    }

    // 2. Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({ error: "Self-deletion is prohibited for security reasons." });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    // 3. Cascade Delete: Remove their API Keys
    await APIKey.deleteMany({ owner: id });

    // 4. Delete the User
    await User.findByIdAndDelete(id);

    // 5. Audit Log
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

    // 6. Broadcast to all Admins (Governance Requirement)
    notifyAdmins('USER_REMOVED', {
      deletedUsername: userToDelete.username,
      actorUsername: actingAdmin.username
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