import React, { useEffect, useState } from "react";
import "./PlayerDashboardMatchup.css";
import Header from "./Header";

function PlayerDashboardMatchup() {
  const [data, setData] = useState(null);
  const [seasonRange, setSeasonRange] = useState({ season_start: "", season_end: "", league_name: "" });
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rosterA, setRosterA] = useState([]);
  const [rosterB, setRosterB] = useState([]);
  const [gamesPlayedTeamA, setGamesPlayedTeamA] = useState([]);
  const [gamesPlayedTeamB, setGamesPlayedTeamB] = useState([]);

  // First, fetch league info to get season start and end dates.
  useEffect(() => {
    const fetchLeagueInfo = async () => {
      try {
        const res = await fetch("http://localhost:3001/league-info", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Network response not ok");
        }
        const leagueInfo = await res.json();
        setSeasonRange({
          season_start: new Date(leagueInfo.season_start).toISOString().slice(0, 10),
          season_end: new Date(leagueInfo.season_end).toISOString().slice(0, 10),
          league_name: leagueInfo.league_name,
        });
        setSelectedDate(new Date(leagueInfo.season_start).toISOString().slice(0, 10));
      } catch (err) {
        console.error("Error fetching league info:", err);
        setError("Error fetching league info");
      }
    };
    fetchLeagueInfo();
  }, []);

  // Function to fetch roster data
  const fetchRoster = async (date, teamId, setter) => {
    try {
      setLoading(true);
      const url = `http://localhost:3001/roster?gameDate=${date}&teamId=${teamId}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch roster for team ${teamId} on ${date}`);
      }
      const data = await response.json();
      setter(data);
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error);
      setError(`Error fetching roster for team ${teamId}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch games played data
  const fetchGamesPlayed = async (date, teamId, setter) => {
    try {
      setLoading(true);
      const url = `http://localhost:3001/games-played?gameDate=${date}&teamId=${teamId}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch games played for team ${teamId} on ${date}`);
      }
      const data = await response.json();
      setter(data);
    } catch (error) {
      console.error(`Error fetching games played for team ${teamId}:`, error);
      setError("Error fetching games played");
    } finally {
      setLoading(false);
    }
  };

  // Fetch matchup-season data, rosters, and games played
  useEffect(() => {
    const fetchData = async () => {
      if (selectedDate) {
        try {
          setLoading(true);
          const res = await fetch("http://localhost:3001/matchup-season", { credentials: "include" });
          if (!res.ok) {
            throw new Error("Network response was not ok");
          }
          const jsonData = await res.json();
          setData(jsonData);

          if (jsonData.matchup) {
            await Promise.all([
              fetchRoster(selectedDate, jsonData.matchup.team_a_id, setRosterA),
              fetchRoster(selectedDate, jsonData.matchup.team_b_id, setRosterB),
              fetchGamesPlayed(selectedDate, jsonData.matchup.team_a_id, setGamesPlayedTeamA),
              fetchGamesPlayed(selectedDate, jsonData.matchup.team_b_id, setGamesPlayedTeamB),
            ]);
          }
        } catch (err) {
          console.error("Error fetching matchup data:", err);
          setError("Error fetching matchup data");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [selectedDate]);

  if (loading) return <div>Loading matchup data...</div>;
  if (error) return <div>{error}</div>;
  if (!data) return <div>No matchup data available.</div>;
  if (!selectedDate) return <div>No date selected.</div>;

  const { matchup } = data;

  // Helper function to categorize players
  const categorizePlayers = (roster) => {
    const starters = roster.filter((player) => player.category === "starter");
    const bench = roster.filter((player) => player.category === "bench");
    const reserve = roster.filter((player) => player.category === "reserve");
    return { starters, bench, reserve };
  };

  // Categorize players for each team
  const teamACategories = categorizePlayers(rosterA);
  const teamBCategories = categorizePlayers(rosterB);

  // Helper function to render rows for a given category
  function renderCategoryRows(categoryLabel, teamAPlayers, teamBPlayers, gamesPlayedTeamA, gamesPlayedTeamB) {
    const maxLength = Math.max(teamAPlayers.length, teamBPlayers.length);
    const rows = [];

    console.log("Team A Game Stats:", gamesPlayedTeamA);
    console.log("Team B Game Stats:", gamesPlayedTeamB);

    // Section header row
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

      // Find game stats for the player by player_id
      const playerAGameStats = gamesPlayedTeamA.find(game => game.player_id === playerA?.player_id);
      const playerBGameStats = gamesPlayedTeamB.find(game => game.player_id === playerB?.player_id);

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
              <td>{playerAGameStats ? playerAGameStats.pts : "-"}</td>
              <td>{playerAGameStats ? playerAGameStats.reb : "-"}</td>
              <td>{playerAGameStats ? playerAGameStats.ast : "-"}</td>
              <td>{playerAGameStats ? playerAGameStats.stl : "-"}</td>
              <td>{playerAGameStats ? playerAGameStats.blk : "-"}</td>
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
              <td>{playerBGameStats ? playerBGameStats.pts : "-"}</td>
              <td>{playerBGameStats ? playerBGameStats.reb : "-"}</td>
              <td>{playerBGameStats ? playerBGameStats.ast : "-"}</td>
              <td>{playerBGameStats ? playerBGameStats.stl : "-"}</td>
              <td>{playerBGameStats ? playerBGameStats.blk : "-"}</td>
            </>
          ) : (
            <td colSpan="12"></td>
          )}
        </tr>
      );
    }
    return rows;
  }

  // Date navigation handlers
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
          Season: {seasonRange.season_start} to {seasonRange.season_end}
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
          Prev Day
        </button>
        <span>{selectedDate}</span>
        <button onClick={handleNextDay} disabled={selectedDate === seasonRange.season_end}>
          Next Day
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
            </tr>
          </thead>
          <tbody>
            {renderCategoryRows("Starters", teamACategories.starters, teamBCategories.starters, gamesPlayedTeamA, gamesPlayedTeamB)}
            {renderCategoryRows("Bench", teamACategories.bench, teamBCategories.bench, gamesPlayedTeamA, gamesPlayedTeamB)}
            {renderCategoryRows("DNP", teamACategories.reserve, teamBCategories.reserve, gamesPlayedTeamA, gamesPlayedTeamB)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerDashboardMatchup;