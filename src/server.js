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
  try {
    const result = await pool.query(
      "SELECT * FROM players WHERE player_picked = false;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /roster endpoint to fetch the current user's roster
// GET /roster endpoint to fetch the current user's roster with daily schedule
app.get("/roster", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { gameDate } = req.query;
    const userId = req.user.user_id;

    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;

    // Join the rosters table with roster_schedule for the given date.
    const rosterResult = await pool.query(
      `SELECT r.team_id, r.player_id, p.player, p.pos, p.salary, rs.category
       FROM rosters r
       JOIN players p ON r.player_id = p.player_id
       LEFT JOIN roster_schedule rs 
         ON r.team_id = rs.team_id 
         AND r.player_id = rs.player_id 
         AND rs.schedule_date = $1
       WHERE r.team_id = $2
       ORDER BY p.player ASC;`,
      [gameDate, teamId]
    );
    

    res.json(rosterResult.rows);
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

    // Check if the game has already been played
    const gameResult = await pool.query(
      "SELECT COUNT(*) FROM player_games_played WHERE player_id = $1 AND game_date_played = $2",
      [playerId, gameDate]
    );
    if (gameResult.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot change roster for past games." });
    }

    // Get the user's team and the corresponding roster_id for the given player
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;

    // Optionally verify the player exists on the roster.
const rosterResult = await pool.query(
  "SELECT * FROM rosters WHERE team_id = $1 AND player_id = $2",
  [teamId, playerId]
);
if (rosterResult.rows.length === 0) {
  return res.status(404).json({ error: "Player not found on your roster" });
}

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


// DELETE /roster endpoint to remove a player from the roster
app.delete("/roster", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { playerId } = req.body;
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;
    await pool.query(
      "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
      [teamId, playerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing player:", err);
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
    await pool.query("BEGIN");

    for (const player of roster) {
      // Verify the player exists on the roster using composite keys.
      const rosterResult = await pool.query(
        "SELECT * FROM rosters WHERE team_id = $1 AND player_id = $2",
        [teamId, player.player_id]
      );
      if (rosterResult.rows.length === 0) {
        continue; // Skip players not found on the roster.
      }

      // Check if a played game record exists; if so, skip updating.
      const playedResult = await pool.query(
        "SELECT COUNT(*) FROM player_games_played WHERE player_id = $1 AND game_date_played = $2",
        [player.player_id, gameDate]
      );
      if (playedResult.rows[0].count > 0) {
        continue;
      }

      // Upsert the daily schedule record using composite keys.
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
    const teamsResult = await pool.query(
      `SELECT team_id, team_name FROM teams WHERE league_id = $1`,
      [league_id]
    );
    const rostersResult = await pool.query(
      `SELECT r.team_id, r.player_id, r.category, p.player AS player_name, p.pos, p.salary
       FROM rosters r
       JOIN players p ON r.player_id = p.player_id
       JOIN teams t ON r.team_id = t.team_id
       WHERE t.league_id = $1`,
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

// POST /execute-trade endpoint to execute a trade
app.post("/execute-trade", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  const { team1Id, team2Id, team1Players, team2Players } = req.body;
  if (!team1Id || !team2Id || !Array.isArray(team1Players) || !Array.isArray(team2Players)) {
    return res.status(400).json({ error: "Missing or invalid trade data." });
  }
  try {
    await pool.query("BEGIN");
    for (const playerId of team1Players) {
      await pool.query(
        "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
        [team1Id, playerId]
      );
    }
    for (const playerId of team2Players) {
      await pool.query(
        "DELETE FROM rosters WHERE team_id = $1 AND player_id = $2",
        [team2Id, playerId]
      );
    }
    for (const playerId of team2Players) {
      await pool.query(
        "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, $3)",
        [team1Id, playerId, "reserve"]
      );
    }
    for (const playerId of team1Players) {
      await pool.query(
        "INSERT INTO rosters (team_id, player_id, category) VALUES ($1, $2, $3)",
        [team2Id, playerId, "reserve"]
      );
    }
    await pool.query("COMMIT");
    res.json({ success: true, message: "Trade executed successfully." });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error executing trade:", err);
    res.status(500).json({ error: "Error executing trade." });
  }
});

// Make sure to include your authentication middleware before this route.
app.get("/matchup-season", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    // Retrieve the logged-in user's team (and league)
    const userId = req.user.user_id;
    const teamResult = await pool.query(
      "SELECT team_id, league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "User's team not found" });
    }
    const { team_id, league_id } = teamResult.rows[0];

    // Find an active matchup for the user's league that includes their team.
    const matchupQuery = `
      SELECT 
        m.matchup_id,
        m.team_a_id,
        m.team_b_id,
        m.start_date,
        m.end_date,
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

    // Create a date series from the matchup start to end dates
    // And combine the game stats from played and future games.
    const statsQuery = `
      WITH date_series AS (
  SELECT generate_series($1::date, $2::date, interval '1 day') AS game_date
),
game_stats AS (
  -- Past (played) games
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
  
  UNION ALL
  
  -- Future (unplayed) games
  SELECT 
    player_id,
    future_game_date AS game_date,
    NULL AS pts,
    NULL AS reb,
    NULL AS ast,
    NULL AS stl,
    NULL AS blk,
    player_opp AS opp_time,
    'future' AS source
  FROM player_games_future
)

SELECT
  ds.game_date,
  r.team_id,
  r.player_id,
  p.player AS player_name,
  p.pos,
  gs.pts,
  gs.reb,
  gs.ast,
  gs.stl,
  gs.blk,
  gs.opp_time,
  COALESCE(rs.category, r.category) AS category,  
  gs.source

FROM date_series ds
CROSS JOIN rosters r
JOIN players p
  ON r.player_id = p.player_id

-- LEFT JOIN the combined stats (played/future)
LEFT JOIN game_stats gs
  ON gs.player_id = r.player_id
  AND gs.game_date = ds.game_date

-- LEFT JOIN your roster_schedule for the same date
LEFT JOIN roster_schedule rs
  ON r.team_id = rs.team_id
  AND r.player_id = rs.player_id
  AND rs.schedule_date = ds.game_date

WHERE r.team_id IN ($3, $4)  
ORDER BY r.team_id, ds.game_date, p.player;
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
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const userId = req.user.user_id;
    // Get the user's team to determine the league.
    const teamResult = await pool.query(
      "SELECT league_id FROM teams WHERE user_id = $1",
      [userId]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for user." });
    }
    const { league_id } = teamResult.rows[0];

    // Retrieve league information, including season_start and season_end.
    const leagueResult = await pool.query(
      "SELECT league_name, season_start, season_end FROM leagues WHERE league_id = $1",
      [league_id]
    );
    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ error: "League not found." });
    }
    res.json(leagueResult.rows[0]);
  } catch (err) {
    console.error("Error fetching league info:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});






const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
