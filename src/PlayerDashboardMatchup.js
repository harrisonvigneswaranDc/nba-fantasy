import React, { useEffect, useState } from "react";
import "./PlayerDashboardMatchup.css";
import Header from "./Header";

function PlayerDashboardMatchup() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUrl = `http://localhost:3001/games-played?matchup_id=1&gamePlayedId=1`;
    fetch(fetchUrl, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((jsonData) => {
        setData(jsonData);
      })
      .catch((err) => {
        console.error("Error fetching matchup data:", err);
        setError("Error fetching matchup data");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading matchup data...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No matchup data available.</div>;

  // Destructure matchup and stats from fetched data
  const { matchup, stats } = data;

  // Split players into groups for each team.
  // For display purposes, we'll treat 'reserve' as DNP.
  const teamAStarters = stats.teamA.filter(
    (player) => player.category === "starter"
  );
  const teamABench = stats.teamA.filter(
    (player) => player.category === "bench"
  );
  const teamADNP = stats.teamA.filter(
    (player) => player.category === "reserve"
  );

  const teamBStarters = stats.teamB.filter(
    (player) => player.category === "starter"
  );
  const teamBBench = stats.teamB.filter(
    (player) => player.category === "bench"
  );
  const teamBDNP = stats.teamB.filter(
    (player) => player.category === "reserve"
  );

  
  // It renders a section header and then rows side-by-side for both teams.
  function renderCategoryRows(categoryLabel, teamAPlayers, teamBPlayers) {
    const maxLength = Math.max(teamAPlayers.length, teamBPlayers.length);
    const rows = [];

    // Section header row (e.g., "STARTERS", "BENCH", or "DNP")
    rows.push(
      <tr className="section-label" key={`${categoryLabel}-header`}>
        <td colSpan="12">{categoryLabel.toUpperCase()}</td>
        <td className="middle-col"></td>
        <td colSpan="12">{categoryLabel.toUpperCase()}</td>
      </tr>
    );

    for (let i = 0; i < maxLength; i++) {
      const playerA = teamAPlayers[i];
      const playerB = teamBPlayers[i];

      rows.push(
        <tr key={`${categoryLabel}-row-${i}`}>
          {/* Team A data */}
          {playerA ? (
            <>
              <td>{playerA.pos}</td>
              <td>{playerA.player_name}</td>
              <td>{playerA.opp_time || "-"}</td>
              <td>{playerA.injury || "-"}</td>
              <td>{playerA.curr_pts || "-"}</td>
              <td>{playerA.tot_fan_pts || "-"}</td>
              <td>{playerA.pts}</td>
              <td>{playerA.reb}</td>
              <td>{playerA.ast}</td>
              <td>{playerA.stl}</td>
              <td>{playerA.blk}</td>
              <td>{playerA.tov || "-"}</td>
            </>
          ) : (
            <td colSpan="12"></td>
          )}
          {/* Divider */}
          <td className="middle-col">|</td>
          {/* Team B data */}
          {playerB ? (
            <>
              <td>{playerB.pos}</td>
              <td>{playerB.player_name}</td>
              <td>{playerB.opp_time || "-"}</td>
              <td>{playerB.injury || "-"}</td>
              <td>{playerB.curr_pts || "-"}</td>
              <td>{playerB.tot_fan_pts || "-"}</td>
              <td>{playerB.pts}</td>
              <td>{playerB.reb}</td>
              <td>{playerB.ast}</td>
              <td>{playerB.stl}</td>
              <td>{playerB.blk}</td>
              <td>{playerB.tov || "-"}</td>
            </>
          ) : (
            <td colSpan="12"></td>
          )}
        </tr>
      );
    }

    return rows;
  }

  return (
    <div className="matchup-page">
      <Header />

      {/* Team Header Section */}
      <div className="team-header-section">
        <div className="team-header-left">
          <div className="team-name">
            {matchup.teamA_name} (Score: {/* include score if available */})
          </div>
          <div className="manager-record">
            {/* Manager and record details for team A */}
          </div>
        </div>
        <div className="vs-score">VS</div>
        <div className="team-header-right">
          <div className="team-name">
            {matchup.teamB_name} (Score: {/* include score if available */})
          </div>
          <div className="manager-record">
            {/* Manager and record details for team B */}
          </div>
        </div>
      </div>

      {/* Date Navigation (Optional) */}
      <div className="date-nav">
        <button>&lt;- Prev Day</button>
        <span>Current Date</span>
        <button>Next Day -&gt;</button>
      </div>

      {/* Main Matchup Table */}
      <div className="matchup-table-container">
        <table className="matchup-table">
          <thead>
            <tr>
              {/* LEFT TEAM (columns) */}
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
              {/* Middle Divider */}
              <th className="middle-col">|</th>
              {/* RIGHT TEAM (columns) */}
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
            {renderCategoryRows("Starters", teamAStarters, teamBStarters)}
            {renderCategoryRows("Bench", teamABench, teamBBench)}
            {renderCategoryRows("DNP", teamADNP, teamBDNP)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerDashboardMatchup;

