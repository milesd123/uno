import { getGame } from "./game.js";
import { newCard } from "./uno.js";
import { endGameCleanup } from "./endGame.js";
/*
    * Make sure the data.payload for a player_move contains a variable "attemptedCard" *

    *types*              *payload*
    error               not your turn
    take_card           a new card to be added to their hand
    hand_update         the updated hand array
    invalid_choice      when user puts a wild/+4wild, they must pick a new valid card (0-51)
    game_over           payload.win: true/false for each player
                        payload.newElo: the new elo rating for the player
*/

export async function handlePlayerMove(ws, data_payload){
    // use ws.send to send the player or multiple player their game updates
    let attemptedCard = data_payload.attemptedCard;
    let game = getGame(ws.data.currentGameId);

    // compare current turn
    if(ws.data.id != game.players[game.turn].data.id){
        ws.send(JSON.stringify({ type: "error", payload: "Not your turn" }));
        return;
    }


    // compare top card:
    if(!validCard(attemptedCard, game.top_card)){
        // invalid match, give them a new card
        let card = await newCard();
        ws.data.currentHand.push(card);
        ws.send(JSON.stringify({ type: "take_card", payload: card }));
        ws.send(JSON.stringify({ type: "hand_update", payload: ws.data.currentHand }));

    } else {
        // valid Match
        // new top card
        game.top_card = attemptedCard;

        removeCard(ws, attemptedCard);

        if(ws.data.currentHand.length === 0){
            // winner
            endGameCleanup(game.players, winnerID);
            return;
        }

        if(attemptedCard % 10 == 0){ game.reversed = true; } //reverse
        else if(attemptedCard % 11 == 0){ getNextTurn(game) } //skip, increment once first.
        else if(attemptedCard % 12 == 0){ plus2(game) } //plus2
        else if(attemptedCard > 51 && attemptedCard < 56){ // wild card
             if(!wild(game, attemptedCard, ws)){ return;}
        } else if(attemptedCard > 55) { //plus 4, change color
             if(!plus4wild(game, attemptedCard, ws)){return;}
        }
    }

    // update the game object
    game.turn = getNextTurn(game);

    // Broadcast chat to everyone in the specific game ID topic
    game.players.forEach(ws => {
        ws.send(JSON.stringify({ type: "hand_update", payload: ws.data.currentHand }));
    });
    broadcastGameState(game)
    return;
}

// send current game conditions to everyone
function broadcastGameState(game) {
  const playerPublicData = game.players.map(p => ({
    username: p.data.username || "Unknown",
    id: p.data.id,
    cardCount: p.data.currentHand.length
  }));

  game.players.forEach(playerWs => {
    playerWs.send(JSON.stringify({
      type: "game_update",
      payload: {
        topCard: game.top_card,
        turnIndex: game.turn,
        players: playerPublicData,
        reversed: game.reversed
        }
    }));
  });
}

// class Game{
//     id = GetNewGameId();
//     top_card = newCard();
//     reversed = null;
//     players = []; of ws
//     turn = 0;
// }

function validCard(attemptedCard, top_card){
    if(attemptedCard == top_card){ return true;}
    if(attemptedCard > 51 ) { return true; }
    if(Math.floor(top_card / 13) == Math.floor(attemptedCard / 13)){ return true; } // same color
    if(top_card % 13 == attemptedCard % 13){ return true; } // same number/type
    return false; //no match
}

function removeCard(ws, attemptedCard){
    let arr = ws.data.currentHand
    const index = arr.indexOf(attemptedCard);

    if (index > -1) {
        // Remove exactly 1 item at that index
        arr.splice(index, 1);
    }
}

// Made async because it needs to wait for WASM to load
async function plus2(game){
    let i = getNextTurn(game);
    let nextPlayerHand = game.players[i];
    nextPlayerHand.data.currentHand.push(await newCard());
    nextPlayerHand.data.currentHand.push(await newCard());

    victimWs.send(JSON.stringify({ type: "hand_update", payload: victimWs.data.currentHand }));

    game.turn = i;
}

function getNextTurn(game){
    if(game.reversed){
        // set next player to top of list
        if(game.turn === 0){ return  game.players.length - 1; }
        else{ return game.turn - 1; }
    }
    if(game.turn === game.players.length - 1){ return 0; }
    else{ return game.turn + 1; }

}

function wild(game, attemptedCard, ws){
    if(attemptedCard < 59 && attemptedCard >= 0){
        game.top_card = attemptedCard;
        return true;
    }

    //else invalid choice
    ws.send(JSON.stringify({ type: "invalid_choice", payload: "Pick a better card" }));
    return false;
}

async function plus4wild(game, attemptedCard, ws){
    let i = getNextTurn(game);
    let victim = game.players[i];
    if(attemptedCard < 59 && attemptedCard >= 0){
        game.top_card = attemptedCard;
        for(let i=0; i<4; i++) {
          victim.data.currentHand.push(await newCard());
        }

        victim.send(JSON.stringify({ type: "hand_update", payload: victim.data.currentHand }));
        game.turn = i;
        return true;
    }

    //else invalid choice
    ws.send(JSON.stringify({ type: "invalid_choice", payload: "Pick a card 0-50" }));
    return false;
}

//     BLUE_0, 0
//     BLUE_1,
//     BLUE_2,
//     BLUE_3,
//     BLUE_4,
//     BLUE_5,
//     BLUE_6,
//     BLUE_7,
//     BLUE_8,
//     BLUE_9,
//     BLUE_REVERSE, 10
//     BLUE_SKIP, 11
//     BLUE_PLUS_2, 12
//     RED_0, 13
//     RED_1,
//     RED_2,
//     RED_3,
//     RED_4,
//     RED_5,
//     RED_6,
//     RED_7,
//     RED_8,
//     RED_9,
//     RED_REVERSE,
//     RED_SKIP,
//     RED_PLUS_2, 25
//     GREEN_0,
//     GREEN_1,
//     GREEN_2,
//     GREEN_3,
//     GREEN_4,
//     GREEN_5,
//     GREEN_6,
//     GREEN_7,
//     GREEN_8,
//     GREEN_9,
//     GREEN_REVERSE,
//     GREEN_SKIP,
//     GREEN_PLUS_2,
//     YELLOW_0,
//     YELLOW_1,
//     YELLOW_2,
//     YELLOW_3,
//     YELLOW_4,
//     YELLOW_5,
//     YELLOW_6,
//     YELLOW_7,
//     YELLOW_8,
//     YELLOW_9,
//     YELLOW_REVERSE,
//     YELLOW_SKIP,
//     YELLOW_PLUS_2,
//     WILD_1, 52
//     WILD_2,
//     WILD_3,
//     WILD_4,
//     PLUS_4_1,
//     PLUS_4_2,
//     PLUS_4_3,
//     PLUS_4_4, 59



// Use logic:
//1. ws.send(JSON.stringify({ type: "error", payload: "Never in Queue" }));

//2. Broadcast chat to everyone in the specific game ID topic
//   if(ws.data.currentGameId) {
//      server.publish(ws.data.currentGameId, JSON.stringify({
//         type: "chat_update",
//         payload: { user: ws.data.username, text: data.payload.text }
//      }));
//   }
