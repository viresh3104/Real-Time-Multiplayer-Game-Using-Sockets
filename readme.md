# Ludo Game Project Functionality Outline

## Project Overview

The Ludo game is a real-time multiplayer application built with **Node.js**, **Angular**, **MongoDB**, and **Socket.io**. It supports four players playing simultaneously with standard Ludo rules, including dice rolls, piece movement, captures, safe zones, and win conditions. The application features real-time communication for player joins, game moves, and chat (group and private messages), with MongoDB persistence for room data, game state, and optional chat history. The project is a learning exercise focused on WebSockets, data packets, and real-time interactions.

### Key Features

- **Home Screen**: Users can create a room or join an existing room using a unique room token.
- **Waiting Area**: The room owner waits for three other players to join via the room token. The owner can start the game once exactly four players are present.
- **Game Play**: Four players, each assigned a unique color (red, blue, green, yellow), follow standard Ludo rules:
  - Roll a die (1-6) to move pieces.
  - A roll of 6 is required to move a piece out of the home base.
  - Capture opponent pieces by landing on the same position (except in safe zones).
  - Safe zones (e.g., starting positions, home path) protect pieces from capture.
  - Win by moving all four pieces to the home triangle.
- **Chat**: Players can send group or private messages during the waiting phase and gameplay.
- **Real-Time Communication**: Socket.io handles player joins, game moves, and chat with JSON data packets.
- **Persistence**: MongoDB stores room data, game state, and chat history.

## Project Structure

### Folder Structure

```
Root/
├── FE/                     # Frontend (Angular)
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── home/                    # Home screen for creating/joining rooms
│   │   │   │   │   ├── home.component.ts
│   │   │   │   │   ├── home.component.html
│   │   │   │   │   ├── home.component.scss
│   │   │   │   ├── waiting/                 # Waiting area for players
│   │   │   │   │   ├── waiting.component.ts
│   │   │   │   │   ├── waiting.component.html
│   │   │   │   │   ├── waiting.component.scss
│   │   │   │   ├── chat/                    # Chat interface for messaging
│   │   │   │   │   ├── chat.component.ts
│   │   │   │   │   ├── chat.component.html
│   │   │   │   │   ├── chat.component.scss
│   │   │   │   ├── game-board/              # Game board for gameplay
│   │   │   │   │   ├── game-board.component.ts
│   │   │   │   │   ├── game-board.component.html
│   │   │   │   │   ├── game-board.component.scss
│   │   │   ├── services/
│   │   │   │   ├── home.service.ts          # Manages room creation/joining
│   │   │   │   ├── waiting.service.ts       # Manages waiting room logic
│   │   │   │   ├── game-board.service.ts    # Manages gameplay and chat logic
│   │   │   ├── app.module.ts                # Angular module configuration
│   │   │   ├── app-routing.module.ts        # Routing configuration
│   │   ├── environments/
│   │   │   ├── environment.ts              # API URL configuration
├── BE/                     # Backend (Node.js)
│   ├── controller/
│   │   ├── roomController.js               # Room-related API endpoints
│   ├── model/
│   │   ├── roomModel.js                    # MongoDB schema definitions
│   ├── router/
│   │   ├── roomRouter.js                   # API route definitions
│   ├── server.js                           # Express server with Socket.io
```

### Database Schema (MongoDB)

