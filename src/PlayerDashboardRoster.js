import React, { useEffect, useState } from "react";
import "./PlayerDashboardRoster.css";
import Header from "./Header";

function PlayerDashboardRoster() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  

  // Function to fetch roster data from backend
  const fetchRoster = () => {
    fetch("http://localhost:3001/roster", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setRoster(data))
      .catch((error) => console.error("Error fetching roster:", error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  // Filter the roster by category
  const starters = roster.filter((player) => player.category === "starter");
  const bench = roster.filter((player) => player.category === "bench");
  const reserve = roster.filter((player) => player.category === "reserve");

  // Handler to update the player's category (local update)
  const handleChangeCategory = (playerId, newCategory) => {
    setRoster((prevRoster) =>
      prevRoster.map((player) =>
        player.player_id === playerId ? { ...player, category: newCategory } : player
      )
    );
  };

  // Handler to remove a player (local update)
  const handleRemovePlayer = (playerId) => {
    setRoster((prevRoster) =>
      prevRoster.filter((player) => player.player_id !== playerId)
    );
  };

  // Handler for Save Lineup with validation rules
  const handleSaveLineup = () => {
    setErrorMsg(""); // Clear any previous error message

    // Validation rules (adjust thresholds as needed)
    if (starters.length !== 5) {
      setErrorMsg("You must have exactly 5 starters.");
      return;
    }
    if (bench.length !== 4) {
      setErrorMsg("You must have exactly 4 bench players.");
      return;
    }
    if (reserve.length !== 6) {
      setErrorMsg("You must have exactly 6 reserve players.");
      return;
    }

    // If validation passes, send a request to save the lineup.
    fetch("http://localhost:3001/roster/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roster }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save lineup");
        return res.json();
      })
      .then(() => {
        alert("Lineup saved successfully!");
        // Optionally refresh the roster from backend
        fetchRoster();
      })
      .catch((error) => {
        console.error("Error saving lineup:", error);
        setErrorMsg("Error saving lineup. Please try again.");
      });
  };

  if (loading) return <div>Loading roster...</div>;

  return (
    <div className="roster-page">
      <Header />

      <div className="content-row">
        {/* Left Column: Salary Cap Info + Roster */}
        <div className="left-column">
          <div className="salary-cap-card card">
            <p>
              <strong>Salary Cap:</strong>
              <span className="progress-bar">($152M used / $165M)</span>
            </p>
            <ul>
              <li>- You are currently $13M below the Hard Cap</li>
              <li>- You have $2.5M remaining from your Mid-Level Exception</li>
              <li>- Under the Luxury Tax Threshold by $3M</li>
            </ul>
          </div>

          {/* Display error message if any */}
          {errorMsg && <div className="error-message">{errorMsg}</div>}

          {/* Starters Section */}
          <div className="roster-section card">
            <h3>Starters (Max 5)</h3>
            <ul>
              {starters.length > 0 ? (
                starters.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player}</strong> ({player.pos}) - ${player.salary}
                    </div>
                    <div className="player-buttons">
                      <button
                        className="remove-player-btn"
                        onClick={() => handleRemovePlayer(player.player_id)}
                      >
                        REMOVE
                      </button>
                      <button
                        className="bench-btn"
                        onClick={() => handleChangeCategory(player.player_id, "bench")}
                      >
                        BENCH
                      </button>
                      <button
                        className="dnp-btn"
                        onClick={() => handleChangeCategory(player.player_id, "reserve")}
                      >
                        DNP
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li>No starters assigned</li>
              )}
            </ul>
          </div>

          {/* Bench Section */}
          <div className="roster-section card">
            <h3>Bench (Max 4)</h3>
            <ul>
              {bench.length > 0 ? (
                bench.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player}</strong> ({player.pos}) - ${player.salary}
                    </div>
                    <div className="player-buttons">
                      <button
                        className="remove-player-btn"
                        onClick={() => handleRemovePlayer(player.player_id)}
                      >
                        REMOVE
                      </button>
                      <button
                        className="start-btn"
                        onClick={() => handleChangeCategory(player.player_id, "starter")}
                      >
                        START
                      </button>
                      <button
                        className="dnp-btn"
                        onClick={() => handleChangeCategory(player.player_id, "reserve")}
                      >
                        DNP
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li>No bench players assigned</li>
              )}
            </ul>
          </div>

          {/* DNP / Reserve Section */}
          <div className="roster-section card">
            <h3>DNP / Reserve (Max 6)</h3>
            <ul>
              {reserve.length > 0 ? (
                reserve.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player}</strong> ({player.pos}) - ${player.salary}
                    </div>
                    <div className="player-buttons">
                      <button
                        className="remove-player-btn"
                        onClick={() => handleRemovePlayer(player.player_id)}
                      >
                        REMOVE
                      </button>
                      <button
                        className="bench-btn"
                        onClick={() => handleChangeCategory(player.player_id, "bench")}
                      >
                        BENCH
                      </button>
                      <button
                        className="start-btn"
                        onClick={() => handleChangeCategory(player.player_id, "starter")}
                      >
                        START
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li>No reserve players assigned</li>
              )}
            </ul>
          </div>
        </div>

        {/* Right Column: Injury Status & Suggested Moves */}
        <div className="right-column">
          <div className="injury-status-card card">
            <h4>Injury Status:</h4>
            <ul>
              <li>• Anthony Davis (PF) – Day-to-Day (knee soreness)</li>
              <li>• Chris Paul (PG) – Probable (minor ankle sprain)</li>
              <li>• Andrew Wiggins (SF) – Out (concussion protocol)</li>
            </ul>
          </div>
          <div className="moves-card card">
            <h4>Suggested Moves:</h4>
            <ul>
              <li>1. "Start Andrew Wiggins over Klay Thompson once cleared."</li>
              <li>2. "Bench Anthony Davis if knee soreness worsens."</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Button: Save Lineup */}
      <div className="lineup-buttons">
        <button className="save-btn" onClick={handleSaveLineup}>
          Save Lineup
        </button>
      </div>
    </div>
  );
}

export default PlayerDashboardRoster;
