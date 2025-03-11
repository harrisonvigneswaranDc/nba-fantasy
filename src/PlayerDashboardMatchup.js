import React, { useEffect, useState } from "react";
import "./PlayerDashboardMatchup.css";
import Header from "./Header";

function PlayerDashboardMatchup() {
  const [data, setData] = useState(null);
  const [seasonRange, setSeasonRange] = useState({ season_start: "", season_end: "", league_name: "" });
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // First, fetch league info to get season start and end dates.
  useEffect(() => {
    fetch("http://localhost:3001/league-info", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response not ok");
        }
        return res.json();
      })
      .then((leagueInfo) => {
        setSeasonRange({
          season_start: new Date(leagueInfo.season_start).toISOString().slice(0, 10),
          season_end: new Date(leagueInfo.season_end).toISOString().slice(0, 10),
          league_name: leagueInfo.league_name,
        });
        // Set default selected date to the season start date.
        setSelectedDate(new Date(leagueInfo.season_start).toISOString().slice(0, 10));
      })
      .catch((err) => {
        console.error("Error fetching league info:", err);
        setError("Error fetching league info");
      });
  }, []);

  // Then, fetch matchup-season data.
  useEffect(() => {
    if (selectedDate) {
      const fetchUrl = "http://localhost:3001/matchup-season";
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
    }
  }, [selectedDate]);

  if (loading) return <div>Loading matchup data...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No matchup data available.</div>;
  if (!selectedDate) return <div>No date selected.</div>;

  const { matchup, stats } = data;

  // Filter stats to include only rows for the selected date.
  const filteredStats = stats.filter((row) => {
    const rowDate = new Date(row.game_date).toISOString().slice(0, 10);
    return rowDate === selectedDate;
  });

  // Separate stats into team A and team B.
  const teamAStats = filteredStats.filter((row) => row.team_id === matchup.team_a_id);
  const teamBStats = filteredStats.filter((row) => row.team_id === matchup.team_b_id);

  // Group players by their roster category.
  const getCategory = (player) => player.category || "starter"; // default to "starter" if missing
  const teamAStarters = teamAStats.filter((player) => getCategory(player) === "starter");
  const teamABench = teamAStats.filter((player) => getCategory(player) === "bench");
  const teamADNP = teamAStats.filter((player) => getCategory(player) === "reserve");

  const teamBStarters = teamBStats.filter((player) => getCategory(player) === "starter");
  const teamBBench = teamBStats.filter((player) => getCategory(player) === "bench");
  const teamBDNP = teamBStats.filter((player) => getCategory(player) === "reserve");

  // Helper function to render rows for a given category.
  function renderCategoryRows(categoryLabel, teamAPlayers, teamBPlayers) {
    const maxLength = Math.max(teamAPlayers.length, teamBPlayers.length);
    const rows = [];

    // Section header row.
    rows.push(
      <tr className="section-label" key={`${categoryLabel}-header`}>
        <td colSpan="12">{categoryLabel.toUpperCase()}</td>
        <td className="middle-col">|</td>
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
              <td>{playerA.pts || "-"}</td>
              <td>{playerA.reb || "-"}</td>
              <td>{playerA.ast || "-"}</td>
              <td>{playerA.stl || "-"}</td>
              <td>{playerA.blk || "-"}</td>
              <td>{playerA.tov || "-"}</td>
            </>
          ) : (
            <td colSpan="12"></td>
          )}
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
              <td>{playerB.pts || "-"}</td>
              <td>{playerB.reb || "-"}</td>
              <td>{playerB.ast || "-"}</td>
              <td>{playerB.stl || "-"}</td>
              <td>{playerB.blk || "-"}</td>
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

  // Date navigation handlers. Limit navigation within the season date range.
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const prevStr = current.toISOString().slice(0, 10);
    if (prevStr >= seasonRange.season_start) {
      setSelectedDate(prevStr);
    }
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const nextStr = current.toISOString().slice(0, 10);
    if (nextStr <= seasonRange.season_end) {
      setSelectedDate(nextStr);
    }
  };

  return (
    <div className="matchup-page">
      <Header />
      <div className="league-info">
        <p>
          Season: {seasonRange.season_start} to {seasonRange.season_end}{" "}
          <br />
          League: {seasonRange.league_name}
        </p>
      </div>

      {/* Team Header Section */}
      <div className="team-header-section">
        <div className="team-header-left">
          <div className="team-name">
            {matchup.teamA_name || matchup.teama_name} (Score: {/* Score if available */})
          </div>
          <div className="manager-record">
            {/* Manager/record info for Team A */}
          </div>
        </div>
        <div className="vs-score">VS</div>
        <div className="team-header-right">
          <div className="team-name">
            {matchup.teamB_name || matchup.teamb_name} (Score: {/* Score if available */})
          </div>
          <div className="manager-record">
            {/* Manager/record info for Team B */}
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="date-nav">
        <button onClick={handlePrevDay} disabled={selectedDate === seasonRange.season_start}>
          &lt;- Prev Day
        </button>
        <span>{selectedDate}</span>
        <button onClick={handleNextDay} disabled={selectedDate === seasonRange.season_end}>
          Next Day -&gt;
        </button>
      </div>

      {/* Main Matchup Table */}
      <div className="matchup-table-container">
        <table className="matchup-table">
          <thead>
            <tr>
              {/* Left Team Columns */}
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
              {/* Right Team Columns */}
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
