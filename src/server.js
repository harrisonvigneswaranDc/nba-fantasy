// Express for server & CORS 
// express-session for session management, Passport for authentication, bcrypt for password hashing
// pg for PostgreSQL connection
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// Create an Express application instance.
const app = express();

// Enable CORS for the React app at localhost:3000 and allow credentials to be sent.
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Parse incoming JSON payloads.
app.use(express.json());

// Configure session middleware for managing user sessions.
app.use(
  session({
    secret: "secret", // Session secret for signing the session ID cookie
    resave: false, // Do not force session save if unmodified
    saveUninitialized: false, // Do not create a session until something stored
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // Cookie valid for 24 hours
  })
);

// Initialize Passport authentication middleware and enable session support.
app.use(passport.initialize());
app.use(passport.session());

// Create a connection pool to the PostgreSQL database.
const pool = new Pool({
  user: "postgres",                
  host: "localhost",               
  database: "postgres",            
  password: "harri029",            
  port: 5432,                      
});

// Configure Passport to use the LocalStrategy for username/password authentication.
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Query the database for a user with the provided username.
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1;",
        [username]
      );
      // If no user found, return false.
      if (result.rows.length === 0) {
        return done(null, false);
      }
      const user = result.rows[0];
      // Compare the provided password with the hashed password stored in the database.
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false);
      }
      // If valid, return the user.
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Serialize user info into the session by storing the user_id.
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize the user by fetching their data from the database using the stored user_id.
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1;", [id]);
    if (result.rows.length === 0) {
      return done(null, false);
    }
    const user = result.rows[0];
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});


// Login endpoint: Uses Passport's local strategy to authenticate
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

// Endpoint to get the current user data
app.get("/api/current-user", (req, res) => {
  if (req.user) res.json(req.user);
  else res.status(401).json({ message: "Not authenticated" });
});

//  Returns user profile if authenticated.
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) return res.json(req.user);
  return res.status(401).json({ error: "Not authenticated." });
});

// Ends the session and clears the session cookie
app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful" });
  });
});


