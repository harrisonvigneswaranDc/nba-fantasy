import React, { useEffect, useState } from "react";
import "./PlayerDashboardRoster.css";
import Header from "./Header";

function PlayerDashboardRoster() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  // Filter the roster by category
  const starters = roster.filter((player) => player.category === "starter");
  const bench = roster.filter((player) => player.category === "bench");
  const dnp = roster.filter((player) => player.category === "reserve");

  if (loading) return <div>Loading roster...</div>;

  return (
    <div className="roster-page">
      <Header />

      <div className="content-row">
        {/* Left Column: Salary Cap Info + Roster */}
        <div className="left-column">
          {/* Salary Cap Info */}
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
                      <button className="remove-player-btn">REMOVE</button>
                      <button className="bench-btn">BENCH</button>
                      <button className="dnp-btn">DNP</button>
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
                      <button className="remove-player-btn">REMOVE</button>
                      <button className="start-btn">START</button>
                      <button className="dnp-btn">DNP</button>
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
              {dnp.length > 0 ? (
                dnp.map((player) => (
                  <li key={player.player_id} className="player-item">
                    <div className="player-info">
                      <strong>{player.player}</strong> ({player.pos}) - ${player.salary}
                    </div>
                    <div className="player-buttons">
                      <button className="remove-player-btn">REMOVE</button>
                      <button className="bench-btn">BENCH</button>
                      <button className="start-btn">START</button>
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

      {/* Footer Buttons: Save or Cancel */}
      <div className="lineup-buttons">
        <button className="save-btn">Save Lineup</button>
        <button className="cancel-btn">Cancel</button>
      </div>
    </div>
  );
}

export default PlayerDashboardRoster;
