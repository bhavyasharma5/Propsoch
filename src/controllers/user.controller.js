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
    const { User } = getModels();
    const user = await User.findByPk(req.userId);
    if (!user) throw new NotFoundError("User not found");

    await user.destroy();
    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, deleteAccount };
