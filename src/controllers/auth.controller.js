const jwt = require("jsonwebtoken");
const yup = require("yup");
const { getModels } = require("../services/sequelize.service");
const { BadRequestError } = require("../utils/ApiError");

const signupSchema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters").required(),
  defaultCurrency: yup.string().max(10).default("INR"),
});

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

async function signup(req, res, next) {
  try {
    const data = await signupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const { User } = getModels();

    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestError("An account with this email already exists");

    const user = await User.create({
      name: data.name,
      email: data.email,
      password_hash: data.password, // beforeSave hook will hash it
      defaultCurrency: data.defaultCurrency,
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || "7d",
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: user.toSafeJSON(), token },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await loginSchema.validate(req.body, { abortEarly: false });
    const { User } = getModels();

    const user = await User.findOne({ where: { email: data.email } });

    // Using the same error for both cases intentionally - don't leak which part was wrong
    if (!user || !(await user.checkPassword(data.password))) {
      throw new BadRequestError("Invalid email or password");
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || "7d",
    });

    res.json({
      success: true,
      data: { user: user.toSafeJSON(), token },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };
