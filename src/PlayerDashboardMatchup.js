import React from "react";
import "./PlayerDashboardMatchup.css";

function PlayerDashboardMatchup() {
  return (
    <div className="matchup-page">
      {/* Example Top Bar */}
      <div className="matchup-topbar">
        <div className="left">[League/Platform Logo]</div>
        <div className="right">[User Profile Icon / Logout]</div>
      </div>

      {/* Team Header Section */}
      <div className="team-header-section">
        <div className="team-header-left">
          <div className="team-name">Battery Brains (Score: 545.70)</div>
          <div className="manager-record">
            Manager: Harrison (Since '21), Record: 3-8-0 (12th)
          </div>
        </div>
        <div className="vs-score">894.60 vs 894.60</div>
        <div className="team-header-right">
          <div className="team-name">Raptors Revenge</div>
          <div className="manager-record">
            Manager: Gurman (Since '21), Record: 10-1-0 (1st)
          </div>
        </div>
      </div>

      {/* Date Navigation (Optional) */}
      <div className="date-nav">
        <button>&lt;- Tue, Jan 21</button>
        <span>Wed, Jan 22</span>
        <button>Thu, Jan 23 -&gt;</button>
      </div>

      {/* Main Matchup Table */}
      <div className="matchup-table-container">
        <table className="matchup-table">
          <thead>
            <tr>
              {/* LEFT TEAM (12 columns) */}
              <th>Pos</th>
              <th>Player</th>
              <th>Opp-Time</th>
              <th>Injury</th>
              <th>CurrPts</th>
              <th>TotFanPts</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>ST</th>
              <th>BLK</th>
              <th>TO</th>

              {/* Middle Column (1 col) */}
              <th className="middle-col">|</th>

              {/* RIGHT TEAM (12 columns) */}
              <th>Pos</th>
              <th>Player</th>
              <th>Opp-Time</th>
              <th>Injury</th>
              <th>CurrPts</th>
              <th>TotFanPts</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>ST</th>
              <th>BLK</th>
              <th>TO</th>
            </tr>
          </thead>

          <tbody>
            {/* STARTERS Label Row */}
            <tr className="section-label">
              <td colSpan="12">STARTERS</td>
              <td className="middle-col"></td>
              <td colSpan="12">STARTERS</td>
            </tr>

            {/* Example Starter Row */}
            <tr>
              {/* Left (12) */}
              <td>PG</td>
              <td>Donovan Mitchell</td>
              <td>@HOU, 8pm</td>
              <td>-</td> {/* Injury status if any */}
              <td>29.10</td>
              <td>55.20</td>
              <td>19</td>
              <td>3</td>
              <td>3</td>
              <td>0</td>
              <td>1</td>
              <td>1</td>

              {/* Middle */}
              <td className="middle-col">|</td>

              {/* Right (12) */}
              <td>PG</td>
              <td>Fred VanVleet</td>
              <td>@CHI,9pm</td>
              <td>-</td>
              <td>38.70</td>
              <td>85.90</td>
              <td>22</td>
              <td>4</td>
              <td>7</td>
              <td>2</td>
              <td>0</td>
              <td>3</td>
            </tr>

            {/* Another example row */}
            <tr>
              <td>SG</td>
              <td>Bradley Beal (GTD)</td>
              <td>@BKN,6pm</td>
              <td>GTD</td>
              <td>0.00</td>
              <td>15.40</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>

              <td className="middle-col">|</td>

              <td>SG</td>
              <td>Gary Trent Jr.</td>
              <td>vs PHI,8pm</td>
              <td>-</td>
              <td>10.50</td>
              <td>32.10</td>
              <td>8</td>
              <td>2</td>
              <td>1</td>
              <td>0</td>
              <td>0</td>
              <td>2</td>
            </tr>

            {/* BENCH Label Row */}
            <tr className="section-label">
              <td colSpan="12">BENCH</td>
              <td className="middle-col"></td>
              <td colSpan="12">BENCH</td>
            </tr>

            <tr>
              <td>1.</td>
              <td>Chris Paul</td>
              <td>vs MIA,7pm</td>
              <td>-</td>
              <td>12.50</td>
              <td>30.0</td>
              <td>14</td>
              <td>4</td>
              <td>8</td>
              <td>2</td>
              <td>0</td>
              <td>3</td>

              <td className="middle-col">|</td>

              <td>1.</td>
              <td>Precious Achiuwa</td>
              <td>@NYK,7:30</td>
              <td>-</td>
              <td>4.50</td>
              <td>16.2</td>
              <td>6</td>
              <td>5</td>
              <td>1</td>
              <td>1</td>
              <td>0</td>
              <td>2</td>
            </tr>

            {/* DNP Label Row */}
            <tr className="section-label">
              <td colSpan="12">DNP</td>
              <td className="middle-col"></td>
              <td colSpan="12">DNP</td>
            </tr>

            <tr>
              <td>PF</td>
              <td>Jarred Vanderbilt</td>
              <td>vs DAL,7:30</td>
              <td>Out-Injury</td>
              <td>0.00</td>
              <td>0.0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>

              <td className="middle-col">|</td>

              <td>PG</td>
              <td>Malik Beasley</td>
              <td>vs MIN,7pm</td>
              <td>Out-Injury</td>
              <td>0.00</td>
              <td>0.0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
              <td>0</td>
            </tr>
            {/* more rows if needed ... */}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerDashboardMatchup;
