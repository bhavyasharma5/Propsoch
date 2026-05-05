const { getModels, getSequelize } = require("./sequelize.service");
const { Op } = require("sequelize");

// Core balance calculation logic lives here so both the API and the email
// report can use the same numbers
async function calculateBalances(userId) {
  const { Expense, ExpenseMember, User } = getModels();
  const sequelize = getSequelize();

  // Fetch all expenses where this user is either the payer or a member
  const expensesIPaid = await Expense.findAll({
    where: { paidBy: userId },
    include: [{ model: ExpenseMember, as: "members" }],
  });

  const myMemberships = await ExpenseMember.findAll({
    where: { userId },
    include: [
      {
        model: Expense,
        where: { paidBy: { [Op.ne]: userId } }, // expenses someone else paid
      },
    ],
  });

  // Map of otherUserId -> { theyOweMe, iOweThem, currency }
  const balanceMap = {};

  // Go through each expense I paid and tally what others owe me
  for (const expense of expensesIPaid) {
    for (const member of expense.members) {
      if (member.userId === userId) continue; // skip my own share

      if (!balanceMap[member.userId]) {
        balanceMap[member.userId] = { theyOweMe: 0, iOweThem: 0, currency: expense.currency };
      }
      balanceMap[member.userId].theyOweMe += parseFloat(member.share);
    }
  }

  // Go through expenses others paid and tally what I owe them
  for (const membership of myMemberships) {
    const expense = membership.Expense;
    const payerId = expense.paidBy;

    if (!balanceMap[payerId]) {
      balanceMap[payerId] = { theyOweMe: 0, iOweThem: 0, currency: expense.currency };
    }
    balanceMap[payerId].iOweThem += parseFloat(membership.share);
  }

  // Pull user info for all involved users
  const otherUserIds = Object.keys(balanceMap).map(Number);
  if (otherUserIds.length === 0) return [];

  const users = await User.findAll({ where: { id: otherUserIds } });
  const userMap = {};
  users.forEach((u) => (userMap[u.id] = u));

  // Build the final list - positive = they owe me, negative = I owe them
  const balances = otherUserIds.map((otherId) => {
    const b = balanceMap[otherId];
    const net = b.theyOweMe - b.iOweThem;
    return {
      userId: otherId,
      otherUser: userMap[otherId]?.name || "Unknown",
      otherUserEmail: userMap[otherId]?.email,
      netAmount: parseFloat(net.toFixed(2)),
      currency: b.currency,
    };
  });

  // Only return non-zero balances - settled up pairs aren't interesting
  return balances.filter((b) => b.netAmount !== 0);
}

module.exports = { calculateBalances };
