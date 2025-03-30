import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PlayerDashboard.css"; // Reference the CSS file
import Header from "./Header";

function PlayerDashboard() {
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [matchupData, setMatchupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch league info on mount (if needed)
  useEffect(() => {
    const fetchLeagueInfo = async () => {
      try {
        const res = await fetch("http://localhost:3001/league-info", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Network response not ok");
        const data = await res.json();
        setLeagueInfo(data);
      } catch (err) {
        console.error("Error fetching league info:", err);
        setError("Error fetching league info");
      }
    };
    fetchLeagueInfo();
  }, []);

  // Fetch matchup data (which includes scores) from /matchup-season
  useEffect(() => {
    const fetchMatchupData = async () => {
      try {
        const res = await fetch("http://localhost:3001/matchup-season", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Network response not ok");
        const data = await res.json();
        setMatchupData(data);
      } catch (err) {
        console.error("Error fetching matchup data:", err);
        setError("Error fetching matchup data");
      } finally {
        setLoading(false);
      }
    };
    fetchMatchupData();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  // Assuming the matchup data contains a 'matchup' object with scores:
  const matchup = matchupData?.matchup;
  const teamAScore = matchup ? Number(matchup.team_a_score).toFixed(2) : "N/A";
  const teamBScore = matchup ? Number(matchup.team_b_score).toFixed(2) : "N/A";

  return (
    <div className="player-dashboard-page">
      <Header />
      <h2 className="dashboard-title">PLAYER DASHBOARD</h2>

      {/* Info & Score Section */}
      <div className="info-score-section">
        <div className="card user-team-info-box">
          <p>Team Name: Example 1</p>
          <p>User Rank: #3 in League</p>
          <p>Current Record: 5 Wins - 2 Losses</p>
          <p>Salary Cap Usage: $XX / $YYY</p>
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

      {/* Quick Links */}
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
