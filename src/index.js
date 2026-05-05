require("dotenv").config();

const { initSequelize } = require("./services/sequelize.service");
const { initExpress } = require("./services/express.service");

(async () => {
  try {
    await initSequelize();
    await initExpress();
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
