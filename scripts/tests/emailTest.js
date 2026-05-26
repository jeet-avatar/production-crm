const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("✅ Env loaded:");
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS length:", process.env.SMTP_PASS?.length);
console.log("SMTP_HOST:", process.env.SMTP_HOST);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true", // false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mailOptions = {
  from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
  to: process.env.SMTP_USER, // send to yourself
  subject: "✅ Gmail SMTP Test - CRM System",
  text: "This is a test email sent from your Node.js CRM app using Gmail SMTP.",
};

(async () => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
})();
