import User from '../models/User.js';
import nodemailer from 'nodemailer'; // 🟢 Import nodemailer

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