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
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const recipientList = Array.isArray(to) ? to : [to];

  if (resendClient) {
    try {
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

  // Fallback to Nodemailer SMTP (local dev)
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
