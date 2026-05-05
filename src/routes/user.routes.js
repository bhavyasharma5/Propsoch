const { Router } = require("express");
const auth = require("../middlewares/auth.middleware");
const { getProfile, updateProfile, deleteAccount } = require("../controllers/user.controller");

const router = Router();

router.get("/users/me", auth, getProfile);
router.put("/users/me", auth, updateProfile);
router.delete("/users/me", auth, deleteAccount);

module.exports = router;
