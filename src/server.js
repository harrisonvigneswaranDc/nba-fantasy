const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: "postgres",       // Replace with your PostgreSQL username
    host: "localhost",              // Replace if your host is different
    database: "postgres",        // The name of your database
    password: "harri029",   // Replace with your PostgreSQL password
    port: 5432,                     // Default PostgreSQL port
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});