```javascript
const mongoose = require("mongoose");

const pieceSchema = new mongoose.Schema({
  pieceId: String, // Unique piece ID (e.g., "red-1")
  position: Number, // Position on board (0 for home base, 1-52 for main path, 53-58 for home path)
  isSafe: Boolean, // True if in safe zone (e.g., home base, starting position)
  isHome: Boolean, // True if in home triangle
});

const playerSchema = new mongoose.Schema({
  socketId: String, // Player's Socket.io ID
  color: String, // Player's color (red, blue, green, yellow)
  pieces: [pieceSchema], // Four pieces per player
});

const roomSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true }, // UUID room token
  ownerSocketId: String, // Socket ID of room owner
  players: [playerSchema], // List of players
  gameState: {
    status: {
      type: String,
      enum: ["waiting", "ongoing", "paused", "finished"],
      default: "waiting",
    },
    currentTurn: String, // Current player's color
    diceValue: Number, // Last rolled dice value
    board: Array, // Board state (52 positions + home paths)
    winner: String, // Winner's color (if finished)
  },
  chatHistory: [
    {
      senderColor: String, // Sender's color
      message: String, // Message content
      privateTo: String, // Optional: recipient socket ID for private messages
      timestamp: { type: Date, default: Date.now }, // Message timestamp
    },
  ],
});

module.exports = mongoose.model("Room", roomSchema);
```

## Functionality Details

### 1. Home Screen

**Purpose**: Entry point for users to create or join a room.

- **Frontend**:
  - **Component**: `HomeComponent` (`FE/src/app/components/home/home.component.ts`)
    - Displays two buttons: "Create Room" and "Join Room".
    - Input field for entering a room token to join.
    - Calls `HomeService.createRoom` on "Create Room" click.
    - Calls `HomeService.joinRoom` on "Join Room" click or Enter key in the input field.
    - Navigates to `/waiting/:roomToken` on successful room creation or join.
  - **Service**: `HomeService` (`FE/src/app/services/home.service.ts`)
    - `createRoom()`: Sends POST `/api/room/create` with `ownerSocketId`. Listens for `roomCreated` Socket.io event to auto-join the owner and navigate.
    - `joinRoom(roomToken)`: Sends POST `/api/room/join` with `roomToken` and `playerSocketId`. Sets player color in `GameBoardService` and joins Socket.io room via `WaitingService`.
    - `onRoomCreated()`: Observable for `roomCreated` Socket.io event.
  - **Template**: `home.component.html`
    - Button for creating a room: `<button (click)="startGame()">Create Room</button>`.
    - Input and button for joining: `<input [(ngModel)]="roomToken" (keyup.enter)="joinRoom()">` and `<button (click)="joinRoom()">Join Room</button>`.
- **Backend**:
  - **Endpoint**: `createRoom` (`BE/controller/roomController.js`)
    - Input: `{ ownerSocketId: string }`
    - Generates UUID room token.
    - Creates room document with `token`, `ownerSocketId`, empty `players` array, and initial `gameState` (`status: 'waiting'`).
    - Saves to MongoDB.
    - Emits `roomCreated` event with `{ roomToken }` to `ownerSocketId`.
    - Response: `{ roomToken: string }` (HTTP 201).
  - **Endpoint**: `joinRoom` (`BE/controller/roomController.js`)
    - Input: `{ roomToken: string, playerSocketId: string }`
    - Validates room exists and is in `waiting` state.
    - Checks if room has fewer than 4 players and player is not already joined.
    - Assigns a unique color from `['red', 'blue', 'green', 'yellow']`.
    - Adds player to `players` array with `socketId`, `color`, and four pieces (`pieceId`, `position: 0`, `isSafe: true`, `isHome: false`).
    - Saves updated room.
    - Joins player to Socket.io room (`roomToken`).
    - Emits `playerJoined` event with `{ playerSocketId, playerColor, players: [{ socketId, color }, ...] }`.
    - Response: `{ message: string, roomToken: string, playerColor: string }` (HTTP 200).
  - **Route**: `roomRouter.js`
    - `POST /api/room/create`
    - `POST /api/room/join`
- **Data Packets**:
  - **createRoom**: `{ ownerSocketId: string }`
  - **roomCreated**: `{ roomToken: string }`
  - **joinRoom**: `{ roomToken: string, playerSocketId: string }`
  - **playerJoined**: `{ playerSocketId: string, playerColor: string, players: [{ socketId: string, color: string }, ...] }`
- **Status**: Fully implemented. Owner auto-joins after creation, and players join via room token, populating the `players` schema.

