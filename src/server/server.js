import { login, register, removeOneElo, GetLeaderboard } from "./helpers/database.js"
import { startNewGame } from "./helpers/game.js";
import { handlePlayerMove } from "./helpers/handlePlayerMove.js";
import { getGame } from "./helpers/game.js";
import path from "path";
import { endGameCleanup } from "./helpers/endGame.js";

const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
const port = 3456;

// QUEUE VARIABLES
const UnoQueueMax = 4;
let currentUnoQueue = new Set();//of sockets

const server = Bun.serve({
  port: port,

  async fetch(req, server) {

    // CORS headers so that frontend and backend can talk
    const headers = {
      "Access-Control-Allow-Origin": "*", // Configure this for security in prod
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const url = new URL(req.url);

     if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // --- API: Login (POST) ---
    if (url.pathname === "/login" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = await login(body.username, body.password);
        return Response.json(result, { headers });
      } catch (e) {
        return Response.json({ success: false, message: "Invalid Request" }, { headers, status: 400 });
      }
    }

    // --- API: Register (POST) ---
    if (url.pathname === "/register" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = await register(body.username, body.password);
        return Response.json(result, { headers });
      } catch (e) {
        return Response.json({ success: false, message: "Invalid Request" }, { headers, status: 400 });
      }
    }

    // --- API: Get Leaderboard (GET) ---
    if (url.pathname === "/leaderboard") {
      try {
        console.log("Leaderboard Request Received.")
        const result = await GetLeaderboard();
        return Response.json(result, { headers });
      } catch (e) {
        return Response.json({success: false, message: "Invalid Request"}, {headers, status: 400});
      }
    }

    // --- WebSocket goes here ---
    // TODO TM
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: {
          id: crypto.randomUUID(),
          username: "Guest", // Replace with auth logic
          queued: false,
          currentGameId: null,
          currentHand: [],
          elo: null
        }
      });

      if (success) return undefined; // Bun handles the response
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // --- Static File Serving (Angular) ---
    // Pointing to the dist folder where Angular builds
    let filePath = url.pathname;
    if (filePath === "/") filePath = "/index.html";

    const buildPath = path.resolve(import.meta.dir, "../served/dist/casino/browser");
    const file = Bun.file(path.join(buildPath, filePath));

    if (await file.exists()) {
      return new Response(file);
    }

    const indexFile = Bun.file(path.join(buildPath, "index.html"));
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    // 1. Connection Opened
    open(ws) {
      console.log(`Client connected: ${ws.data.id}`);
    },

    async close(ws){
      if(!ws.currentGameId){
        console.log("Socket closed. Not in any game");
        return;
      }
      let exitedGame = getGame(ws.currentGameId);
      for(let i = 0; i < exitedGame.players.length; i++){
        if(exitedGame.players[i] == ws){
            arr.splice(1, i);
        }

        if(exitedGame.turn >= exitedGame.players.length){
          exitedGame.turn = exitedGame.players.length;
        }
      }

      removeOneElo(ws);
      if(exitedGame.players.length == 1){
        //end game, only player is the winner.
        exitedGame.players[0].data.currentHand = [];
        endGameCleanup(exitedGame.players, exitedGame.players[0].data.id);

      }else{ // multiple players exist
        exitedGame.players.array.forEach(ws => {
          ws.send(JSON.stringify({ type: "player_leave", payload: "A Player has left"}));
        });
      }

    },

    // 2. Messages/logic
    // format: { "type": "event_name", "payload": any }
    async message(ws, message) {
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        console.error("Invalid JSON received");
        return;
      }

      switch (data.type) {
        // --- Socket Auth ---
        // If you want to associate a username after connection
        case "identify":
          ws.data.username = data.payload.username;
          ws.data.elo = data.payload.elo;
          ws.data.userID = data.payload.userID;
          break;

        // --- Queue Logic ---
        case "join_queue":
          if (ws.data.queued) {
            ws.send(JSON.stringify({ type: "error", payload: "Already in queue" }));
            return;
          }
          if (currentUnoQueue.size >= UnoQueueMax) {
            ws.send(JSON.stringify({ type: "error", payload: "Queue Full" }));
            return;
          }

          // Add to queue
          ws.data.queued = true;
          currentUnoQueue.add(ws);
          ws.send(JSON.stringify({ type: "queue_joined", payload: { position: currentUnoQueue.size } }));

          // Check if we should start a game
          if (currentUnoQueue.size === UnoQueueMax) {
            await startNewGame(currentUnoQueue);
            currentUnoQueue.clear();
          }
          break;

        case "leave_queue":
          if (!ws.data.queued) {
            ws.send(JSON.stringify({ type: "error", payload: "Never in Queue" }));
            return;
          }
          currentUnoQueue.delete(ws);
          ws.data.queued = false;
          ws.send(JSON.stringify({ type: "queue_left" }));
          break;

        // --- Gameplay Logic ---
        case "player_move":
          handlePlayerMove(ws, data.payload);
          break;

        case "chat_message":
          // Broadcast chat to everyone in the specific game ID topic
          if(ws.data.currentGameId) {
             server.publish(ws.data.currentGameId, JSON.stringify({
                type: "chat_update",
                payload: { user: ws.data.username, text: data.payload.text }
             }));
          }
          break;

        default:
          console.log("Unknown message type:", data.type);
      }
    },

    // 3. Connection Closed
    close(ws, code, message) {
      console.log(`Client disconnected: ${ws.data.id}`);
      if (ws.data.queued) {
        currentUnoQueue.delete(ws);
      }
      // Handle player leaving mid-game here if necessary
    },

    // 4. Backpressure for performance
    drain(ws) {}
  },
})

console.log(`Backend Server running at http://localhost:${server.port}`);
