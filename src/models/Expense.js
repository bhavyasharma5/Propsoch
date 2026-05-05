const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Expense = sequelize.define("Expense", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Total amount the payer shelled out
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "INR",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Who actually paid the bill
    paidBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    // Optional notes - sometimes you need to remember "this was for Goa trip"
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // equal = split evenly, exact = each member has a specific share
    // Keeping it simple for now, can add percentage later
    splitType: {
      type: DataTypes.ENUM("equal", "exact"),
      defaultValue: "equal",
    },
  });

  Expense.associate = (models) => {
    Expense.belongsTo(models.User, { foreignKey: "paidBy", as: "payer" });
    Expense.hasMany(models.ExpenseMember, { foreignKey: "expenseId", as: "members" });
  };

  return Expense;
};
