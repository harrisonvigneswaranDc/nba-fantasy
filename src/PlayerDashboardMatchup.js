import React, { useEffect, useRef, useState } from "react";
import "./PlayerDashboardMatchup.css";
import Header from "./Header";

function PlayerDashboardMatchup() {
  // State variables
  const [data, setData] = useState(null);
  const [seasonRange, setSeasonRange] = useState({
    season_start: "",
    season_end: "",
    league_name: "",
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rosterA, setRosterA] = useState([]);
  const [rosterB, setRosterB] = useState([]);
  const [gamesPlayedTeamA, setGamesPlayedTeamA] = useState([]);
  const [gamesPlayedTeamB, setGamesPlayedTeamB] = useState([]);

  // Refs for tracking updates and previous date
  const lastUpdatedDateRef = useRef("");
  const initialLoadRef = useRef(true);
  const prevSelectedDateRef = useRef("");
  // Flag to ensure daily score is added only once when navigating forward
  const hasAddedDailyScoreRef = useRef(false);

  // Helper: Calculate fantasy points for a player
  const calculateFantasyPoints = (stats) => {
    const pts = Number(stats.pts) || 0;
    const reb = Number(stats.reb) || 0;
    const ast = Number(stats.ast) || 0;
    const stl = Number(stats.stl) || 0;
    const blk = Number(stats.blk) || 0;
    return pts + reb * 1.2 + ast * 1.5 + stl * 3 + blk * 3;
  };

  // Helper: Sum total score from an array of game stats
  const totalScore = (gamesArray) =>
    gamesArray.reduce((acc, curr) => acc + calculateFantasyPoints(curr), 0);

  // Track the previous selected date using a ref
  useEffect(() => {
    // Save the previous date before it updates
    prevSelectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Fetch league info on component mount
  useEffect(() => {
    const fetchLeagueInfo = async () => {
      try {
        const res = await fetch("http://localhost:3001/league-info", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Network response not ok");
        const leagueInfo = await res.json();
        setSeasonRange({
          season_start: new Date(leagueInfo.season_start)
            .toISOString()
            .slice(0, 10),
          season_end: new Date(leagueInfo.season_end)
            .toISOString()
            .slice(0, 10),
          league_name: leagueInfo.league_name,
        });
        setSelectedDate(
          new Date(leagueInfo.season_start).toISOString().slice(0, 10)
        );
      } catch (err) {
        console.error("Error fetching league info:", err);
        setError("Error fetching league info");
      }
    };
    fetchLeagueInfo();
  }, []);

  // Fetch matchup data, rosters, and games for the selected date
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      if (!selectedDate) return;

      try {
        setLoading(true);
        console.log("Fetching matchup data, rosters, and games for", selectedDate);

        const res = await fetch("http://localhost:3001/matchup-season", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Network response not ok");
        const jsonData = await res.json();

        if (isCancelled) return; // Prevent state updates if unmounted

        setData(jsonData);

        if (jsonData.matchup) {
          const [
            rosterAData,
            rosterBData,
            gamesPlayedTeamAData,
            gamesPlayedTeamBData,
          ] = await Promise.all([
            fetchRoster(selectedDate, jsonData.matchup.team_a_id),
            fetchRoster(selectedDate, jsonData.matchup.team_b_id),
            fetchGamesPlayed(selectedDate, jsonData.matchup.team_a_id),
            fetchGamesPlayed(selectedDate, jsonData.matchup.team_b_id),
          ]);

          if (isCancelled) return;

          setRosterA(rosterAData);
          setRosterB(rosterBData);
          setGamesPlayedTeamA(gamesPlayedTeamAData);
          setGamesPlayedTeamB(gamesPlayedTeamBData);

          console.log("Fetched data for", selectedDate);
        }
      } catch (err) {
        console.error("Error fetching matchup data:", err);
        setError("Error fetching matchup data");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      console.log("Cancelling fetch for", selectedDate);
      isCancelled = true;
    };
  }, [selectedDate]);

  // Helper functions to fetch roster and games played data
  const fetchRoster = async (date, teamId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/roster?gameDate=${date}&teamId=${teamId}`,
        { credentials: "include" }
      );
      if (!response.ok)
        throw new Error(`Failed to fetch roster for team ${teamId} on ${date}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error);
      setError(`Error fetching roster for team ${teamId}`);
      return [];
    }
  };

  const fetchGamesPlayed = async (date, teamId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/games-played?gameDate=${date}&teamId=${teamId}`,
        { credentials: "include" }
      );
      if (!response.ok)
        throw new Error(`Failed to fetch games played for team ${teamId} on ${date}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching games played for team ${teamId}:`, error);
      setError("Error fetching games played");
      return [];
    }
  };

  // Update matchup score when the date changes.
  // If navigating backward, subtract daily scores; if forward, add daily scores only once.
  useEffect(() => {
    const updateAndFetchScore = async () => {
      if (!selectedDate || !data?.matchup) return;

      // Prevent duplicate updates for the same date
      if (lastUpdatedDateRef.current === selectedDate) {
        console.log("Already updated score for", selectedDate);
        return;
      }

      // Skip update on initial load
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      // Calculate daily scores for both teams
      const dailyScoreTeamA = totalScore(gamesPlayedTeamA);
      const dailyScoreTeamB = totalScore(gamesPlayedTeamB);

      // If both daily scores are zero, skip the update
      if (dailyScoreTeamA === 0 && dailyScoreTeamB === 0) {
        console.log("Daily scores are zero; skipping update for", selectedDate);
        return;
      }

      // Retrieve stored scores
      const storedTeamAScore = Number(data.matchup.team_a_score) || 0;
      const storedTeamBScore = Number(data.matchup.team_b_score) || 0;

      let overallTeamAScore;
      let overallTeamBScore;
      const prevDateStr = prevSelectedDateRef.current;

      if (prevDateStr && new Date(selectedDate) < new Date(prevDateStr)) {
        // Navigating backward: subtract daily scores
        overallTeamAScore = storedTeamAScore - dailyScoreTeamA;
        overallTeamBScore = storedTeamBScore - dailyScoreTeamB;
        // Reset the flag when navigating backward so future forward moves can add scores
        hasAddedDailyScoreRef.current = false;
      } else {
        // Navigating forward (or no previous date): add daily scores only once
        if (!hasAddedDailyScoreRef.current) {
          overallTeamAScore = storedTeamAScore + dailyScoreTeamA;
          overallTeamBScore = storedTeamBScore + dailyScoreTeamB;
          hasAddedDailyScoreRef.current = true;
        } else {
          overallTeamAScore = storedTeamAScore;
          overallTeamBScore = storedTeamBScore;
          console.log("Daily score already added.");
        }
      }

      console.log("Updating score for", selectedDate);
      lastUpdatedDateRef.current = selectedDate;

      try {
        const res = await fetch("http://localhost:3001/update-matchup-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            matchupId: data.matchup.matchup_id,
            overallTeamAScore,
            overallTeamBScore,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to update score");
        }

        // Optimistically update the local state with the new overall scores
        setData((prevData) => {
          if (!prevData?.matchup) return prevData;
          return {
            ...prevData,
            matchup: {
              ...prevData.matchup,
              team_a_score: overallTeamAScore,
              team_b_score: overallTeamBScore,
            },
          };
        });

        console.log("Updated score for", selectedDate);
      } catch (error) {
        console.error("Error updating matchup score:", error);
        setError("Error updating score");
        // Optionally clear the ref to allow retrying:
        lastUpdatedDateRef.current = "";
      }
    };

    updateAndFetchScore();
  }, [selectedDate, data, gamesPlayedTeamA, gamesPlayedTeamB]);

  // Categorize players for display
  const categorizePlayers = (roster) => {
    const starters = roster.filter((player) => player.category === "starter");
    const bench = roster.filter((player) => player.category === "bench");
    const reserve = roster.filter((player) => player.category === "reserve");
    return { starters, bench, reserve };
  };

  // Render table rows for each category
  const renderCategoryRows = (categoryLabel, teamAPlayers, teamBPlayers, gamesA, gamesB) => {
    const maxLength = Math.max(teamAPlayers.length, teamBPlayers.length);
    const rows = [];

    rows.push(
      <tr className="section-label" key={`${categoryLabel}-header`}>
        <td colSpan="8">{categoryLabel.toUpperCase()}</td>
        <td className="middle-col">|</td>
        <td colSpan="8">{categoryLabel.toUpperCase()}</td>
      </tr>
    );

    for (let i = 0; i < maxLength; i++) {
      const playerA = teamAPlayers[i];
      const playerB = teamBPlayers[i];
      const statsA = gamesA.find((game) => game.player_id === playerA?.player_id);
      const statsB = gamesB.find((game) => game.player_id === playerB?.player_id);

      rows.push(
        <tr key={`${categoryLabel}-row-${i}`}>
          {playerA ? (
            <>
              <td>{playerA.pos}</td>
              <td>{playerA.player_name}</td>
              <td>{statsA ? calculateFantasyPoints(statsA).toFixed(2) : "-"}</td>
              <td>{statsA ? statsA.pts : "-"}</td>
              <td>{statsA ? statsA.reb : "-"}</td>
              <td>{statsA ? statsA.ast : "-"}</td>
              <td>{statsA ? statsA.stl : "-"}</td>
              <td>{statsA ? statsA.blk : "-"}</td>
            </>
          ) : (
            <td colSpan="8"></td>
          )}
          <td className="middle-col">|</td>
          {playerB ? (
            <>
              <td>{playerB.pos}</td>
              <td>{playerB.player_name}</td>
              <td>{statsB ? calculateFantasyPoints(statsB).toFixed(2) : "-"}</td>
              <td>{statsB ? statsB.pts : "-"}</td>
              <td>{statsB ? statsB.reb : "-"}</td>
              <td>{statsB ? statsB.ast : "-"}</td>
              <td>{statsB ? statsB.stl : "-"}</td>
              <td>{statsB ? statsB.blk : "-"}</td>
            </>
          ) : (
            <td colSpan="8"></td>
          )}
        </tr>
      );
    }

    return rows;
  };

  // Date navigation handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const prevStr = current.toISOString().slice(0, 10);
    if (prevStr >= seasonRange.season_start) setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const nextStr = current.toISOString().slice(0, 10);
    if (nextStr <= seasonRange.season_end) setSelectedDate(nextStr);
  };

  if (loading) return <div>Loading matchup data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data || !data.matchup) return <div>No matchup data available.</div>;
  if (!selectedDate) return <div>No date selected.</div>;

  const { matchup } = data;
  const teamACategories = categorizePlayers(rosterA);
  const teamBCategories = categorizePlayers(rosterB);

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
      <div className="team-header">
        <div className="team-header-left">
          <div className="team-name">
            {matchup.teamA_name || matchup.teama_name} (Score:{" "}
            {Number(matchup.team_a_score).toFixed(2)} | Today's:{" "}
            {totalScore(gamesPlayedTeamA).toFixed(2)})
          </div>
        </div>
        <div className="team-header-right">
          <div className="team-name">
            {matchup.teamB_name || matchup.teamb_name} (Score:{" "}
            {Number(matchup.team_b_score).toFixed(2)} | Today's:{" "}
            {totalScore(gamesPlayedTeamB).toFixed(2)})
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="date-nav">
        <button
          onClick={handlePrevDay}
          disabled={selectedDate === seasonRange.season_start}
        >
          Prev Day
        </button>
        <span>{selectedDate}</span>
        <button
          onClick={handleNextDay}
          disabled={selectedDate === seasonRange.season_end}
        >
          Next Day
        </button>
      </div>

      {/* Matchup Table */}
      <div className="matchup-table-container">
        <table className="matchup-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Player</th>
              <th>CurrPts</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>ST</th>
              <th>BLK</th>
              <th className="middle-col">|</th>
              <th>Pos</th>
              <th>Player</th>
              <th>CurrPts</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>ST</th>
              <th>BLK</th>
            </tr>
          </thead>
          <tbody>
            {renderCategoryRows(
              "Starters",
              teamACategories.starters,
              teamBCategories.starters,
              gamesPlayedTeamA,
              gamesPlayedTeamB
            )}
            {renderCategoryRows(
              "Bench",
              teamACategories.bench,
              teamBCategories.bench,
              gamesPlayedTeamA,
              gamesPlayedTeamB
            )}
            {renderCategoryRows(
              "DNP",
              teamACategories.reserve,
              teamBCategories.reserve,
              gamesPlayedTeamA,
              gamesPlayedTeamB
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerDashboardMatchup;
