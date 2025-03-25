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
        <section className="preview-section card">
          <h2>Quick Preview / Public Info:</h2>
          <ul>
            <li>“See a sample matchup” [Optional link]</li>
            <li>“Check out top fantasy rosters” [Optional link]</li>
          </ul>
        </section>

        {/* Join / Create League */}
        <section className="league-actions-section card">
          <div className="actions-row">
            <div className="action-box">
              <button className="join-league-btn">Join a League</button>
              <p>"Play in a friend league"</p>
              <input type="text" placeholder="[ Enter Code ]" className="enter-code-input" />
            </div>
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
