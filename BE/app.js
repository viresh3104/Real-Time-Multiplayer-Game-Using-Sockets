const express = require("express");
const cors = require("cors");
const router = require("./src/Router/router");

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Routes
app.use("/api", router);

module.exports = app;
