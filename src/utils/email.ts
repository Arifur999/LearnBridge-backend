import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host:   env.EMAIL_SENDER.SMTP_HOST,
  port:   Number(env.EMAIL_SENDER.SMTP_PORT),
  secure: true, // port 465 = SSL
  auth: {
    user: env.EMAIL_SENDER.SMTP_USER,
    pass: env.EMAIL_SENDER.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to:           string;
  subject:      string;
  templateName: string;
  templateData: Record<string, unknown>;
}

export const sendEmail = async ({
  to,
  subject,
  templateName,
  templateData,
}: SendEmailOptions) => {
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/templates/${templateName}.ejs`
    );

    const html = await ejs.renderFile(templatePath, templateData);

    const info = await transporter.sendMail({
      from:    env.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    // Don't crash the app if email fails — just log it
    console.error("Email sending error:", error instanceof Error ? error.message : error);
  }
};
