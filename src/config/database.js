const path = require("path");

// Using SQLite so there's no external DB server to set up
// The file gets created at the path specified in .env
module.exports = {
  dialect: "sqlite",
  storage: path.resolve(process.env.DB_PATH || "./database.sqlite"),
  logging: false, // set to console.log if you want to see SQL queries
  define: {
    timestamps: true,
    underscored: false,
  },
};
