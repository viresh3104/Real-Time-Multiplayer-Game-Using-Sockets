const { v4: uuidv4 } = require("uuid");
const Room = require("../model/RoomModel");

const createRoom = async (req, res) => {
  const { ownerSocketId } = req.body;
  if (!ownerSocketId) {
    return res.status(400).json({ error: "Owner socket ID is required" });
  }

  const roomToken = uuidv4();
  const ownerColor = "red";

  const newRoom = new Room({
    token: roomToken,
    ownerSocketId,
    players: [
      {
        socketId: ownerSocketId,
        color: ownerColor,
        pieces: [
          {
            pieceId: `${ownerColor}-1`,
            position: 0,
            isSafe: true,
            isHome: false,
          },
          {
            pieceId: `${ownerColor}-2`,
            position: 0,
            isSafe: true,
            isHome: false,
          },
          {
            pieceId: `${ownerColor}-3`,
            position: 0,
            isSafe: true,
            isHome: false,
          },
          {
            pieceId: `${ownerColor}-4`,
            position: 0,
            isSafe: true,
            isHome: false,
          },
        ],
      },
    ],
    gameState: {
      status: "waiting",
      currentTurn: null,
      diceValue: null,
      board: [],
      winner: null,
    },
    chatHistory: [],
  });

  const io = req.app.get("socket.io");
  io.sockets.sockets.get(ownerSocketId)?.join(roomToken);

  io.to(ownerSocketId).emit("roomCreated", {
    roomToken,
    playerColor: ownerColor,
  });

  await newRoom.save();
  res.status(200).json({ roomToken, playerColor: ownerColor });
};

const JoinRoom = async (req, res) => {
  try {
    const { roomToken, playerSocketId } = req.body;
    if (!roomToken || !playerSocketId) {
      return res
        .status(400)
        .json({ error: "Room token and player socket ID are required" });
    }
    // Find room by token
    const room = await Room.findOne({ token: roomToken });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    // Check if room is in waiting state
    if (room.gameState.status !== "waiting") {
      return res.status(400).json({ error: "Room is not accepting players" });
    }
    // Check if room has less than 4 players
    if (room.players.length >= 4) {
      return res.status(400).json({ error: "Room is full" });
    }
    // Check if player is already in the room (including if they're the owner)
    if (room.players.some((player) => player.socketId === playerSocketId)) {
      // If the player is already in the room, return their existing color
      const existingPlayer = room.players.find(
        (player) => player.socketId === playerSocketId
      );
      return res.status(200).json({
        message: "Player already in room",
        roomToken,
        playerColor: existingPlayer.color,
      });
    }
    // Assign a unique color to the new player
    const availableColors = ["red", "blue", "green", "yellow"].filter(
      (color) => !room.players.some((player) => player.color === color)
    );
    const playerColor = availableColors[0];
    room.players.push({
      socketId: playerSocketId,
      color: playerColor,
      pieces: [
        {
          pieceId: `${playerColor}-1`,
          position: 0,
          isSafe: true,
          isHome: false,
        },
        {
          pieceId: `${playerColor}-2`,
          position: 0,
          isSafe: true,
          isHome: false,
        },
        {
          pieceId: `${playerColor}-3`,
          position: 0,
          isSafe: true,
          isHome: false,
        },
        {
          pieceId: `${playerColor}-4`,
          position: 0,
          isSafe: true,
          isHome: false,
        },
      ],
    });
    // Save updated room
    await room.save();
    const io = req.app.get("socket.io");
    io.sockets.sockets.get(playerSocketId)?.join(roomToken);
    io.to(roomToken).emit("playerJoined", {
      roomToken,
      playerSocketId,
      playerColor,
    });
    res
      .status(200)
      .json({ message: "Joined room successfully", roomToken, playerColor });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createRoom,
  JoinRoom,
};
