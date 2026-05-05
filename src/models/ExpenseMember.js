const { DataTypes } = require("sequelize");

// This table tracks how much each person owes in a given expense.
// The payer is also a member (they owe their own share to themselves, effectively).
module.exports = (sequelize) => {
  const ExpenseMember = sequelize.define("ExpenseMember", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    expenseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Expenses", key: "id" },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    // How much this person owes toward this expense
    share: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  });

  ExpenseMember.associate = (models) => {
    ExpenseMember.belongsTo(models.Expense, { foreignKey: "expenseId" });
    ExpenseMember.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return ExpenseMember;
};
