import mysql from '../node_modules/mysql2/promise';

// Server data; using .createPool allows us to reuse a recent request from the same system for performance.
const pool = mysql.createPool({
  host: '*',
  user: '*',
  password: '*',
  database: '*',
  waitForConnections: true,
  connectionLimit: 0,
  queueLimit: 0
})

export async function register(username, password){
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started");

    // 1. Check if user exists
    const [existing] = await connection.execute(
      'SELECT userID FROM Users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return { success: false, message: "Username already taken" };
    }

    // 2. Hash password using Bun hasher
    const hashedPassword = await Bun.password.hash(password, "bcrypt");

    // 3. Run SQL to create a new user
    const [userResult] = await connection.execute(
      'INSERT INTO Users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    const newUserID = userResult.insertId;

    // 4. Run SQL to input default values into db
    await connection.execute(
      'INSERT INTO Stats (userID, total_wins, total_losses, ELO, correctness) VALUES (?, 0, 0, 100, 0)',
      [newUserID]
    )

    await connection.commit();
    return { success: true, message: "Registered successfully", userID: newUserID };

  } catch (error) {
    await connection.rollback();
    console.error("Register Error:", error);
    return { success: false, message: "Server error during registration" };
  } finally {
    await connection.release()
  }
}

export async function login(username, password){
  try {
    // Join Users and Stats to get all info at once
    const [rows] = await pool.execute(`
      SELECT u.userID, u.username, u.password, s.ELO, s.total_wins, s.total_losses
      FROM Users u
      LEFT JOIN Stats s ON u.userID = s.userID
      WHERE u.username = ?
    `, [username]);

    if (rows.length === 0) {
      return { success: false, message: "User not found" };
    }

    const user = rows[0];
    const isMatch = await Bun.password.verify(password, user.password);

    if (!isMatch) {
      return { success: false, message: "Invalid password" };
    }

    // Return a simple token, use JWTs later, could be part of our creative portiion?
    return {
      success: true,
      token: `user-${user.userID}`, // Simple session identifier
      username: user.username,
      elo: user.ELO,
      stats: { wins: user.total_wins, losses: user.total_losses },
      userID: user.userID
    };
  } catch (error) {

  }
}

export async function GetLeaderboard() {
  /* Returns the top 5 users in terms of ELO
     Return format: [["henry", 1200], ["test1", 1190], ["test3", 1140]]
  */
  try {
    const [leaderboard] = await pool.execute(`
      SELECT u.username, s.ELO
      FROM Stats s
      JOIN Users u
      ON s.userID = u.userID
      ORDER BY s.ELO DESC
      LIMIT 5
      `);

    return leaderboard.map(({ username, ELO }) => [username, ELO]);
  } catch (error) {
    console.error("Failure in GetLeaderboard function:", error);
    return [];
  }
}

export async function GetNewGameId(){
  // TODO:
  // returns an unused game id from the database
  let connection;
  let newGameId = null;
  try{
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started for GetNewGameID");

    const [result] = await connection.execute(
      'SELECT Max(gameID) AS lastID FROM Uno',
    );

    newGameId = result[0].lastID + 1;

    const [na] = await connection.execute(
      'INSERT INTO Uno (gameID, userID, remaining_cards) VALUES (?, ?, ?)',
      [newGameId, 4, 50]
    );


    await connection.commit();



  } catch (error){
    await connection.rollback();
    console.error("ID Creation error:", error);
    return null;
  } finally {
    await connection.release()
  }

  return newGameId;
}

export function logout(){
    return { success : true };
}

export async function removeOneElo(ws){
  let connection;
  let remaining_cards = 0;
  ws.data.currentHand.array.forEach(element => {
    remaining_cards++;
  });
  let newElo = ws.data.elo - 50 - (remaining_cards * 10);

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started");

      //update DB with the user stats
      await connection.execute(
        `UPDATE Users
        SET
          elo = ?,
          total_wins = total_wins + ?,
          total_losses = total_losses + ?,
          correctness = (total_wins + ?) / (total_wins + total_losses + 1)
        WHERE id = ?
        `,
        [
          newElo,
          0,
          1,
          0,
          ws.data.userID
        ]
      );

      await connection.execute(
        `INSERT INTO Uno (gameID, userID, remaining_cards) VALUES (?, ?, ?)
        `,
        [ ws.data.currentGameId, ws.data.userID, remaining_cards]
      );

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error("Register Error:", error);
    return null;

  } finally {
    if (connection) connection.release();
  }
}

export async function updateElo(wsArray){
  const eloMap = new Map();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started");

    for (const ws of wsArray.array) {
      const remainingCards = ws.data.currentHand.length;

      let newElo = 0;
      let win = 0;
      let loss = 0;

      if (remainingCards === 0) {
        win++;
        newElo += 50;
      } else {
        loss++;
      }

      newElo += ws.data.elo + 50 - (remainingCards * 10);

      eloMap.set(ws, newElo);

      //update DB with the user stats
      await connection.execute(
        `UPDATE Users
        SET
          elo = ?,
          total_wins = total_wins + ?,
          total_losses = total_losses + ?,
          correctness = (total_wins + ?) / (total_wins + total_losses + 1)
        WHERE id = ?
        `,
        [
          newElo,
          win,
          loss,
          win,
          ws.data.userID
        ]
      );

      await connection.execute(
        `INSERT INTO Uno (gameID, userID, remaining_cards) VALUES (?, ?, ?)
        `,
        [ ws.data.currentGameId, ws.data.userID, remainingCards]
      );
    }

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    console.error("Register Error:", error);
    return null;

  } finally {
    if (connection) connection.release();
  }

  return eloMap;
}


