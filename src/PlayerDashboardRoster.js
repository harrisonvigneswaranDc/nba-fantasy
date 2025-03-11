import React, { useEffect, useState } from "react";
import "./PlayerDashboardRoster.css";
import Header from "./Header";

function PlayerDashboardRoster() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [seasonRange, setSeasonRange] = useState({
    season_start: "",
    season_end: "",
    league_name: ""
  });

  // Fetch league info (season dates and league name)
  useEffect(() => {
    fetch("http://localhost:3001/league-info", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch league info");
        return res.json();
      })
      .then((leagueInfo) => {
        const seasonStart = new Date(leagueInfo.season_start)
          .toISOString()
          .slice(0, 10);
        const seasonEnd = new Date(leagueInfo.season_end)
          .toISOString()
          .slice(0, 10);
        setSeasonRange({
          season_start: seasonStart,
          season_end: seasonEnd,
          league_name: leagueInfo.league_name,
        });
        // Default to season start or adjust as needed
        setSelectedDate(seasonStart);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Error fetching league info");
      });
  }, []);

  // Fetch roster for a given date
  const fetchRoster = (date) => {
    setLoading(true);
    const url = `http://localhost:3001/roster?gameDate=${date}`;
    fetch(url, { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setRoster(data))
      .catch((error) => {
        console.error("Error fetching roster:", error);
        setErrorMsg("Error fetching roster");
      })
      .finally(() => setLoading(false));
  };

  // When selectedDate changes, re-fetch the roster
  useEffect(() => {
    if (selectedDate) {
      fetchRoster(selectedDate);
    }
  }, [selectedDate]);

  // Lock editing if any player record for the selected date has roster_picked true.
  const rosterLocked = roster.some(player => player.roster_picked === true);

  // Filter roster by category
  const starters = roster.filter((player) => player.category === "starter");
  const bench = roster.filter((player) => player.category === "bench");
  const reserve = roster.filter((player) => player.category === "reserve");

  // Handler to update category (only allowed if not locked)
  const handleChangeCategory = (playerId, newCategory) => {
    if (rosterLocked) return;

    fetch("http://localhost:3001/roster/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ playerId, newCategory, gameDate: selectedDate }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update player category.");
        return res.json();
      })
      .then(() => {
        fetchRoster(selectedDate);
      })
      .catch((error) => console.error("Error updating category:", error));
  };

  // Handler to remove player (only if not locked)
  const handleRemovePlayer = (playerId) => {
    if (rosterLocked) return;
    setRoster((prevRoster) =>
      prevRoster.filter((player) => player.player_id !== playerId)
    );
  };

  // Save lineup handler
  const handleSaveLineup = () => {
    setErrorMsg("");

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

    fetch("http://localhost:3001/roster/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roster, gameDate: selectedDate }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save lineup");
        return res.json();
      })
      .then(() => {
        alert(`Lineup saved successfully for ${selectedDate}!`);
        fetchRoster(selectedDate);
      })
      .catch((error) => {
        console.error("Error saving lineup:", error);
        setErrorMsg("Error saving lineup. Please try again.");
      });
  };

  // Date navigation handlers (restricting to season range)
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().slice(0, 10);
    if (newDate >= seasonRange.season_start) {
      setSelectedDate(newDate);
    }
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().slice(0, 10);
    if (newDate <= seasonRange.season_end) {
      setSelectedDate(newDate);
    }
  };

  if (loading) return <div>Loading roster...</div>;

  return (
    <div className="roster-page">
      <Header />

      {/* League Info & Date Selection Section */}
      <div className="date-section">
        <div className="league-info">
          <p>
            Season: {seasonRange.season_start} to {seasonRange.season_end} <br />
            League: {seasonRange.league_name}
          </p>
        </div>
        <label htmlFor="game-date">Select Game Date: </label>
        <input
          type="date"
          id="game-date"
          value={selectedDate}
          min={seasonRange.season_start}
          max={seasonRange.season_end}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {rosterLocked && (
          <span className="locked-message">
            Roster is locked for this game (finalized).
          </span>
        )}
      </div>

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

          {errorMsg && <div className="error-message">{errorMsg}</div>}

          {/* Starters Section */}
          <div className="roster-section card">
            <h3>Starters (Max 5)</h3>
            <ul>
              {starters.length > 0 ? (
                starters.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {player.salary}
                    </div>
                    {!rosterLocked && (
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
                    )}
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
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {player.salary}
                    </div>
                    {!rosterLocked && (
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
                    )}
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
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {player.salary}
                    </div>
                    {!rosterLocked && (
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
                    )}
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

      {/* Footer Button: Save Lineup (only if not locked) */}
      {!rosterLocked && (
        <div className="lineup-buttons">
          <button className="save-btn" onClick={handleSaveLineup}>
            Save Lineup
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerDashboardRoster;
