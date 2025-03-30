import React, { useEffect, useState } from "react";
import "./PlayerDashboardRoster.css";
import Header from "./Header";

function PlayerDashboardRoster() {
  // STATES
  const [roster, setRoster] = useState([]);
  const [gamesPlayed, setGamesPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [seasonRange, setSeasonRange] = useState({
    season_start: "",
    season_end: "",
    league_name: ""
  });

  // SALARY CAP SETTINGS
  const SALARY_CAP_RULES = {
    softCap: 140000000,
    firstApron: 178000000,
    hardCap: 189000000,
    totalBudget: 300000000
  };

  // CALCULATE PAYROLL AND TAXES
  const payroll = roster.reduce((sum, p) => sum + Number(p.salary || 0), 0);
  const tier1Excess =
    payroll > SALARY_CAP_RULES.softCap
      ? Math.min(payroll - SALARY_CAP_RULES.softCap, 31000000)
      : 0;
  const tier1Tax = tier1Excess * 1.5;
  const tier2Excess =
    payroll > SALARY_CAP_RULES.firstApron
      ? Math.min(payroll - SALARY_CAP_RULES.firstApron, 11000000)
      : 0;
  const tier2Tax = tier2Excess * 2;
  const tier3Excess =
    payroll > SALARY_CAP_RULES.hardCap ? payroll - SALARY_CAP_RULES.hardCap : 0;
  const tier3Tax = tier3Excess * 3;
  const totalTax = tier1Tax + tier2Tax + tier3Tax;

  const capStage =
    payroll <= SALARY_CAP_RULES.softCap
      ? "Below Soft Cap"
      : payroll <= SALARY_CAP_RULES.firstApron
      ? "Soft Cap"
      : payroll <= SALARY_CAP_RULES.hardCap
      ? "First Apron"
      : "Second Apron (Hard Cap)";

  const getCapColor = (payroll) => {
    if (payroll <= SALARY_CAP_RULES.softCap) return "#4caf50";
    if (payroll <= SALARY_CAP_RULES.firstApron) return "#ffc107";
    if (payroll <= SALARY_CAP_RULES.hardCap) return "#ff9800";
    return "#f44336";
  };

  // FETCH LEAGUE INFO
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
        setSelectedDate(seasonStart);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Error fetching league info");
      });
  }, []);

  // FETCH ROSTER FOR SELECTED DATE
  const fetchRoster = (date) => {
    setLoading(true);
    fetch(`http://localhost:3001/roster?gameDate=${date}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch roster");
        return res.json();
      })
      .then((data) => setRoster(data))
      .catch((error) => {
        console.error("Error fetching roster:", error);
        setErrorMsg("Error fetching roster");
      })
      .finally(() => setLoading(false));
  };

  // FETCH GAMES PLAYED
  const fetchGamesPlayed = () => {
    setLoading(true);
    fetch("http://localhost:3001/games-played", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch games played");
        return res.json();
      })
      .then((data) => setGamesPlayed(data))
      .catch((error) => {
        console.error("Error fetching games played:", error);
        setErrorMsg("Error fetching games played");
      })
      .finally(() => setLoading(false));
  };

  // Re-fetch roster when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      fetchRoster(selectedDate);
    }
  }, [selectedDate]);

  // Fetch games played on mount
  useEffect(() => {
    fetchGamesPlayed();
  }, []);

  // Determine if roster is locked by either any player having been picked or if a game has been played on the selected date.
  const rosterLocked =
    roster.some((player) => player.roster_picked === true) ||
    gamesPlayed.some((game) => game.game_date === selectedDate);

  // Roster filters by category
  const starters = roster.filter((player) => player.category === "starter");
  const bench = roster.filter((player) => player.category === "bench");
  const reserve = roster.filter((player) => player.category === "reserve");

  // Helper function: returns true if player action buttons should be shown
  const showPlayerButtons = () => !rosterLocked;

  // Handler for editing player category (only allowed if not locked)
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

  // Save lineup handler with validations.
  // If no argument is provided, it uses the current roster state.
  const handleSaveLineup = (rosterToSave = roster) => {
    if (!Array.isArray(rosterToSave)) {
      console.error("Expected rosterToSave to be an array:", rosterToSave);
      return;
    }
    setErrorMsg("");
    const startersFiltered = rosterToSave.filter((player) => player.category === "starter");
    const benchFiltered = rosterToSave.filter((player) => player.category === "bench");
    const reserveFiltered = rosterToSave.filter((player) => player.category === "reserve");

    if (startersFiltered.length !== 5) {
      setErrorMsg("You must have exactly 5 starters.");
      return;
    }
    if (benchFiltered.length !== 4) {
      setErrorMsg("You must have exactly 4 bench players.");
      return;
    }
    if (reserveFiltered.length > 6) {
      setErrorMsg("You must have exactly 6 reserve players.");
      return;
    }

    fetch("http://localhost:3001/roster/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roster: rosterToSave, gameDate: selectedDate }),
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
        setErrorMsg("Error saving lineup: " + error.message);
      });
  };

  // Handler to remove a player.
  // This version creates an updated roster array (without the removed player)
  // and then calls handleSaveLineup with that updated array.
  const handleRemovePlayer = (playerId) => {
    if (rosterLocked) return;
    const updatedRoster = roster.filter((player) => player.player_id !== playerId);
    handleSaveLineup(updatedRoster);
  };

  // Date navigation handlers
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

      {/* League Info & Date Selection */}
      <div className="date-section">
        <div className="league-info">
          <p>
            Season: {seasonRange.season_start} to {seasonRange.season_end} <br />
            League: {seasonRange.league_name}
          </p>
        </div>
        <div className="date-controls">
          <button onClick={handlePrevDay} disabled={selectedDate === seasonRange.season_start}>
            ◀
          </button>
          <input
            type="date"
            value={selectedDate}
            min={seasonRange.season_start}
            max={seasonRange.season_end}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button onClick={handleNextDay} disabled={selectedDate === seasonRange.season_end}>
            ▶
          </button>
        </div>
        {rosterLocked && (
          <span className="locked-message">
            Roster is locked for this game (finalized).
          </span>
        )}
      </div>

      {/* Salary Cap Card */}
      <div className="salary-cap-card card">
        <p>
          <strong>Salary Cap:</strong>
          <span> (${payroll.toLocaleString()} / ${SALARY_CAP_RULES.totalBudget.toLocaleString()})</span>
        </p>
        <p><strong>Current Cap Stage:</strong> {capStage}</p>
        <div className="salary-cap-bar">
          <div
            className="salary-cap-progress"
            style={{
              width: `${(payroll / SALARY_CAP_RULES.totalBudget) * 100}%`,
              background: getCapColor(payroll),
              height: "10px",
              borderRadius: "5px"
            }}
          ></div>
        </div>
        <div className="tax-breakdown">
          <div>
            Tier 1: ${tier1Excess.toLocaleString()} taxed at 1.5× = ${tier1Tax.toLocaleString()}
          </div>
          <div>
            Tier 2: ${tier2Excess.toLocaleString()} taxed at 2× = ${tier2Tax.toLocaleString()}
          </div>
          <div>
            Tier 3: ${tier3Excess.toLocaleString()} taxed at 3× = ${tier3Tax.toLocaleString()}
          </div>
          <div>
            <strong>Total Tax Owed:</strong> ${totalTax.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Roster Sections */}
      <div className="content-row">
        <div className="left-column">
          {/* Starters */}
          <div className="roster-section card">
            <h3>Starters (Max 5)</h3>
            <ul>
              {starters.length > 0 ? (
                starters.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {Number(player.salary).toLocaleString()}
                    </div>
                    {showPlayerButtons() && (
                      <div className="player-buttons">
                        <button onClick={() => handleRemovePlayer(player.player_id)}>REMOVE</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "bench")}>BENCH</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "reserve")}>DNP</button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li>No starters assigned</li>
              )}
            </ul>
          </div>

          {/* Bench */}
          <div className="roster-section card">
            <h3>Bench (Max 4)</h3>
            <ul>
              {bench.length > 0 ? (
                bench.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {Number(player.salary).toLocaleString()}
                    </div>
                    {showPlayerButtons() && (
                      <div className="player-buttons">
                        <button onClick={() => handleRemovePlayer(player.player_id)}>REMOVE</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "starter")}>START</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "reserve")}>DNP</button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li>No bench players assigned</li>
              )}
            </ul>
          </div>

          {/* Reserve */}
          <div className="roster-section card">
            <h3>DNP / Reserve (Max 6)</h3>
            <ul>
              {reserve.length > 0 ? (
                reserve.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player_name}</strong> ({player.pos}) - $
                      {Number(player.salary).toLocaleString()}
                    </div>
                    {showPlayerButtons() && (
                      <div className="player-buttons">
                        <button onClick={() => handleRemovePlayer(player.player_id)}>REMOVE</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "bench")}>BENCH</button>
                        <button onClick={() => handleChangeCategory(player.player_id, "starter")}>START</button>
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
      </div>

      {/* Save Lineup Button */}
      {showPlayerButtons() && (
        <div className="lineup-buttons">
          <button className="save-btn" onClick={() => handleSaveLineup()}>
            Save Lineup
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerDashboardRoster;
