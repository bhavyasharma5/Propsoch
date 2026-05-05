const { Router } = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  getActivityLog,
} = require("../controllers/expense.controller");

const router = Router();

// Note: /expenses/activity must come before /expenses/:id
// otherwise Express will try to match "activity" as an ID
router.get("/expenses/activity", auth, getActivityLog);

router.post("/expenses", auth, createExpense);
router.get("/expenses/:id", auth, getExpense);
router.put("/expenses/:id", auth, updateExpense);
router.delete("/expenses/:id", auth, deleteExpense);

module.exports = router;
