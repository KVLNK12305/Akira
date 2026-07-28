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
  const from = process.env.EMAIL_FROM || 'AKIRA Security <onboarding@resend.dev>';

  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from,
        to,
        subject,
        text,
        html
      });

      if (response.error) {
        console.error("Resend API Error:", response.error.message || response.error);
        throw new Error(response.error.message || "Resend API Error");
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Resend HTTP Email failed:", error.message);
      throw error;
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
  } catch (error) {
    console.error("SMTP Email failed:", error.message);
    throw error;
  }
};
