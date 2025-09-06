const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  socketId: String,
  color: { type: String, enum: ["red", "blue", "green", "yellow"] },
  name: { type: String, default: "Anonymous" },
  pieces: [{ id: Number, position: Number }],
});

const roomSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true },
  ownerSocketId: String,
  players: [playerSchema],
  gameState: {
    status: {
      type: String,
      enum: ["waiting", "ongoing", "paused", "finished"],
      default: "waiting",
    },
    currentTurn: String,
    diceValue: Number,
    board: Array,
    winner: String,
  },
  chatHistory: [
    {
      senderColor: String,
      message: String,
      privateTo: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Room", roomSchema);
