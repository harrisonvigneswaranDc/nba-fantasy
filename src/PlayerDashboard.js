import React from "react";
import { Link } from "react-router-dom";
import "./PlayerDashboard.css"; // <-- reference the CSS file
import Header from "./Header";

function PlayerDashboard() {
  return (
    <div>
      
    <div className="player-dashboard-page">
      <Header />

      <h2 className="dashboard-title">PLAYER DASHBOARD</h2>

      {/* Info & Score */}
      <div className="info-score-section">
        <div className="card user-team-info-box">
          <p>Team Name: Example 1</p>
          <p>User Rank: #3 in League</p>
          <p>Current Record: 5 Wins - 2 Losses</p>
          <p>Salary Cap Usage: $XX / $YYY</p>
        </div>
        <div className="card team-score-box">
          <p>[Team Score vs Opponent Score]</p>
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
          <p>Propose and review trades.TradeMachine</p>
        </div>
        <div className="quick-link-card">
          <h3>Matchup</h3>
          <Link to="/player-matchup">Go to Curent Matchup</Link>
          <p>This is the results of your matchup.</p>
        </div>
        <div className="quick-link-card">
          <h3>League</h3>
          <Link to="/player-league">Go to Player League</Link>
          <p>View league standings, chat, etc.</p>
        </div>
      </div>

      {/* Additional info section */}
      <div className="updates-section">
        <h4>Additional Info / Real-Time Updates</h4>
        <ul>
          <li>Current Team Info: “Matchup vs. Team NOVA...”</li>
          <li>Next Game Info: “vs. Team Bobcats...”</li>
          <li>Today's Players: Player A, Player B</li>
          <li>Injury Alerts: “Player A (Day-to-Day), Player B (Out).”</li>
          <li>Recent Activity: “Signed Player D, Dropped Player G.”</li>
        </ul>
      </div>
    </div>
    </div>
  );
}

export default PlayerDashboard;
