const express = require("express");
const router = express.Router();
const { createRoom, JoinRoom } = require("../Controller/roomController");

router.post("/create", createRoom);
router.post("/join", JoinRoom);

module.exports = router;
