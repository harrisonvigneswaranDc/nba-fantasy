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
  cors(
    {
      origin: "http://localhost:3000",
      credentials: true,
    }
  ));

app.use(express.json());

app.use(
  session({
    secret:"secret",
    resave: false,
    saveUninitialized: false,
    cookie:{ 
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours  

    },
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
      const result = await pool.query("SELECT * FROM users WHERE username = $1;", [username]);
      if (result.rows.length === 0) {
        return done(null, false);
      }
      const user = result.rows[0];
      

      // Check if the password is valid with hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false);
      }
      // If the password is valid, return the user
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
)

// Serialize the user to store user ID in the session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize the user to get the user from the session

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

// This would be a login endpoint using Passport local
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

// This would be a current user endpoint using Passport local
app.get("/api/current-user", (req, res) => {

  console.log(req);
  if (req.user) {
      console.log(req);
      res.json(req.user);
  } else {
      res.status(401).json({ message: "Not authenticated" });
  }
});


//Protected route
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  return res.status(401).json({ error: "Not authenticated." });
});

// This would be a logout endpoint using Passport local
app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
       console.error(err);
        return res.status(500).json({message: "Logout failed"});
    }
    res.clearCookie("connect.sid");
    res.json({message: "Logout successful"});
  });
});



// GET /freeagents endpoint to fetch players where player_picked is false
app.get("/freeagents", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM players WHERE player_picked = false;");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
    }
});


app.get("/roster", async (req, res) => {
  // Check if user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  
  try {
    // Get the user ID from the logged in user (assuming it's stored as req.user.user_id)
    const userId = req.user.user_id;
    
    // Query the teams table to find the team associated with this user.
    // If a user can have only one team per league, you might also want to filter by league_id.
    const teamResult = await pool.query(
      "SELECT team_id FROM teams WHERE user_id = $1",
      [userId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    
    // Use the team_id from the result
    const teamId = teamResult.rows[0].team_id;
    
    // Now, query the rosters table with this team_id
    const rosterResult = await pool.query(
      `SELECT rosters.*, players.* 
       FROM rosters 
       JOIN players ON rosters.player_id = players.player_id 
       WHERE rosters.team_id = $1`,
      [teamId]
    );
    
    res.json(rosterResult.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /roster/category
app.post("/roster/category", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { playerId, newCategory } = req.body;
    const userId = req.user.user_id;
    // Get team ID for the user
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;
    await pool.query(
      "UPDATE rosters SET category = $1 WHERE team_id = $2 AND player_id = $3",
      [newCategory, teamId, playerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating player category:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.delete("/roster", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { playerId } = req.body;
    const userId = req.user.user_id;
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;
    await pool.query("DELETE FROM rosters WHERE team_id = $1 AND player_id = $2", [teamId, playerId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing player:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/roster/save", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  try {
    const { roster } = req.body;
    if (!Array.isArray(roster)) {
      return res.status(400).json({ error: "Invalid roster data." });
    }
    const userId = req.user.user_id;
    // Get the team ID for the logged in user
    const teamResult = await pool.query("SELECT team_id FROM teams WHERE user_id = $1", [userId]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found for this user" });
    }
    const teamId = teamResult.rows[0].team_id;
    
    // Begin transaction
    await pool.query("BEGIN");
    
    // For each player in the submitted roster, update their category in the rosters table.
    // We assume each player object contains a `player_id` and a `category` field.
    for (const player of roster) {
      await pool.query(
        "UPDATE rosters SET category = $1 WHERE team_id = $2 AND player_id = $3",
        [player.category, teamId, player.player_id]
      );
    }
    
    // Commit the transaction
    await pool.query("COMMIT");
    
    res.json({ success: true, message: "Lineup saved." });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error saving lineup:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});





const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});