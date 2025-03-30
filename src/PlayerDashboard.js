// PlayerDashboard.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PlayerDashboard.css"; // Reference your CSS file
import Header from "./Header";

function PlayerDashboard() {
  // State for the user's team info (from /team-info)
  const [teamInfo, setTeamInfo] = useState(null);
  // State for matchup data (if available)
  const [matchupData, setMatchupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the logged-in user's team info from /team-info
  useEffect(() => {
    fetch("http://localhost:3001/team-info", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching team info");
        }
        return response.json();
      })
      .then((data) => {
        setTeamInfo(data);
      })
      .catch((err) => {
        console.error("Error fetching team info:", err);
        setError("Error fetching team info");
      });
  }, []);

  // Fetch matchup data from /matchup-season (if needed)
  useEffect(() => {
    fetch("http://localhost:3001/matchup-season", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching matchup data");
        }
        return response.json();
      })
      .then((data) => {
        setMatchupData(data);
      })
      .catch((err) => {
        console.error("Error fetching matchup data:", err);
        setError("Error fetching matchup data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!teamInfo) return <div>No team info available.</div>;

  // Extract matchup info if available
  const matchup = matchupData?.matchup;
  const teamAScore = matchup ? Number(matchup.team_a_score).toFixed(2) : "N/A";
  const teamBScore = matchup ? Number(matchup.team_b_score).toFixed(2) : "N/A";

  // Get the user's team info from the endpoint response.
  const myTeam = teamInfo.myTeam;

  return (
    <div className="player-dashboard-page">
      <Header />
      <h2 className="dashboard-title">PLAYER DASHBOARD</h2>

      {/* Info & Score Section */}
      <div className="info-score-section">
        <div className="card user-team-info-box">
          <p>
            <strong>Team Name:</strong> {myTeam.team_name}
          </p>
          {/* You can include a rank if you compute it elsewhere; otherwise omit */}
          <p>
            <strong>Current Record:</strong> {myTeam.wins} Wins - {myTeam.losses} Losses
          </p>
          <p>
            <strong>Salary Cap Usage:</strong> ${myTeam.team_salary}
          </p>
        </div>
        <div className="card team-score-box enhanced-matchup-box">
          <h3>Current Matchup</h3>
          {matchup ? (
            <div className="score-container">
              <div className="team-block">
                <p className="team-name">{matchup.teamA_name || "Team A"}</p>
                <p className="score">{teamAScore}</p>
              </div>
              <span className="vs-text">vs</span>
              <div className="team-block">
                <p className="team-name">{matchup.teamB_name || "Team B"}</p>
                <p className="score">{teamBScore}</p>
              </div>
            </div>
          ) : (
            <p>No matchup available.</p>
          )}
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="quick-links-container">
        <div className="quick-link-card">
          <h3>Roster</h3>
          <Link to="/player-roster">Go to Your Roster</Link>
          <p>View and manage your players.</p>
        </div>
        <div className="quick-link-card">
          <h3>Free Agents</h3>
          <Link to="/free-agents">Go to Free Agents</Link>
          <p>Discover and sign available players.</p>
        </div>
        <div className="quick-link-card">
          <h3>Trade Machine</h3>
          <Link to="/player-trade-machine">Go to Trade Machine</Link>
          <p>Propose and review trades.</p>
        </div>
        <div className="quick-link-card">
          <h3>Matchup</h3>
          <Link to="/player-matchup">Go to Current Matchup</Link>
          <p>View the results of your matchup.</p>
        </div>
        <div className="quick-link-card">
          <h3>League</h3>
          <Link to="/player-league">Go to Player League</Link>
          <p>View league standings, chat, etc.</p>
        </div>
      </div>
    </div>
  );
}

export default PlayerDashboard;
