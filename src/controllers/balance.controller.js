const moment = require("moment");
const { getModels } = require("../services/sequelize.service");
const { calculateBalances } = require("../services/balance.service");
const { sendMonthlyReport } = require("../services/email.service");
const { NotFoundError } = require("../utils/ApiError");

// View all balances for the logged-in user
async function getBalances(req, res, next) {
  try {
    const balances = await calculateBalances(req.userId);
    res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
}

// Balance with a specific user
async function getBalanceWithUser(req, res, next) {
  try {
    const { User } = getModels();
    const otherUserId = parseInt(req.params.userId);

    const otherUser = await User.findByPk(otherUserId);
    if (!otherUser) throw new NotFoundError("User not found");

    const allBalances = await calculateBalances(req.userId);
    const balance = allBalances.find((b) => b.userId === otherUserId);

    res.json({
      success: true,
      data: balance || {
        userId: otherUserId,
        otherUser: otherUser.name,
        netAmount: 0,
        currency: "INR",
        message: "You're all settled up!",
      },
    });
  } catch (err) {
    next(err);
  }
}

// Sends the logged-in user a monthly balance report via email
async function sendMonthlyReportEmail(req, res, next) {
  try {
    const { User } = getModels();

    const user = await User.findByPk(req.userId);
    if (!user) throw new NotFoundError("User not found");

    const balances = await calculateBalances(req.userId);
    const month = req.body.month || moment().format("MMMM YYYY");

    const info = await sendMonthlyReport(user.email, user.name, balances, month);

    res.json({
      success: true,
      message: `Monthly report sent to ${user.email}`,
      // Include preview URL if using Ethereal (test SMTP) - very handy during dev
      previewUrl: info.messageId
        ? `Check your inbox or use https://ethereal.email for test emails`
        : undefined,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBalances, getBalanceWithUser, sendMonthlyReportEmail };
