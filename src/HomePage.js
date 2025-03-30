import React from "react";
import { Link } from "react-router-dom"; // Import Link
import "./HomePage.css";
import Header from "./Header";

function HomePage() {
  return (
    <div className="home-page">
      <Header />

      {/* Main Container */}
      <div className="main-content">
        {/* About Our League Format / Rules */}
        <section className="league-rules-section card">
          <h2>About Our League Format / Rules:</h2>
          <ul>
            <li>Soft and Hard Caps, Salary Exceptions, Realistic GM Tools</li>
            <li>Draft new players or keep your favorites</li>
            <li>Compete against friends or public leagues</li>
          </ul>
        </section>

        {/* Quick Preview / Public Info */}
        <div class="matchup-card">
  <div class="header">
    <span>Pracice Fantasy matchup</span>
    <span>&raquo;</span>
  </div>
  
  <div class="matchup-content">
    <div class="team-card">
      <div class="team-info">
        <div>Battery Brains</div>
        <div>(3-8-0 | 12th)</div>
      </div>
      <div class="team-score">569.50</div>
    </div>
    
    <div class="vs">vs</div>
    
    <div class="team-card">
      <div class="team-info">
        <div>Raptors Revenge</div>
        <div>(10-1-0 | 1st)</div>
      </div>
      <div class="team-score">904.30</div>
    </div>
  </div>
</div>


        {/* Join / Create League */}
        <section className="league-actions-section card">
          <div className="actions-row">
            <div className="action-box">
              <Link to="./live-draft-page">
              <button className="create-league-btn">Create a League</button>
              </Link>
              <p>"Be a commissioner, set the rules, invite your friends to play"</p>
            </div>
          </div>
        </section>

        {/* Navigation to Draft Board */}
        <section className="draft-navigation">
          <h2>Practice Your Fantasy Draft</h2>
          <Link to="./practice-draft">
            <button className="practice-draft-btn">Start Practice Draft</button>
          </Link>
        </section>

      </div>

      {/* Footer Area */}
      <footer className="footer-area">
        <span>[Privacy Policy]</span>
        <span>[Terms of Service]</span>
        <span>[Contact]</span>
      </footer>
    </div>
  );
}

export default HomePage;
