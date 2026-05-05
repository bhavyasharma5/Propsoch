const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const errorHandler = require("../middlewares/errorHandler.middleware");

const app = express();

async function initExpress() {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Health check - handy for quick "is the server up?" checks
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  // Auto-load all route files
  const routesDir = path.join(__dirname, "../routes");
  const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".routes.js"));

  for (const file of routeFiles) {
    const router = require(path.join(routesDir, file));
    app.use("/api", router);
  }

  app.use(errorHandler);

  const port = process.env.SERVER_PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  return app;
}

module.exports = { initExpress, getApp: () => app };
