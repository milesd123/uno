/*
NOTE: during testing, i noticed that we allow stacking of cards on top of each other automatically
also, the game reaches a state wherein the user plays a card, the stack is updated, but their hand is not, TOFIX
*/

import { GetNewGameId } from "./database.js";
import { newCard } from "./uno";

class Game{
    id;
    top_card;
    reversed = false;
    players = [];
    turn = 0;
}

// ---all games---
let games = new Map();
export function getGame(id){
    return games.get(id);
}

// ---start new game---
export async function startNewGame(currentUnoQueue){
    // create new game object
    let game = new Game();
    game.id = await GetNewGameId();
    game.top_card = await newCard();
    console.log("Game Created");

    // add to map of games
    games.set(game.id, game);

    currentUnoQueue.forEach((ws) => {
      ws.data.currentGameId = game.id;
      console.log(game.id);
      game.players.push(ws);
      ws.data.currentHand = [];
    });

    // init data about other players
    const playerPublicData = game.players.map(p => ({
        username: p.data.username || "Unknown",
        id: p.data.id,
        cardCount: p.data.currentHand.length
    }));

    // add each user to the game
    for (const ws of game.players) {
        // generate new hand
        for(let i = 0; i < 7; i++){
          const card = await newCard();
          ws.data.currentHand.push(card);
        }
        console.log("Created Cards..");
    };

    // extrapolated sending message to its own loop since max n = 4
    game.players.forEach((ws, index) => {
      ws.send(JSON.stringify({ type: "game_start" , payload: { gameId: game.id,  hand: ws.data.currentHand, topCard: game.top_card, players: playerPublicData, myIndex: index, turnIndex: game.turn} }));
    })
}
