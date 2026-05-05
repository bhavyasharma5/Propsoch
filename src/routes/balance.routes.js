const { Router } = require("express");
const auth = require("../middlewares/auth.middleware");
const { getBalances, getBalanceWithUser, sendMonthlyReportEmail } = require("../controllers/balance.controller");

const router = Router();

router.get("/balances", auth, getBalances);
router.get("/balances/:userId", auth, getBalanceWithUser);
router.post("/balances/monthly-report", auth, sendMonthlyReportEmail);

module.exports = router;
