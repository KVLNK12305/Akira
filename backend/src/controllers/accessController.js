import AccessRequest from '../models/AccessRequest.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signData } from '../utils/crypto.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// @desc    Submit a new access request
// @route   POST /api/access/request
export const submitRequest = async (req, res) => {
    try {
        const { requestedRole, reason } = req.body;
        const userId = req.user.id;

        // Check if there's already a pending request
        const existingPending = await AccessRequest.findOne({ user: userId, status: 'PENDING' });
        if (existingPending) {
            return res.status(400).json({ error: "You already have a pending access request." });
        }

        const newRequest = await AccessRequest.create({
            user: userId,
            requestedRole,
            reason
        });

        // Notify Admins
        const admins = await User.find({ role: 'Admin' });
        const adminEmails = admins.map(u => u.email);

        if (adminEmails.length > 0) {
            const mailOptions = {
                from: `"AKIRA Governance" <${process.env.EMAIL_USER}>`,
                to: adminEmails,
                subject: '⚠️ New Access Elevation Request',
                html: `
          <div style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; border-radius: 20px;">
            <h2 style="color: #fbbf24;">Action Required: Access Request</h2>
            <p>A user is requesting elevated permissions.</p>
            <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #fbbf24;">
               <strong>User:</strong> ${req.user.username} (${req.user.email})<br/>
               <strong>Requested Role:</strong> <span style="color: #fbbf24; font-weight: bold;">${requestedRole}</span><br/>
               <strong>Grounds/Reason:</strong><br/>
               <blockquote style="font-style: italic; color: #cbd5e1; margin: 10px 0;">"${reason}"</blockquote>
               <strong>Timestamp:</strong> ${new Date().toLocaleString()}
            </div>
            <p>Please review this request in the Sentinel Dashboard.</p>
          </div>
        `
            };
            transporter.sendMail(mailOptions).catch(err => console.error("Request Notify Error:", err));
        }

        res.status(201).json({ success: true, message: "Request submitted successfully. Admins have been notified." });

    } catch (err) {
        console.error("Submit Request Error:", err);
        res.status(500).json({ error: "Failed to submit request" });
    }
};

// @desc    Get all pending requests (Admin Only)
// @route   GET /api/access/requests
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await AccessRequest.find({ status: 'PENDING' })
            .populate('user', 'username email role')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};

// @desc    Process a request (Admin Only)
// @route   PUT /api/access/request/:id
export const processRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED' or 'REJECTED'

        const accessRequest = await AccessRequest.findById(id).populate('user');
        if (!accessRequest) return res.status(404).json({ error: "Request not found" });

        if (accessRequest.status !== 'PENDING') {
            return res.status(400).json({ error: "This request has already been processed." });
        }

        accessRequest.status = status;
        accessRequest.processedBy = req.user.id;
        accessRequest.processedAt = new Date();
        await accessRequest.save();

        if (status === 'APPROVED') {
            // Elevate User Role
            await User.findByIdAndUpdate(accessRequest.user._id, { role: accessRequest.requestedRole });
        }

        // Audit Log
        const logEntry = {
            action: `ACCESS_REQUEST_${status}`,
            actor: req.user.id,
            actorDisplay: req.user.username,
            details: {
                requestId: id,
                targetUser: accessRequest.user.username,
                roleRequested: accessRequest.requestedRole
            }
        };

        await AuditLog.create({
            ...logEntry,
            integritySignature: signData(logEntry, process.env.MASTER_KEY)
        });

        res.json({ success: true, message: `Request ${status.toLowerCase()} successfully.` });

    } catch (err) {
        console.error("Process Request Error:", err);
        res.status(500).json({ error: "Failed to process request" });
    }
};
