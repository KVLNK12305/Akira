import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, text, html }) => {
  // 1. BREVO HTTP API (Works for ANY recipient email address without domain verification)
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.EMAIL_USER || 'kls2edmentre@gmail.com';
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

      return { success: true, data };
    } catch (err) {
      console.error("Brevo HTTP Email failed:", err.message);
      throw err;
    }
  }

  // 2. RESEND API
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
