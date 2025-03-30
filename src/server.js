// server.js
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();

// Enable CORS for your React app and allow credentials
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

app.use(passport.initialize());
app.use(passport.session());

const pool = new Pool({
  user: "postgres",                // Replace with your PostgreSQL username
  host: "localhost",               // Replace if your host is different
  database: "postgres",            // The name of your database
  password: "harri029",            // Replace with your PostgreSQL password
  port: 5432,                      // Default PostgreSQL port
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1;",
        [username]
      );
      if (result.rows.length === 0) {
        return done(null, false);
      }
      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1;", [
      id,
    ]);
    if (result.rows.length === 0) {
      return done(null, false);
    }
    const user = result.rows[0];
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

// Login endpoint
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

// Current user endpoint
app.get("/api/current-user", (req, res) => {
  if (req.user) res.json(req.user);
  else res.status(401).json({ message: "Not authenticated" });
});

// Protected profile endpoint
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) return res.json(req.user);
  return res.status(401).json({ error: "Not authenticated." });
});

// Logout endpoint
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


// GET /freeagents endpoint to fetch available players
app.get("/freeagents", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const userId = req.user.user_id;
  try {
    // First, get the user's league.
    const teamResult = await pool.query("SELECT league_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { league_id } = teamResult.rows[0];
    
    // Now fetch players for that league that are not picked.
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






// POST /roster/category endpoint to update a player's category
// POST /roster/category endpoint to update a player's daily category
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

    // 🔒 Check if gameDate is locked
    const lockedCheck = await pool.query(
      "SELECT 1 FROM locked_schedule WHERE team_id = $1 AND locked_date = $2 LIMIT 1",
      [teamId, gameDate]
    );
    if (lockedCheck.rows.length > 0) {
      return res.status(403).json({
        error: `Roster is locked for ${gameDate} and cannot be changed.`,
      });
    }

    // Check if the game has already been played
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

    // ✅ Upsert into roster_schedule
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

// POST /roster/remove
app.post("/roster/remove", async (req, res) => {
  const { playerId, gameDate } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: "Missing playerId." });
  }

  try {
    // Retrieve the current user's team (assume authentication middleware has set req.user)
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const { team_id, league_id } = teamResult.rows[0];

    // Begin transaction.
    await pool.query("BEGIN");

    // Fetch the player's salary from the players table.
    const playerResult = await pool.query(
      "SELECT salary FROM players WHERE player_id = $1 AND league_id = $2",
      [playerId, league_id]
    );
    if (playerResult.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Player not found in league" });
    }
    const playerSalary = Number(playerResult.rows[0].salary);

    // Mark the player as not picked.
    await pool.query(
      "UPDATE players SET player_picked = false WHERE player_id = $1",
      [playerId]
    );

    // Subtract the player's salary from the team's salary.
    await pool.query(
      "UPDATE teams SET team_salary = team_salary - $1 WHERE team_id = $2",
      [playerSalary, team_id]
    );

    // Remove the player from the roster. Depending on your schema, you might be deleting from a table like "rosters" or "roster_schedule".
    await pool.query(
      "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
      [team_id, playerId]
    );

    // Optionally, if you have a roster_schedule table that you need to update:
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




// POST /roster/save endpoint to update the lineup for a given game date.
// It only updates if there is no played record (with roster_picked true) for that date.
// POST /roster/save endpoint to update the entire lineup for a given game date.
// POST /roster/save endpoint to update the entire lineup for a given game date.
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

    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }

    const teamId = teamResult.rows[0].team_id;

    // 🛑 Check if this date is locked in locked_schedule for the team
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

    for (const player of roster) {
      // Make sure the player is still on the team’s roster
      const rosterResult = await pool.query(
        "SELECT * FROM rosters WHERE team_id = $1 AND player_id = $2",
        [teamId, player.player_id]
      );
      if (rosterResult.rows.length === 0) {
        continue; // Skip if not on roster
      }

      // Skip if the game has already been played
      const playedResult = await pool.query(
        "SELECT COUNT(*) FROM player_games_played WHERE player_id = $1 AND game_date_played = $2",
        [player.player_id, gameDate]
      );
      if (playedResult.rows[0].count > 0) {
        continue;
      }

      // Upsert into roster_schedule
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





// GET /trade-setup endpoint for trade configuration
app.get("/trade-setup", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const userId = req.user.user_id;
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

    // Get rosters for all teams in the league, but only for players that belong to that league.
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




// Make sure to include your authentication middleware before this route.
app.get("/matchup-season", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    // Retrieve the logged-in user's team and league.
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { team_id, league_id } = teamResult.rows[0];

    // Find an active (or upcoming) matchup for the user's league that includes their team.
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

    // Build a date series from matchup start_date to end_date.
    // Then, combine the game stats from player_games_played.
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

app.get("/league-info", async (req, res) => {
  // Ensure the user is authenticated.
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const userId = req.user.user_id;
    // Get the user's team (and league id) from the teams table.
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for user." });
    }
    const { league_id } = teamResult.rows[0];

    // Fetch league information from the leagues table.
    const leagueResult = await pool.query(
      "SELECT league_id, league_name, draft_time, season_start, season_end FROM leagues WHERE league_id = $1",
      [league_id]
    );
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: "League not found." });
    }
    const leagueInfo = leagueResult.rows[0];

    // Fetch all teams in this league along with wins, losses, and ties.
    const teamsResult = await pool.query(
      `SELECT team_id, team_name, wins, losses, ties 
       FROM teams 
       WHERE league_id = $1 
       ORDER BY wins DESC, losses ASC, ties DESC`,
      [league_id]
    );
    // Attach the teams array to the leagueInfo object.
    leagueInfo.teams = teamsResult.rows;

    res.json(leagueInfo);
  } catch (err) {
    console.error("Error fetching league info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




// GET /games-played endpoint to fetch games played
// GET /games-played endpoint to fetch games played
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
  rs.category,           -- The category (e.g., starter/bench/reserve) from roster_schedule
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
  AND rs.schedule_date = pgp.game_date_played  -- match the date of the game
  AND rs.team_id = $1                          -- match the team ID you’re interested in
WHERE pgp.game_date_played = $2               -- the specific date you want (e.g., '2025-01-20')
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

// Endpoint to lock the schedule for a specific game date.

// New Endpoint: Lock the Schedule for a Specific Date
// This copies active schedule rows into locked_schedule, making them immutable.
app.post("/roster/lock", async (req, res) => {
  const { lockDate } = req.body; // e.g., "2025-01-20"
  if (!lockDate) {
    return res.status(400).json({ error: "Missing lockDate" });
  }
  try {
    await pool.query("BEGIN");
    await pool.query(`
      INSERT INTO locked_schedule (team_id, player_id, locked_date, category)
      SELECT team_id, player_id, schedule_date, category
      FROM roster_schedule
      WHERE schedule_date = '2025-01-20'
    
    `);
    // Optionally, delete active rows for that date:
    // await pool.query(`DELETE FROM roster_schedule WHERE schedule_date = $1`, [lockDate]);
    await pool.query("COMMIT");
    res.json({ success: true, message: `Schedule locked for ${lockDate}.` });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error locking schedule:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /roster endpoint: Return locked schedule if the date is locked, else active data.
app.get("/roster", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { gameDate, teamId } = req.query; // Now expecting teamId
    const userId = req.user.user_id;
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const originalTeamId = teamResult.rows[0].team_id;

//if teamID is not in the query select the current user id
    const currentTeamID = teamId || originalTeamId

    // Check if the gameDate is locked.
    const lockedCheck = await pool.query(
      "SELECT COUNT(*) AS cnt FROM locked_schedule WHERE locked_date = $1",
      [gameDate]
    );
    if (parseInt(lockedCheck.rows[0].cnt, 10) > 0) {
      // Return data from locked_schedule.
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
      // Return active roster and schedule (join rosters and roster_schedule).
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

// POST /execute-trade endpoint: Update only the rosters (active schedule remains unchanged).
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

    // Process trades for players moving from team1 to team2.
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

    // Process trades for players moving from team2 to team1.
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

    // Note: We do NOT update or delete any rows in locked_schedule.
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

// POST /reset-draft endpoint: Clear only active rosters and roster_schedule.
// Locked schedule remains unchanged.
app.post("/reset-draft", async (req, res) => {
  const { leagueId } = req.body;

  try {
    await pool.query("BEGIN");

    // 0) Clear locked_schedule
    await pool.query(`
      DELETE FROM locked_schedule
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // 1) Clear roster_schedule
    await pool.query(`
      DELETE FROM roster_schedule
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // 2) Clear rosters
    await pool.query(`
      DELETE FROM rosters
      WHERE team_id IN (
        SELECT team_id FROM teams WHERE league_id = $1
      )
    `, [leagueId]);

    // 3) Reset player picked flag
    await pool.query(`
      UPDATE players
      SET player_picked = false
      WHERE league_id = $1
    `, [leagueId]);

    // 4) Reset team salary
    await pool.query(`
      UPDATE teams
      SET team_salary = 0
      WHERE league_id = $1
    `, [leagueId]);

    // 4) Reset team salary
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


// Other endpoints (make-pick, teams-for-league, league-players, matchup-season, league-info) remain unchanged.
app.post("/make-pick", async (req, res) => {
  const { teamId, playerId } = req.body;
  const LOCKED_DATE = "2025-01-20"; // Fixed schedule lock date

  try {
    await pool.query("BEGIN");

    // 1. Get the league ID for the team
    const teamResult = await pool.query(
      "SELECT league_id FROM teams WHERE team_id = $1",
      [teamId]
    );
    if (teamResult.rows.length === 0) throw new Error("Team not found.");
    const leagueId = teamResult.rows[0].league_id;

    // 2. Make sure the player is in the league and not already picked
    const playerResult = await pool.query(
      "SELECT player_picked, salary FROM players WHERE player_id = $1 AND league_id = $2",
      [playerId, leagueId]
    );
    if (playerResult.rows.length === 0) throw new Error("Player not found in this league.");
    if (playerResult.rows[0].player_picked) throw new Error("Player has already been picked.");
    const playerSalary = parseFloat(playerResult.rows[0].salary);

    // 3. Determine roster slot based on current count
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

    // 4. Mark player as picked
    await pool.query(
      "UPDATE players SET player_picked = true WHERE player_id = $1 AND league_id = $2",
      [playerId, leagueId]
    );

    // 5. Add player to roster
    await pool.query(
      "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, $3)",
      [teamId, playerId, category]
    );

    // 6. Add to roster_schedule for locked date
    await pool.query(
      `INSERT INTO roster_schedule (team_id, player_id, schedule_date, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (team_id, player_id, schedule_date)
       DO UPDATE SET category = EXCLUDED.category`,
      [teamId, playerId, LOCKED_DATE, category]
    );

    // 7. Also insert into locked_schedule to preserve record
    await pool.query(
      `INSERT INTO locked_schedule (team_id, player_id, locked_date, category)
       VALUES ($1, $2, $3, $4)`,
      [teamId, playerId, LOCKED_DATE, category]
    );

    // 8. Update salary cap
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

// Endpoint: Update the matchup scores
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


app.post("/update-roster", async (req, res) => {
  const { team_id, player_id, contract_amount } = req.body;
  // Force the category to "reserve"
  const category = "reserve";
  try {
    // 1) Check if the team's roster already has 15 players.
    const rosterCountResult = await pool.query(
      "SELECT COUNT(*) FROM rosters WHERE team_id = $1",
      [team_id]
    );
    const rosterCount = Number(rosterCountResult.rows[0].count);
    if (rosterCount >= 15) {
      return res.status(400).json({ error: "Roster is full" });
    }

    // 2) Update the team's salary cap in the teams table.
    await pool.query(
      `UPDATE teams SET team_salary = team_salary + $1 
       WHERE team_id = $2`,
      [contract_amount, team_id]
    );

    // 3) Insert the new player into the rosters table with category "reserve".
    //    Using ON CONFLICT to update the category if the record already exists.
    await pool.query(
      `INSERT INTO rosters (team_id, player_id, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, player_id)
       DO UPDATE SET category = EXCLUDED.category;`,
      [team_id, player_id, category]
    );

    // 4) Update the player's record in the players table to mark them as picked.
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

app.get("/team-info", async (req, res) => {
  // Ensure the user is authenticated.
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const userId = req.user.user_id;
    // Retrieve the user's team information
    const teamResult = await pool.query(
      "SELECT team_id, league_id, team_name, wins, losses, ties, team_salary FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for user." });
    }
    const myTeam = teamResult.rows[0];

    // Retrieve the league information for that team.
    const leagueResult = await pool.query(
      "SELECT league_id, league_name, draft_time, season_start, season_end FROM leagues WHERE league_id = $1",
      [myTeam.league_id]
    );
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: "League not found." });
    }
    const leagueInfo = leagueResult.rows[0];

    // Return only the current user's team stats along with the league info.
    res.json({
      league: leagueInfo,
      myTeam: myTeam
    });
  } catch (err) {
    console.error("Error fetching league info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /roster/is-locked?gameDate=YYYY-MM-DD
app.get("/roster/is-locked", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const { gameDate } = req.query;
  if (!gameDate) {
    return res.status(400).json({ error: "Missing gameDate parameter" });
  }

  try {
    // 1) Get the user’s team_id
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;

    // 2) Check if the date is locked in locked_schedule (example)
    //    This is just an example. If you store locked status differently,
    //    adjust accordingly.
    const lockedCheck = await pool.query(
      "SELECT 1 FROM locked_schedule WHERE team_id = $1 AND locked_date = $2 LIMIT 1",
      [teamId, gameDate]
    );
    const isLocked = lockedCheck.rows.length > 0;

    // 3) Return { isLocked: true/false }
    return res.json({ isLocked });
  } catch (err) {
    console.error("Error checking if roster is locked:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
