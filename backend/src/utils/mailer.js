import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// NOTE: Do NOT initialize clients at module top-level!
// ES module imports are evaluated BEFORE dotenv.config() runs in index.js,
// so process.env.* would be undefined here. All env reads are lazy (inside sendEmail).
let _resendClient = null;
let _transporter = null;

const getResendClient = () => {
  if (!_resendClient && process.env.RESEND_API_KEY) {
    _resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return _resendClient;
};

const getTransporter = () => {
  if (!_transporter && process.env.EMAIL_USER) {
    _transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return _transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  // Debug: log which provider will be used
  const provider = process.env.BREVO_API_KEY ? 'Brevo' :
                   process.env.RESEND_API_KEY ? 'Resend' :
                   process.env.EMAIL_USER ? 'Nodemailer SMTP' : 'NONE';
  console.log(`[Mailer] Sending to ${Array.isArray(to) ? to.join(', ') : to} via ${provider}`);

  if (provider === 'NONE') {
    const err = new Error('No email provider configured. Set BREVO_API_KEY, RESEND_API_KEY, or EMAIL_USER/EMAIL_PASS.');
    console.error('[Mailer]', err.message);
    throw err;
  }

  // 1. BREVO HTTP API (Works for ANY recipient email address without domain verification)
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || 'kls2edmentre@gmail.com';
      const senderName = 'AKIRA Security';
      const recipients = (Array.isArray(to) ? to : [to]).map(e => ({ email: e }));

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: recipients,
          subject,
          textContent: text,
          htmlContent: html || `<p>${text}</p>`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Brevo API Error:", data);
        throw new Error(data.message || JSON.stringify(data));
      }

      console.log("📨 Brevo Email Accepted by Server:", JSON.stringify(data));
      return { success: true, data };
    } catch (err) {
      console.error("Brevo HTTP Email failed:", err.message);
      throw err;
    }
  }

  // 2. RESEND API
  const resendClient = getResendClient();
  if (resendClient) {
    try {
      const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const recipientList = Array.isArray(to) ? to : [to];

      const { data, error } = await resendClient.emails.send({
        from,
        to: recipientList,
        subject,
        text,
        html: html || `<p>${text}</p>`
      });

      if (error) {
        console.error("Resend API Error:", error);
        throw new Error(typeof error === 'object' ? JSON.stringify(error) : error);
      }

      return { success: true, data };
    } catch (err) {
      console.error("Resend HTTP Email failed:", err.message);
      throw err;
    }
  }

  // 3. FALLBACK TO NODEMAILER SMTP (local dev)
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Nodemailer SMTP not configured: EMAIL_USER is missing.');
  }
  try {
    const info = await transporter.sendMail({
      from: `"AKIRA Security" <${process.env.EMAIL_USER || 'no-reply@akira.sec'}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, info };
  } catch (err) {
    console.error("SMTP Email failed:", err.message);
    throw err;
  }
};