//  fetch available free agent players for the authenticated user's league
app.get("/freeagents", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const userId = req.user.user_id;
  try {
    // Get the user's team to determine their league
    const teamResult = await pool.query("SELECT league_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { league_id } = teamResult.rows[0];
    
    // Fetch players that have not been picked in this league
    const result = await pool.query(
      "SELECT * FROM players WHERE player_picked = false AND league_id = $1",
      [league_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// update a player's daily category on a roster
app.post("/roster/category", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const { playerId, newCategory, gameDate } = req.body;
    const userId = req.user.user_id;

    // Get the user's team
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;

    // Check if the game date is locked 
    const lockedCheck = await pool.query(
      "SELECT 1 FROM locked_schedule WHERE team_id = $1 AND locked_date = $2 LIMIT 1",
      [teamId, gameDate]
    );
    if (lockedCheck.rows.length > 0) {
      return res.status(403).json({
        error: `Roster is locked for ${gameDate} and cannot be changed.`,
      });
    }

    // Check if the game has already been played for the given player
    const gameResult = await pool.query(
      "SELECT COUNT(*) FROM player_games_played WHERE player_id = $1 AND game_date_played = $2",
      [playerId, gameDate]
    );
    if (gameResult.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot change roster for past games." });
    }

    // Verify the player exists on the user's roster
    const rosterResult = await pool.query(
      "SELECT * FROM rosters WHERE team_id = $1 AND player_id = $2",
      [teamId, playerId]
    );
    if (rosterResult.rows.length === 0) {
      return res.status(404).json({ error: "Player not found on your roster" });
    }

    // Insert or update the player's category in the roster schedule tbl
    await pool.query(
      `INSERT INTO roster_schedule (team_id, player_id, schedule_date, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (team_id, player_id, schedule_date)
       DO UPDATE SET category = EXCLUDED.category`,
      [teamId, playerId, gameDate, newCategory]
    );

    res.json({ success: true, message: "Category updated successfully." });
  } catch (err) {
    console.error("Error updating player category:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// remove a player from a roster
app.post("/roster/remove", async (req, res) => {
  const { playerId, gameDate } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: "Missing playerId." });
  }

  try {
    // Get the current user's team and league.
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const { team_id, league_id } = teamResult.rows[0];

    // Begin transaction 
    await pool.query("BEGIN");

    // Get the player's salary
    const playerResult = await pool.query(
      "SELECT salary FROM players WHERE player_id = $1 AND league_id = $2",
      [playerId, league_id]
    );
    if (playerResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Player not found in league" });
    }
    const playerSalary = Number(playerResult.rows[0].salary);

    // Mark the player as not picked
    await pool.query(
      "UPDATE players SET player_picked = false WHERE player_id = $1",
      [playerId]
    );

    // Subtract the player's salary from the team's total salary
    await pool.query(
      "UPDATE teams SET team_salary = team_salary - $1 WHERE team_id = $2",
      [playerSalary, team_id]
    );

    // Remove the player from the roster
    await pool.query(
      "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
      [team_id, playerId]
    );

    // Oremove the player from the roster schedule if a game date is provided.
    if (gameDate) {
      await pool.query(
        "DELETE FROM roster_schedule WHERE team_id = $1 AND player_id = $2 AND schedule_date = $3",
        [team_id, playerId, gameDate]
      );
    }

    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error in /roster/remove:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Endpoint to update the entire lineup for a given game date.
app.post("/roster/save", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const { roster, gameDate } = req.body;

  if (!Array.isArray(roster) || !gameDate) {
    return res.status(400).json({ error: "Invalid roster data or missing gameDate." });
  }

  try {
    const userId = req.user.user_id;

    // Get the user's team.
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }

    const teamId = teamResult.rows[0].team_id;

    // Check if the roster for the date is locked.
    const lockedCheck = await pool.query(
      `SELECT 1 FROM locked_schedule 
       WHERE team_id = $1 AND locked_date = $2 
       LIMIT 1`,
      [teamId, gameDate]
    );

    if (lockedCheck.rows.length > 0) {
      return res.status(403).json({
        error: `Roster for ${gameDate} is locked and cannot be modified.`,
      });
    }

    await pool.query("BEGIN");

    // Loop through each player in the submitted roster.
    for (const player of roster) {
      // Verify the player is on the team’s current roster.
      const rosterResult = await pool.query(
        "SELECT * FROM rosters WHERE team_id = $1 AND player_id = $2",
        [teamId, player.player_id]
      );
      if (rosterResult.rows.length === 0) {
        continue; // Skip if the player is not on the roster.
      }

      // Skip updating if the game has already been played.
      const playedResult = await pool.query(
        "SELECT COUNT(*) FROM player_games_played WHERE player_id = $1 AND game_date_played = $2",
        [player.player_id, gameDate]
      );
      if (playedResult.rows[0].count > 0) {
        continue;
      }

      // Upsert the player's category into the roster schedule table.
      await pool.query(
        `INSERT INTO roster_schedule (team_id, player_id, schedule_date, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_id, player_id, schedule_date)
         DO UPDATE SET category = EXCLUDED.category`,
        [teamId, player.player_id, gameDate, player.category]
      );
    }

    await pool.query("COMMIT");
    res.json({ success: true, message: `Lineup saved for ${gameDate}.` });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error saving lineup:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Returns data for trade configuration for the authenticated user's league.
app.get("/trade-setup", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const userId = req.user.user_id;
    // Get the user's team and league.
    const teamResult = await pool.query(
      `SELECT team_id, league_id FROM teams WHERE user_id = $1`,
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { team_id: myTeamId, league_id } = teamResult.rows[0];

    // Get all teams in the same league.
    const teamsResult = await pool.query(
      `SELECT team_id, team_name FROM teams WHERE league_id = $1`,
      [league_id]
    );

    // Get rosters for all teams in the league.
    const rostersResult = await pool.query(
      `SELECT r.team_id, r.player_id, r.category, p.player AS player_name, p.pos, p.salary
       FROM rosters r
       JOIN players p ON r.player_id = p.player_id
       JOIN teams t ON r.team_id = t.team_id
       WHERE t.league_id = $1
         AND p.league_id = $1`,
      [league_id]
    );

    res.json({
      myTeamId,
      teams: teamsResult.rows,
      rosters: rostersResult.rows,
    });
  } catch (err) {
    console.error("Error fetching trade setup data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// GET /matchup-season: Retrieves active/upcoming matchup data along with a date series of game stats.
app.get("/matchup-season", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    // Get the user's team and league.
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    console.log("User ID:", req.user.user_id);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { team_id, league_id } = teamResult.rows[0];

    // Find an active or upcoming matchup for the user's team.
    const matchupQuery = `
     SELECT
       m.matchup_id,
       m.team_a_id,
       m.team_b_id,
       m.start_date,
       m.end_date,
       m.team_a_score,
       m.team_b_score,
       ta.team_name AS teamA_name,
       tb.team_name AS teamB_name
     FROM matchups m
     JOIN teams ta ON m.team_a_id = ta.team_id
     JOIN teams tb ON m.team_b_id = tb.team_id
     WHERE m.league_id = $1
       AND (m.team_a_id = $2 OR m.team_b_id = $2)
     ORDER BY 
       CASE WHEN CURRENT_DATE BETWEEN m.start_date AND m.end_date THEN 0 ELSE 1 END,
       m.start_date ASC
     LIMIT 1;
    `;
    const matchupResult = await pool.query(matchupQuery, [league_id, team_id]);
    if (matchupResult.rows.length === 0) {
      return res.status(404).json({ error: "No active matchup found for user's team" });
    }
    const matchup = matchupResult.rows[0];

    // Build a date series and combine game stats for players in the matchup.
    const statsQuery = `
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, interval '1 day') AS game_date
      ),
      game_stats AS (
        SELECT 
          player_id,
          game_date_played AS game_date,
          pts,
          reb,
          ast,
          stl,
          blk,
          NULL AS opp_time,
          'played' AS source
        FROM player_games_played
      ),
      roster_combined AS (
        SELECT
          r.team_id,
          r.player_id,
          ds.game_date,
          COALESCE(ls.category, rs.category, r.category) AS category,
          CASE
            WHEN ls.locked_date IS NOT NULL THEN true
            ELSE false
          END AS is_locked
        FROM rosters r
        CROSS JOIN date_series ds
        LEFT JOIN locked_schedule ls
          ON r.team_id = ls.team_id
         AND r.player_id = ls.player_id
         AND ls.locked_date = ds.game_date
        LEFT JOIN roster_schedule rs
          ON r.team_id = rs.team_id
         AND r.player_id = rs.player_id
         AND rs.schedule_date = ds.game_date
      )
      SELECT
        rc.game_date,
        rc.team_id,
        rc.player_id,
        p.player AS player_name,
        p.pos,
        gs.pts,
        gs.reb,
        gs.ast,
        gs.stl,
        gs.blk,
        gs.opp_time,
        rc.category,
        CASE WHEN gs.player_id IS NOT NULL THEN true ELSE false END AS game_played,
        rc.is_locked
      FROM roster_combined rc
      JOIN players p ON rc.player_id = p.player_id
      LEFT JOIN game_stats gs ON gs.player_id = rc.player_id AND gs.game_date = rc.game_date
      WHERE rc.team_id IN ($3, $4)
      ORDER BY rc.team_id, rc.game_date, p.player ASC;
    `;
    const statsResult = await pool.query(statsQuery, [
      matchup.start_date,
      matchup.end_date,
      matchup.team_a_id,
      matchup.team_b_id,
    ]);

    res.json({
      matchup,
      stats: statsResult.rows,
    });
  } catch (err) {
    console.error("Error fetching matchup season data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



//  Returns detailed league information along with team standings.
app.get("/league-info", async (req, res) => {
  // Ensure the user is authenticated.
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const userId = req.user.user_id;
    // Get the user's team.
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for user." });
    }
    const { league_id } = teamResult.rows[0];

    // Fetch league details.
    const leagueResult = await pool.query(
      "SELECT league_id, league_name, draft_time, season_start, season_end FROM leagues WHERE league_id = $1",
      [league_id]
    );
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: "League not found." });
    }
    const leagueInfo = leagueResult.rows[0];

    // Fetch all teams in the league along with wins, losses, and ties.
    const teamsResult = await pool.query(
      `SELECT team_id, team_name, wins, losses, ties 
       FROM teams 
       WHERE league_id = $1 
       ORDER BY wins DESC, losses ASC, ties DESC`,
      [league_id]
    );
    // Attach the teams to the league info.
    leagueInfo.teams = teamsResult.rows;

    res.json(leagueInfo);
  } catch (err) {
    console.error("Error fetching league info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// returns games played statistics for a specific team on a given date.
app.get("/games-played", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const { gameDate, teamId } = req.query;
    if (!teamId || !gameDate) {
      return res.status(400).json({ error: "Missing teamId or gameDate" });
    }

    const gamesPlayedResult = await pool.query(
      `
      SELECT 
        pgp.player_id,
        p.player AS player_name,
        p.pos,
        p.salary,
        pgp.game_date_played,
        rs.category,
        pgp.pts,
        pgp.reb,
        pgp.ast,
        pgp.stl,
        pgp.blk
      FROM player_games_played pgp
      JOIN players p 
        ON p.player_id = pgp.player_id
      JOIN roster_schedule rs 
        ON rs.player_id = pgp.player_id
        AND rs.schedule_date = pgp.game_date_played
        AND rs.team_id = $1
      WHERE pgp.game_date_played = $2               
      ORDER BY pgp.game_date_played DESC;
      `,
      [teamId, gameDate]
    );

    res.json(gamesPlayedResult.rows);
  } catch (err) {
    console.error("Error fetching games played:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


//  Locks the schedule for a specific game date.
app.post("/roster/lock", async (req, res) => {
  const { lockDate } = req.body; // e.g., "2025-01-20"
  if (!lockDate) {
    return res.status(400).json({ error: "Missing lockDate" });
  }
  try {
    await pool.query("BEGIN");
    // Insert locked schedule entries based on current roster schedule for the given date.
    await pool.query(`
      INSERT INTO locked_schedule (team_id, player_id, locked_date, category)
      SELECT team_id, player_id, schedule_date, category
      FROM roster_schedule
      WHERE schedule_date = '2025-01-20'
    `);
    //  Delete active rows for that date if needed.
    await pool.query("COMMIT");
    res.json({ success: true, message: `Schedule locked for ${lockDate}.` });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error locking schedule:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Returns the locked roster if the date is locked; otherwise, returns the active roster.
app.get("/roster", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { gameDate, teamId } = req.query;
    const userId = req.user.user_id;
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const originalTeamId = teamResult.rows[0].team_id;
    const currentTeamID = teamId || originalTeamId;

    // Check if the game date is locked
    const lockedCheck = await pool.query(
      "SELECT COUNT(*) AS cnt FROM locked_schedule WHERE locked_date = $1",
      [gameDate]
    );
    if (parseInt(lockedCheck.rows[0].cnt, 10) > 0) {
      // Return the locked roster
      const lockedRoster = await pool.query(
        `SELECT ls.team_id, ls.player_id, ls.locked_date AS schedule_date, ls.category,
                p.player AS player_name, p.pos, p.salary
         FROM locked_schedule ls
         JOIN players p ON ls.player_id = p.player_id
         WHERE ls.locked_date = $1 AND ls.team_id = $2
         ORDER BY p.player ASC;`,
        [gameDate, currentTeamID]
      );
      return res.json(lockedRoster.rows);
    } else {
      // Return the active roster and schedule
      const rosterResult = await pool.query(
        `SELECT 
           r.team_id, 
           r.player_id, 
           p.player AS player_name,
           p.pos,
           p.salary,
           COALESCE(rs.category, r.category) AS category
         FROM rosters r
         JOIN players p ON r.player_id = p.player_id
         LEFT JOIN roster_schedule rs 
           ON r.team_id = rs.team_id 
           AND r.player_id = rs.player_id 
           AND rs.schedule_date = $1
         WHERE r.team_id = $2
         ORDER BY p.player ASC;`,
        [gameDate, currentTeamID]
      );
      return res.json(rosterResult.rows);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// processes a trade between two teams by updating rosters.
app.post("/execute-trade", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { team1Id, team2Id, team1Players, team2Players } = req.body;
  if (!team1Id || !team2Id || !Array.isArray(team1Players) || !Array.isArray(team2Players)) {
    return res.status(400).json({ error: "Missing or invalid trade data." });
  }
  try {
    await pool.query("BEGIN");

    // Process players moving from team1 to team2 for team 1
    for (const playerId of team1Players) {
      await pool.query(
        "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
        [team1Id, playerId]
      );
      await pool.query(
        "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, 'reserve')",
        [team2Id, playerId]
      );
    }

    // Process players moving from team2 to team1 (team2)as it deals with 2 teams at a time
    for (const playerId of team2Players) {
      await pool.query(
        "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
        [team2Id, playerId]
      );
      await pool.query(
        "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, 'reserve')",
        [team1Id, playerId]
      );
    }

    await pool.query("COMMIT");
    res.json({
      success: true,
      message: "Trade executed successfully. Locked schedule remains unchanged."
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error executing trade:", err);
    res.status(500).json({ error: "Error executing trade.", details: err.message });
  }
});



// Resets the draft by clearing schedules, rosters, and updating players/teams.
app.post("/reset-draft", async (req, res) => {
  const { leagueId } = req.body;

  try {
    await pool.query("BEGIN");

    // Delete locked schedule entries for teams in the league
    await pool.query(`
      DELETE FROM locked_schedule
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // Delete active roster schedule entries
    await pool.query(`
      DELETE FROM roster_schedule
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // Delete rosters for teams in the league
    await pool.query(`
      DELETE FROM rosters
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // Reset all players to not picked
    await pool.query(`
      UPDATE players
      SET player_picked = false
      WHERE league_id = $1
    `, [leagueId]);

    // Reset team salary caps
    await pool.query(`
      UPDATE teams
      SET team_salary = 0
      WHERE league_id = $1
    `, [leagueId]);

    // Reset matchup scores
    await pool.query(`
      UPDATE matchups
      SET team_a_score = 0,
          team_b_score = 0
      WHERE league_id = $1
    `, [leagueId]);

    await pool.query("COMMIT");
    res.json({ success: true, message: "Draft reset successfully." });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error resetting draft:", error);
    res.status(500).json({ error: "Error resetting draft." });
  }
});



// Processes a draft pick by marking a player as picked/updating rosters

app.post("/make-pick", async (req, res) => {
  const { teamId, playerId } = req.body;
  const LOCKED_DATE = "2025-01-20"; // Fixed schedule lock date

  try {
    await pool.query("BEGIN");

    // Get the league ID for the team
    const teamResult = await pool.query(
      "SELECT league_id FROM teams WHERE team_id = $1",
      [teamId]
    );
    if (teamResult.rows.length === 0) throw new Error("Team not found.");
    const leagueId = teamResult.rows[0].league_id;

    // Ensure the player is in the league and not already picked
    const playerResult = await pool.query(
      "SELECT player_picked, salary FROM players WHERE player_id = $1 AND league_id = $2",
      [playerId, leagueId]
    );
    if (playerResult.rows.length === 0) throw new Error("Player not found in this league.");
    if (playerResult.rows[0].player_picked) throw new Error("Player has already been picked.");
    const playerSalary = parseFloat(playerResult.rows[0].salary);

    // Count current roster size to determine player category as it goes by order
    const countResult = await pool.query(
      "SELECT COUNT(*) AS cnt FROM rosters WHERE team_id = $1",
      [teamId]
    );
    const count = parseInt(countResult.rows[0].cnt, 10);
    let category;
    if (count < 5) category = "starter";
    else if (count < 9) category = "bench";
    else if (count < 15) category = "reserve";
    else throw new Error("Team already has 15 players.");

    // upates the player as picked player
    await pool.query(
      "UPDATE players SET player_picked = true WHERE player_id = $1 AND league_id = $2",
      [playerId, leagueId]
    );

    // Insert the player into the roster with the specific charcter
    await pool.query(
      "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, $3)",
      [teamId, playerId, category]
    );

    // Upsert into the roster schedule table for that fixed date
    await pool.query(
      `INSERT INTO roster_schedule (team_id, player_id, schedule_date, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (team_id, player_id, schedule_date)
       DO UPDATE SET category = EXCLUDED.category`,
      [teamId, playerId, LOCKED_DATE, category]
    );

    // Insert into the loked schedule table
    await pool.query(
      `INSERT INTO locked_schedule (team_id, player_id, locked_date, category)
       VALUES ($1, $2, $3, $4)`,
      [teamId, playerId, LOCKED_DATE, category]
    );

    // update the team's salary by adding the player's salary
    await pool.query(
      "UPDATE teams SET team_salary = team_salary + $1 WHERE team_id = $2",
      [playerSalary, teamId]
    );

    await pool.query("COMMIT");
    res.json({ success: true, message: "Player picked and locked for game day." });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error making pick:", error);
    res.status(500).json({ error: error.message || "Error processing pick." });
  }
});



// this gets  all teams in a specified league
app.get("/teams-for-league", async (req, res) => {
  const { leagueId } = req.query;
  if (!leagueId) return res.status(400).json({ error: "leagueId is required" });
  try {
    const result = await pool.query(
      "SELECT team_id, team_name, user_id FROM teams WHERE league_id = $1 ORDER BY team_id",
      [leagueId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// this gets all available players in a league that have not been picked.
app.get("/league-players", async (req, res) => {
  const { leagueId } = req.query;
  if (!leagueId) return res.status(400).json({ error: "leagueId is required" });
  try {
    const result = await pool.query(
      "SELECT player, pos, rb, ast, stl, blk, tov, pf, pts, player_id, salary, player_picked FROM players WHERE league_id = $1 AND player_picked = false",
      [leagueId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



//  Updates the overall matchup scores for a given matchup
app.post("/update-matchup-score", async (req, res) => {
  const { matchupId, overallTeamAScore, overallTeamBScore } = req.body;
  if (!matchupId || overallTeamAScore === undefined || overallTeamBScore === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await pool.query(
      `UPDATE matchups
       SET team_a_score = $1,
           team_b_score = $2
       WHERE matchup_id = $3`,
      [overallTeamAScore, overallTeamBScore, matchupId]
    );
    res.json({
      success: true,
      team_a_score: overallTeamAScore,
      team_b_score: overallTeamBScore,
    });
  } catch (err) {
    console.error("Error updating matchup score:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});



// adds a free agent to a team's roster and updates related records.
app.post("/update-roster", async (req, res) => {
  const { team_id, player_id, contract_amount } = req.body;
  // Set category to reserve when adding a free agent by deafualt
  const category = "reserve";
  try {
    // check if the team's roster already has 15 players
    const rosterCountResult = await pool.query(
      "SELECT COUNT(*) FROM rosters WHERE team_id = $1",
      [team_id]
    );
    const rosterCount = Number(rosterCountResult.rows[0].count);
    if (rosterCount >= 15) {
      return res.status(400).json({ error: "Roster is full" });
    }

    // update the team's salary cap by adding the contract amount
    await pool.query(
      `UPDATE teams SET team_salary = team_salary + $1 
       WHERE team_id = $2`,
      [contract_amount, team_id]
    );

    // insert or update the player in the roster
    await pool.query(
      `INSERT INTO rosters (team_id, player_id, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, player_id)
       DO UPDATE SET category = EXCLUDED.category;`,
      [team_id, player_id, category]
    );

    // Mark the player as picked and update as so
    await pool.query(
      `UPDATE players
       SET player_picked = true
       WHERE player_id = $1`,
      [player_id]
    );

    return res.status(200).json({ message: "Roster updated successfully" });
  } catch (err) {
    console.error("Error updating roster:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



// returns current user's team statistics and laegue info
app.get("/team-info", async (req, res) => {
  // Ensure the user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const userId = req.user.user_id;
    // retrieve the user's team details
    const teamResult = await pool.query(
      "SELECT team_id, league_id, team_name, wins, losses, ties, team_salary FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for user." });
    }
    const myTeam = teamResult.rows[0];

    // retrieve league information for the team
    const leagueResult = await pool.query(
      "SELECT league_id, league_name, draft_time, season_start, season_end FROM leagues WHERE league_id = $1",
      [myTeam.league_id]
    );
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: "League not found." });
    }
    const leagueInfo = leagueResult.rows[0];

    res.json({
      league: leagueInfo,
      myTeam: myTeam
    });
  } catch (err) {
    console.error("Error fetching league info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// checks whether the roster for a given game date is locked
app.get("/roster/is-locked", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const { gameDate } = req.query;
  if (!gameDate) {
    return res.status(400).json({ error: "Missing gameDate parameter" });
  }

  try {
    const userId = req.user.user_id;
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;

    // checks the table for an entry on the specified game date
    const lockedCheck = await pool.query(
      "SELECT 1 FROM locked_schedule WHERE team_id = $1 AND locked_date = $2 LIMIT 1",
      [teamId, gameDate]
    );
    const isLocked = lockedCheck.rows.length > 0;
    return res.json({ isLocked });
  } catch (err) {
    console.error("Error checking if roster is locked:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// start the server/listner
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
