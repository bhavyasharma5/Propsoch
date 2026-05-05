const nodemailer = require("nodemailer");

let transporter;

// Lazy init - only set up the transporter when we actually need to send something
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMonthlyReport(toEmail, userName, balances, month) {
  const transport = getTransporter();

  // Build a simple text summary of what everyone owes / is owed
  let balanceSummary = "";
  if (balances.length === 0) {
    balanceSummary = "You're all settled up! No outstanding balances.";
  } else {
    balances.forEach((b) => {
      if (b.netAmount > 0) {
        balanceSummary += `• ${b.otherUser} owes you ${b.currency} ${Math.abs(b.netAmount).toFixed(2)}\n`;
      } else if (b.netAmount < 0) {
        balanceSummary += `• You owe ${b.otherUser} ${b.currency} ${Math.abs(b.netAmount).toFixed(2)}\n`;
      }
    });
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || "splitwise-mvp@example.com",
    to: toEmail,
    subject: `Your Splitwise Summary for ${month}`,
    text: `Hi ${userName},\n\nHere's your balance summary for ${month}:\n\n${balanceSummary}\n\nStay on top of your expenses!\n\nSplitwise MVP`,
    html: `
      <h2>Hi ${userName},</h2>
      <p>Here's your balance summary for <strong>${month}</strong>:</p>
      <pre style="font-family: monospace; background: #f4f4f4; padding: 12px; border-radius: 4px;">${balanceSummary}</pre>
      <p>Stay on top of your expenses!</p>
      <p><em>Splitwise MVP</em></p>
    `,
  };

  const info = await transport.sendMail(mailOptions);
  return info;
}

module.exports = { sendMonthlyReport };
