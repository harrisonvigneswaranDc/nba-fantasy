import React from "react";
import "./PlayerTradeMachine.css";
import Header from "./Header";
export default function TradeMachine() {
  return (
    <div>
      
    <div className="trade-machine-page">
      <Header />


      {/* Incoming Trades Table */}
      <div className="section-title">Incoming Trade Offers</div>
      <div className="table-container">
        <table className="trade-table">
          <thead>
            <tr>
              <th>FROM (Team)</th>
              <th>PLAYERS OFFERED</th>
              <th>PLAYERS REQUESTED</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Team Knights</td>
              <td>Devin Booker (G)</td>
              <td>Klay Thompson (G)</td>
              <td>Pending</td>
              <td>[Accept] [Reject] [Counter]</td>
            </tr>
            <tr>
              <td>Team Dragons</td>
              <td>Pascal Siakam (F)</td>
              <td>Chris Paul (G)</td>
              <td>Pending</td>
              <td>[Accept] [Reject] [Counter]</td>
            </tr>
            <tr>
              <td>...</td>
              <td>...</td>
              <td>...</td>
              <td>...</td>
              <td>...</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Outgoing Trades Table */}
      <div className="section-title">Outgoing Trades (You Proposed)</div>
      <div className="table-container">
        <table className="trade-table">
          <thead>
            <tr>
              <th>TO (Team)</th>
              <th>PLAYERS OFFERED</th>
              <th>PLAYERS REQUESTED</th>
              <th>STATUS</th>
              <th>CANCEL TRADE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Team Bobcats</td>
              <td>Andrew Wiggins (F)</td>
              <td>De'Aaron Fox (G)</td>
              <td>Awaiting Reply</td>
              <td>[Cancel]</td>
            </tr>
            <tr>
              <td>Team Raptors</td>
              <td>Nikola Vucevic (C)</td>
              <td>Siakam (F), Gary Trent (G)</td>
              <td>Countered</td>
              <td>[Cancel]</td>
            </tr>
            <tr>
              <td>...</td>
              <td>...</td>
              <td>...</td>
              <td>...</td>
              <td>...</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Propose New Trade Section */}
      <div className="section-title">Propose New Trade</div>
      <div className="propose-trade-container">
        {/* Top row with some small controls */}
        <div className="propose-trade-controls">
          <span>(3) [Reset]</span>
          <span>(4) [Try Trade]</span>
        </div>

        <div className="trade-panels">
          {/* Team 1 Panel */}
          <div className="trade-panel">
            <div className="panel-header">
              <div>[Team Logo] Battery Brains #9</div>
              <div>[Delete Team Icon]</div>
            </div>
            <div className="panel-info">
              <p>Over Tax: $22.2M, Cap Space: -$52.5M</p>
              <p>Roster Cap: $193.0M, Total Cap: $193.0M</p>
              <p>2nd Apron Team Before Trade (Cannot aggregate players)</p>
            </div>

            {/* Player Cards (instead of a list) */}
            <div className="player-cards">
              <h4>Roster (10)</h4>
              <div className="player-card">
                <p>
                  <strong>Giannis Antetokounmpo (PF)</strong> <br/>
                  $48.7M /4yrs (PER:30, PPG:31.5, REB:12, AST:6)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Damian Lillard (PG)</strong> <br/>
                  $48.7M /3yrs (PER:21.6, PPG:25, REB:4.4, AST:7.1)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Khris Middleton (SF)</strong> <br/>
                  $31.6M /2yrs (PER:17.8, PPG:20, REB:5.4, AST:5.1)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Bobby Portis (PF/C)</strong> <br/>
                  $11.7M /2yrs (PER:18.6, PPG:14, REB:10, AST:1.2)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <p>... more players ...</p>
            </div>
          </div>

          {/* Team 2 Panel */}
          <div className="trade-panel">
            <div className="panel-header">
              <div>[Team Logo] Junior</div>
              <div>[Add Team]</div>
            </div>
            <div className="panel-info">
              <p>Under Tax: $1.1M, Cap Space: -$29.1M</p>
              <p>Roster Cap: $168.5M, Total Cap: $169.6M</p>
              <p>Over the cap/non-tax team</p>
            </div>

            {/* Player Cards */}
            <div className="player-cards">
              <h4>Roster (7)</h4>
              <div className="player-card">
                <p>
                  <strong>Pascal Siakam (PF)</strong> <br/>
                  $42.1M /4yrs (PER:19.6, PPG:20.1, REB:7.3, AST:3.4)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Tyrese Haliburton (PG)</strong> <br/>
                  $42.1M /5yrs (PER:19.5, PPG:17.9, REB:3.6, AST:8.8)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Myles Turner (C)</strong> <br/>
                  $19.9M /1yr (PER:20.5, PPG:17, REB:7.5, BLK:2.3)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <div className="player-card">
                <p>
                  <strong>Buddy Hield (SG)</strong> <br/>
                  $22.4M /1yr (PER:16.7, PPG:15.5, REB:4.0, AST:2.0)
                </p>
                <button className="add-trade-btn">[ +Add ]</button>
              </div>
              <p>... more players ...</p>
            </div>
          </div>
        </div>

        {/* Trade Summary & Validation */}
        <div className="trade-summary">
          <p><strong>Trade Summary</strong></p>
          <p>- Bucks sending out: Giannis ($48.7M), Middleton ($31.6M)</p>
          <p>- Pacers sending out: Siakam ($42.1M), Myles Turner ($19.9M)</p>
          <p>- Salary difference, cap impact, etc.</p>
          <button className="validate-btn">Try Trade (Validate)</button>
          {/* Example message */}
          <p className="trade-result-placeholder">
            "Trade failed: Hard cap exceeded" or "Trade successful!"
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