### 2. Waiting Room

**Purpose**: Displays joined players and allows the owner to start the game when four players are present.

- **Frontend**:
  - **Component**: `WaitingComponent` (`FE/src/app/components/waiting/waiting.component.ts`)
    - Retrieves `roomToken` from route (`/waiting/:roomToken`).
    - Checks if the user is the owner (`socketId === ownerSocketId`).
    - Displays room token and list of players (updated via `playerJoined`).
    - Owner sees a "Start Game" button, enabled only when `players.length === 4`.
    - Calls `WaitingService.startGame` on button click.
    - Navigates to `/game-board/:roomToken` on `gameStarted` event.
  - **Service**: `WaitingService` (`FE/src/app/services/waiting.service.ts`)
    - `joinWaitingRoom(roomToken)`: Emits `joinWaitingRoom` Socket.io event with `{ roomToken, socketId }`.
    - `leaveWaitingRoom(roomToken)`: Emits `leaveWaitingRoom` Socket.io event.
    - `onPlayerJoined()`: Observable for `playerJoined` event to update players list.
    - `startGame(roomToken)`: Sends POST `/api/room/start` with `{ roomToken, socketId }`.
    - `onGameStarted()`: Observable for `gameStarted` event.
  - **Template**: `waiting.component.html`
    - Shows room token: `<h2>Waiting Room: {{ roomToken }}</h2>`.
    - Lists players: `<li *ngFor="let player of players">{{ player.color | titlecase }} ({{ player.socketId }})</li>`.
    - Start button for owner: `<button [disabled]="players.length !== 4" (click)="startGame()">Start Game</button>`.
- **Backend**:
  - **Endpoint**: `startGame` (`BE/controller/roomController.js`)
    - Input: `{ roomToken: string, socketId: string }`
    - Validates room exists, requester is owner, and exactly 4 players are joined.
    - Updates `gameState` to `ongoing`, sets `currentTurn` to first player’s color, initializes board.
    - Saves updated room.
    - Emits `gameStarted` event with `{ roomToken, currentTurn }`.
    - Response: `{ message: string }` (HTTP 200).
  - **Socket.io**: `server.js`
    - Handles `joinWaitingRoom` and `leaveWaitingRoom` events to manage Socket.io rooms.
- **Data Packets**:
  - **joinWaitingRoom**: `{ roomToken: string, socketId: string }`
  - **leaveWaitingRoom**: `{ roomToken: string, socketId: string }`
  - **gameStarted**: `{ roomToken: string, currentTurn: string }`
- **Status**: Implemented. Waiting room displays players, and owner can start the game.

### 3. Game Play

**Purpose**: Manages Ludo gameplay, including dice rolls, piece movement, captures, and win conditions.

- **Frontend**:
  - **Component**: `GameBoardComponent` (`FE/src/app/components/game-board/game-board.component.ts`)
    - Retrieves `roomToken` from route (`/game-board/:roomToken`).
    - Displays player’s color, current turn, dice value, and board state.
    - Allows current player to roll dice (`rollDice`) and move pieces (`movePiece`).
    - Updates UI on `gameStateUpdated` events (players, turn, dice, board).
    - Shows winner and navigates to home on `gameEnded` event.
  - **Service**: `GameBoardService` (`FE/src/app/services/game-board.service.ts`)
    - `joinGameRoom(roomToken)`: Emits `joinGameRoom` Socket.io event.
    - `leaveGameRoom(roomToken)`: Emits `leaveGameRoom` Socket.io event.
    - `rollDice(roomToken)`: Sends POST `/api/room/roll-dice` with `{ roomToken, socketId }`.
    - `movePiece(roomToken, pieceId, diceValue)`: Sends POST `/api/room/move-piece` with `{ roomToken, socketId, pieceId, diceValue }`.
    - `onGameStateUpdated()`: Observable for `gameStateUpdated` event.
    - `onGameEnded()`: Observable for `gameEnded` event.
    - Stores player’s color (set during `joinRoom`).
  - **Template**: `game-board.component.html`
    - Displays room token, player color, current turn, and dice value.
    - Shows simplified board (list of positions); needs visual Ludo board (grid/SVG).
    - Button for dice roll: `<button [disabled]="currentTurn !== playerColor" (click)="rollDice()">Roll Dice</button>`.
    - Needs clickable pieces for movement.
- **Backend**:
  - **Endpoints**: `rollDice`, `movePiece` (`BE/controller/roomController.js`)
    - **rollDice**:
      - Input: `{ roomToken: string, socketId: string }`
      - Validates room, game state (`ongoing`), and player’s turn.
      - Generates random dice value (1-6), updates `gameState.diceValue`.
      - Emits `gameStateUpdated` with `{ players, currentTurn, diceValue, board }`.
      - Response: `{ diceValue: number }` (HTTP 200).
    - **movePiece**:
      - Input: `{ roomToken: string, socketId: string, pieceId: string, diceValue: number }`
      - Validates room, game state, player’s turn, and piece.
      - Moves piece (e.g., 6 to exit home, advance by dice value).
      - Handles captures (send opponent piece to home if landed on, except in safe zones).
      - Updates `players.pieces` and `gameState.board`.
      - Checks win condition (all pieces in home triangle).
      - Switches turn to next player.
      - Emits `gameStateUpdated` or `gameEnded` if a player wins.
      - Response: `{ message: string }` (HTTP 200).
  - **Board Initialization**: `initializeBoard` in `roomController.js`
    - Initializes 52-position main path, home bases, and home paths (6 positions per color).
    - Tracks piece positions (e.g., `board[position] = pieceId`).
    - Defines safe zones (starting positions, home paths).
  - **Route**: `roomRouter.js`
    - `POST /api/room/roll-dice`
    - `POST /api/room/move-piece`
- **Data Packets**:
  - **rollDice**: `{ roomToken: string, socketId: string }`
  - **movePiece**: `{ roomToken: string, socketId: string, pieceId: string, diceValue: number }`
  - **gameStateUpdated**: `{ players: [{ socketId: string, color: string }, ...], currentTurn: string, diceValue: number, board: [string | null, ...] }`
  - **gameEnded**: `{ winner: string }`
- **Status**: Partially implemented. Basic `rollDice` and `movePiece` endpoints exist, but need full Ludo rules (captures, safe zones, home paths, win conditions). Board visualization is incomplete.

### 4. Chat

**Purpose**: Enables group and private messaging during waiting and gameplay.

- **Frontend**:
  - **Component**: `ChatComponent` (`FE/src/app/components/chat/chat.component.ts`)
    - Displays chat history (group and private messages).
    - Input field for message content.
    - Dropdown or toggle to select group or private recipient (by player color/socket ID).
    - Calls `GameBoardService.sendMessage` to send messages.
    - Updates UI on `newMessage` events.
  - **Service**: `GameBoardService` (`FE/src/app/services/game-board.service.ts`)
    - `sendMessage(roomToken, message, privateTo?)`: Sends POST `/api/room/send-message`.
    - `onNewMessage()`: Observable for `newMessage` Socket.io event.
  - **Template**: `chat.component.html`
    - Lists messages: `<div *ngFor="let msg of messages">{{ msg.senderColor }}: {{ msg.message }} ({{ msg.timestamp }})</div>`.
    - Message input: `<input [(ngModel)]="message" (keyup.enter)="sendMessage()">`.
    - Recipient selector for private messages (e.g., dropdown of player colors).
- **Backend**:
  - **Endpoint**: `sendMessage` (`BE/controller/roomController.js`)
    - Input: `{ roomToken: string, socketId: string, message: string, privateTo?: string }`
    - Validates room, sender, and message.
    - Stores message in `chatHistory` with `senderColor`, `message`, optional `privateTo`, and `timestamp`.
    - Emits `newMessage` to room (group) or specific socket (private).
    - Response: `{ message: string }` (HTTP 200).
  - **Route**: `roomRouter.js`
    - `POST /api/room/send-message`
- **Data Packet**:
  - **sendMessage**: `{ roomToken: string, socketId: string, message: string, privateTo?: string }`
  - **newMessage**: `{ senderColor: string, message: string, privateTo?: string, timestamp: string }`
- **Status**: Not implemented. Needs `ChatComponent` and backend endpoint.

### 5. Game Board Visualization

**Purpose**: Renders a visual Ludo board for gameplay.

- **Frontend**:
  - **Template**: `game-board.component.html`
    - Uses CSS grid or SVG to render:
      - 52-position main path (circular or square layout).
      - Four home bases (one per color).
      - Four home paths (6 positions per color).
      - Safe zones (e.g., starting positions, home paths).
    - Displays pieces as colored tokens (e.g., circles) at their positions.
    - Highlights current player’s turn and clickable pieces.
    - Animates piece movements for better UX.
  - **Styles**: `game-board.component.scss`
    - Defines board layout, colors, and piece styles.
    - Ensures responsive design for different screen sizes.
- **Backend**:
  - Ensures `gameState.board` provides accurate piece positions (e.g., `board[position] = pieceId`).
- **Status**: Basic template exists, but visual board (grid/SVG) and piece interactions are not implemented.

### 6. Error Handling and Edge Cases

- **Frontend**:
  - Display error messages for:
    - Invalid room token (404 from `joinRoom`).
    - Room full or not in `waiting` state.
    - Invalid moves (e.g., moving out of turn, no 6 to exit home).
  - Handle Socket.io disconnections (reconnect enabled in services).
- **Backend**:
  - Validate inputs for all endpoints (room token, socket ID, piece ID).
  - Handle player disconnections:
    - Remove player from `players` array.
    - Pause game or end if necessary.
  - Prevent actions in non-`ongoing` states (e.g., rolling dice in `waiting`).
- **Status**: Partial. Basic validation exists, but disconnection handling and user feedback need enhancement.

## Data Flow

1. **Create Room**:

   - User clicks “Create Room” in `HomeComponent`.
   - `HomeService` sends POST `/api/room/create` with `ownerSocketId`.
   - Backend creates room document, emits `roomCreated`.
   - `HomeService` receives `roomCreated`, calls `joinRoom` for owner, navigates to `/waiting/:roomToken`.

2. **Join Room**:

   - User enters room token and clicks “Join Room” in `HomeComponent`.
   - `HomeService` sends POST `/api/room/join` with `roomToken`, `playerSocketId`.
   - Backend adds player to `players` array, assigns color, emits `playerJoined`.
   - `WaitingService` updates players list in `WaitingComponent`.
   - Player navigates to `/waiting/:roomToken`.

3. **Waiting Room**:

   - `WaitingComponent` displays players and room token.
   - Players join Socket.io room via `joinWaitingRoom`.
   - Owner clicks “Start Game” when 4 players are present.
   - `WaitingService` sends POST `/api/room/start`.
   - Backend updates `gameState` to `ongoing`, emits `gameStarted`.
   - All players navigate to `/game-board/:roomToken`.

4. **Gameplay**:

   - `GameBoardComponent` displays board, turn, and dice value.
   - Current player rolls dice via `GameBoardService` (POST `/api/room/roll-dice`).
   - Backend updates `diceValue`, emits `gameStateUpdated`.
   - Player moves piece via `GameBoardService` (POST `/api/room/move-piece`).
   - Backend updates piece positions, checks captures/wins, emits `gameStateUpdated` or `gameEnded`.
   - On win, players see winner and return to home.

5. **Chat**:
   - `ChatComponent` sends messages via `GameBoardService` (POST `/api/room/send-message`).
   - Backend stores in `chatHistory`, emits `newMessage`.
   - Relevant clients update chat display (group or private).
