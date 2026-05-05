const yup = require("yup");
const moment = require("moment");
const { Op } = require("sequelize");
const { getModels, getSequelize } = require("../services/sequelize.service");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/ApiError");

const expenseSchema = yup.object({
  name: yup.string().required("Expense name is required"),
  totalAmount: yup.number().positive("Amount must be positive").required(),
  currency: yup.string().max(10).default("INR"),
  date: yup.string().required("Date is required"),
  notes: yup.string().optional().nullable(),
  splitType: yup.string().oneOf(["equal", "exact"]).default("equal"),
  // members is an array of userIds (equal split) OR { userId, share } objects (exact split)
  members: yup.array().min(1, "At least one member is required").required(),
});

async function createExpense(req, res, next) {
  try {
    const data = await expenseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const { Expense, ExpenseMember, User } = getModels();
    const sequelize = getSequelize();

    // Normalize members to always be { userId } objects
    const memberList = data.members.map((m) =>
      typeof m === "object" ? m : { userId: parseInt(m) }
    );

    // Verify all mentioned users actually exist
    const memberIds = memberList.map((m) => m.userId);
    // The payer should be included in the members list - if they left themselves out, add them
    if (!memberIds.includes(req.userId)) {
      memberIds.push(req.userId);
      memberList.push({ userId: req.userId });
    }

    const users = await User.findAll({ where: { id: memberIds } });
    if (users.length !== memberIds.length) {
      throw new BadRequestError("One or more members don't exist");
    }

    // Calculate each person's share
    let shares;
    if (data.splitType === "equal") {
      const perPerson = parseFloat((data.totalAmount / memberList.length).toFixed(2));
      shares = memberList.map((m) => ({ userId: m.userId, share: perPerson }));
    } else {
      // Exact split - validate that shares add up to totalAmount
      shares = memberList.map((m) => ({ userId: m.userId, share: parseFloat(m.share || 0) }));
      const total = shares.reduce((sum, s) => sum + s.share, 0);
      if (Math.abs(total - data.totalAmount) > 0.01) {
        throw new BadRequestError(
          `Shares (${total}) don't add up to the total amount (${data.totalAmount})`
        );
      }
    }

    // Wrap in transaction so we don't get a dangling expense with no members
    const expense = await sequelize.transaction(async (t) => {
      const newExpense = await Expense.create(
        {
          name: data.name,
          totalAmount: data.totalAmount,
          currency: data.currency,
          date: data.date,
          paidBy: req.userId,
          notes: data.notes,
          splitType: data.splitType,
        },
        { transaction: t }
      );

      await ExpenseMember.bulkCreate(
        shares.map((s) => ({ expenseId: newExpense.id, ...s })),
        { transaction: t }
      );

      return newExpense;
    });

    const result = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseMember, as: "members", include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }] },
        { model: User, as: "payer", attributes: ["id", "name", "email"] },
      ],
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getExpense(req, res, next) {
  try {
    const { Expense, ExpenseMember, User } = getModels();

    const expense = await Expense.findByPk(req.params.id, {
      include: [
        { model: ExpenseMember, as: "members", include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }] },
        { model: User, as: "payer", attributes: ["id", "name", "email"] },
      ],
    });

    if (!expense) throw new NotFoundError("Expense not found");

    // Only people in the expense can see it
    const isMember = expense.members.some((m) => m.userId === req.userId);
    const isPayer = expense.paidBy === req.userId;
    if (!isMember && !isPayer) throw new ForbiddenError("You're not part of this expense");

    res.json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const { Expense, ExpenseMember, User } = getModels();
    const sequelize = getSequelize();

    const expense = await Expense.findByPk(req.params.id, {
      include: [{ model: ExpenseMember, as: "members" }],
    });

    if (!expense) throw new NotFoundError("Expense not found");
    // Only the person who created/paid can edit it
    if (expense.paidBy !== req.userId) throw new ForbiddenError("Only the payer can edit this expense");

    const allowed = ["name", "totalAmount", "currency", "date", "notes", "splitType", "members"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    await sequelize.transaction(async (t) => {
      if (updates.members) {
        const memberList = updates.members.map((m) =>
          typeof m === "object" ? m : { userId: parseInt(m) }
        );
        const memberIds = memberList.map((m) => m.userId);
        if (!memberIds.includes(req.userId)) memberList.push({ userId: req.userId });

        const totalAmount = updates.totalAmount || expense.totalAmount;
        const splitType = updates.splitType || expense.splitType;

        let shares;
        if (splitType === "equal") {
          const perPerson = parseFloat((totalAmount / memberList.length).toFixed(2));
          shares = memberList.map((m) => ({ userId: m.userId, share: perPerson }));
        } else {
          shares = memberList.map((m) => ({ userId: m.userId, share: parseFloat(m.share || 0) }));
        }

        // Easiest approach: delete old members and recreate
        await ExpenseMember.destroy({ where: { expenseId: expense.id }, transaction: t });
        await ExpenseMember.bulkCreate(
          shares.map((s) => ({ expenseId: expense.id, ...s })),
          { transaction: t }
        );
        delete updates.members;
      }

      await expense.update(updates, { transaction: t });
    });

    const result = await Expense.findByPk(expense.id, {
      include: [
        { model: ExpenseMember, as: "members", include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }] },
        { model: User, as: "payer", attributes: ["id", "name", "email"] },
      ],
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const { Expense } = getModels();

    const expense = await Expense.findByPk(req.params.id);
    if (!expense) throw new NotFoundError("Expense not found");
    if (expense.paidBy !== req.userId) throw new ForbiddenError("Only the payer can delete this expense");

    await expense.destroy();
    res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    next(err);
  }
}

// Activity log - expenses the user is involved in, grouped by time period
async function getActivityLog(req, res, next) {
  try {
    const { Expense, ExpenseMember, User } = getModels();
    const { startDate, endDate } = req.query;

    let dateFilter = {};

    if (startDate && endDate) {
      // Custom date range
      dateFilter = { date: { [Op.between]: [startDate, endDate] } };
    } else {
      // Default: current month + last month
      const thisMonthStart = moment().startOf("month").format("YYYY-MM-DD");
      const lastMonthStart = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      dateFilter = { date: { [Op.gte]: lastMonthStart } };
    }

    // Find all expenses this user is part of (as payer or member)
    const myMembershipExpenseIds = await ExpenseMember.findAll({
      where: { userId: req.userId },
      attributes: ["expenseId"],
    }).then((rows) => rows.map((r) => r.expenseId));

    const expenses = await Expense.findAll({
      where: {
        [Op.and]: [
          dateFilter,
          {
            [Op.or]: [
              { paidBy: req.userId },
              { id: { [Op.in]: myMembershipExpenseIds } },
            ],
          },
        ],
      },
      include: [
        { model: ExpenseMember, as: "members", include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }] },
        { model: User, as: "payer", attributes: ["id", "name", "email"] },
      ],
      order: [["date", "DESC"]],
    });

    // Group by month
    const grouped = {};
    const currentMonth = moment().format("MMMM YYYY");
    const lastMonth = moment().subtract(1, "month").format("MMMM YYYY");

    expenses.forEach((expense) => {
      const expenseMonth = moment(expense.date).format("MMMM YYYY");
      let groupKey;

      if (startDate && endDate) {
        groupKey = "Custom Range";
      } else if (expenseMonth === currentMonth) {
        groupKey = "This Month";
      } else if (expenseMonth === lastMonth) {
        groupKey = "Last Month";
      } else {
        groupKey = expenseMonth;
      }

      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(expense);
    });

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, getExpense, updateExpense, deleteExpense, getActivityLog };
