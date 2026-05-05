const yup = require("yup");
const { getModels } = require("../services/sequelize.service");
const { NotFoundError, BadRequestError } = require("../utils/ApiError");

const updateSchema = yup.object({
  name: yup.string().optional(),
  email: yup.string().email("Enter a valid email").optional(),
  defaultCurrency: yup.string().max(10).optional(),
});

async function getProfile(req, res, next) {
  try {
    const { User } = getModels();
    const user = await User.findByPk(req.userId);
    if (!user) throw new NotFoundError("User not found");

    res.json({ success: true, data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const data = await updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const { User } = getModels();

    const user = await User.findByPk(req.userId);
    if (!user) throw new NotFoundError("User not found");

    // Check email uniqueness if they're changing it
    if (data.email && data.email !== user.email) {
      const emailTaken = await User.findOne({ where: { email: data.email } });
      if (emailTaken) throw new BadRequestError("This email is already in use");
    }

    await user.update(data);

    res.json({ success: true, message: "Profile updated", data: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const { User, Expense, ExpenseMember } = getModels();
    const { getSequelize } = require("../services/sequelize.service");
    const sequelize = getSequelize();

    const user = await User.findByPk(req.userId);
    if (!user) throw new NotFoundError("User not found");

    // SQLite enforces FK constraints - need to clean up related records first
    await sequelize.transaction(async (t) => {
      // Remove this user from all expense member lists
      await ExpenseMember.destroy({ where: { userId: req.userId }, transaction: t });

      // Delete expenses this user paid for (also cleans up their members)
      const myExpenses = await Expense.findAll({ where: { paidBy: req.userId }, transaction: t });
      for (const expense of myExpenses) {
        await ExpenseMember.destroy({ where: { expenseId: expense.id }, transaction: t });
      }
      await Expense.destroy({ where: { paidBy: req.userId }, transaction: t });

      await user.destroy({ transaction: t });
    });

    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, deleteAccount };
