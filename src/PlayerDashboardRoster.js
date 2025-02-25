import React from "react";
import "./PlayerDashboardRoster.css";

function PlayerDashboardRoster() {
  return (
    <div className="roster-page">
      {/* Header Row: ROSTER & SALARY CAP on the left, Injury Status & Moves + user info on right */}
      <div className="roster-header">
        <div className="header-left">
          <h2>ROSTER & SALARY CAP</h2>
        </div>
        <div className="header-right">
          <h2>INJURY STATUS & SUGGESTED MOVES</h2>
          <div className="user-profile-logout">
            [User Profile Icon / Logout]
          </div>
        </div>
      </div>

      <div className="content-row">
        {/* Left Column: Salary Cap Info + Roster */}
        <div className="left-column">
          {/* Salary Cap Info */}
          <div className="salary-cap-card card">
            <p><strong>Salary Cap:</strong> 
              <span className="progress-bar">
                ($152M used / $165M)
              </span>
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
              <li>PG: Stephen Curry ($10M) [Bench?]</li>
              <li>SG: Klay Thompson ($5M) [Bench?]</li>
              <li>SF: LeBron James ($15M) [Bench?]</li>
              <li>PF: Anthony Davis ($12M) [Bench?]</li>
              <li>C: Nikola Jokic ($18M) [Bench?]</li>
            </ul>
          </div>

          {/* Bench Section */}
          <div className="roster-section card">
            <h3>Bench (Max 4)</h3>
            <ul>
              <li>1. Chris Paul ($8M) [Start?]</li>
              <li>2. Andrew Wiggins ($8M) [Start?]</li>
              <li>3. Draymond Green ($7M) [Start?]</li>
              <li>4. Kelly Oubre Jr. ($6M) [Start?]</li>
            </ul>
          </div>

          {/* DNP Section */}
          <div className="roster-section card">
            <h3>DNP (Max 6)</h3>
            <ul>
              <li>1. Vacant Roster Spot ... [Bench?]</li>
              <li>2. Vacant Roster Spot ... [Bench?]</li>
              <li>3. Vacant Roster Spot ... [Bench?]</li>
              <li>4. Vacant Roster Spot ... [Bench?]</li>
              <li>5. Vacant Roster Spot ... [Bench?]</li>
              <li>6. Vacant Roster Spot ... [Bench?]</li>
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
