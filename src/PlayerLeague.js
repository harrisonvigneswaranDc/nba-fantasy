import React from "react";
import "./PlayerLeague.css";
import Header from "./Header";

function PlayerLeague() {
  return (
    <div>
      
    <div className="league-page">
      <Header />

      {/* Commissioner & Members Info */}
      <div className="league-info-box">
        <p><strong>COMMISSIONER:</strong> John Doe</p>
        <p><strong>MEMBERS:</strong> 10 Teams</p>
      </div>

      {/* Main Flex Container: Standings on the left, Chat on the right */}
      <div className="league-main-section">
        {/* Standings */}
        <div className="league-standings card">
          <h3>STANDINGS</h3>
          <table className="standings-table">
            <tbody>
              <tr>
                <td>1.</td>
                <td>Example Warriors (6-1)</td>
              </tr>
              <tr>
                <td>2.</td>
                <td>Team Bobcats (5-2)</td>
              </tr>
              <tr>
                <td>3.</td>
                <td>Team Knights (4-3)</td>
              </tr>
              <tr>
                <td>4.</td>
                <td>...</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerLeague;