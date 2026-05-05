const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    // We never expose this field - it's always password going in, password_hash coming out
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Default currency for displaying balances. Users can set their own preference.
    defaultCurrency: {
      type: DataTypes.STRING(10),
      defaultValue: "INR",
    },
  });

  // Hash before every save - handles both create and update
  User.addHook("beforeSave", async (user) => {
    if (user.changed("password_hash") && !user.password_hash.startsWith("$2")) {
      user.password_hash = await bcrypt.hash(user.password_hash, 10);
    }
  });

  User.prototype.checkPassword = function (plainText) {
    return bcrypt.compare(plainText, this.password_hash);
  };

  // strip the hash out before sending user data anywhere
  User.prototype.toSafeJSON = function () {
    const { password_hash, ...safe } = this.toJSON();
    return safe;
  };

  User.associate = (models) => {
    // expenses this user created / paid for
    User.hasMany(models.Expense, { foreignKey: "paidBy", as: "expensesPaid" });
    // expenses this user is a member of (owes money in)
    User.hasMany(models.ExpenseMember, { foreignKey: "userId", as: "expenseMemberships" });
  };

  return User;
};
