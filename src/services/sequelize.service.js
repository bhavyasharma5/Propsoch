const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const dbConfig = require("../config/database");

let sequelize;
const models = {};

async function initSequelize() {
  sequelize = new Sequelize(dbConfig);

  // Load all model files from the models directory
  const modelsDir = path.join(__dirname, "../models");
  const modelFiles = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js"));

  for (const file of modelFiles) {
    const modelFactory = require(path.join(modelsDir, file));
    const model = modelFactory(sequelize);
    models[model.name] = model;
  }

  // Set up associations after all models are loaded
  for (const model of Object.values(models)) {
    if (typeof model.associate === "function") {
      model.associate(models);
    }
  }

  // force: false = CREATE TABLE IF NOT EXISTS, safe for existing data
  // If you change model definitions during dev and need a fresh start,
  // just delete database.sqlite and restart
  await sequelize.sync({ force: false });

  console.log("Database connected and models synced");
  return { sequelize, models };
}

module.exports = { initSequelize, getModels: () => models, getSequelize: () => sequelize };
