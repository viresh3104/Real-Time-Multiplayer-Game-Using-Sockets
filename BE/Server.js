const app = require("./app");
const dotenv = require("dotenv");
const http = require("http");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
dotenv.config({ path: "./config.env" });

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket"],
});
app.set("socket.io", io);
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("Connected to db, yeahhhhhh 🎉"))
  .catch((err) => console.error("Database connection error:"));

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server has Started on port ${PORT}`));
