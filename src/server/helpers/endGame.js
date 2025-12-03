import { updateElo } from "./database";

export function endGameCleanup(wsArray, winnerID){
    // Reset user variables for queueing, update elo
    let newElos = new Map();
    newElos = updateElo(wsArray);

    // update each user
    wsArray.array.forEach(ws => {
        ws.data.currentGameId = null;
        ws.data.currentHand = [];
        ws.data.queued = false;
        ws.data.elo = newElo;
        newElo = newElos.get(ws.data.id);

        // publish game end message
        ws.send(JSON.stringify({ type: "game_end" , payload: { win: winnerID === ws.data.id ? true : false, new_elo: newElo} }));
  });

}

