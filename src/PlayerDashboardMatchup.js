// Import React and other necessary libraries
import React, { useEffect, useRef, useState } from "react";
import "./PlayerDashboardMatchup.css";
//import header component
import Header from "./Header";

function PlayerDashboardMatchup() {
  // State to hold the fetched matchups and rosters
  const [data, setData] = useState(null);
  const [seasonRange, setSeasonRange] = useState({
    // State for league season details and league name
    season_start: "",
    season_end: "",
    league_name: "",
  });
  // State for selected date, loading status, error messages, and rosters
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rosterA, setRosterA] = useState([]);
  const [rosterB, setRosterB] = useState([]);
  const [gamesPlayedTeamA, setGamesPlayedTeamA] = useState([]);
  const [gamesPlayedTeamB, setGamesPlayedTeamB] = useState([]);

// Refs to track the last updated date, initial load, previous selected date, and if daily score has been added
  const lastUpdatedDateRef = useRef("");
  const initialLoadRef = useRef(true);
  const prevSelectedDateRef = useRef("");
  const hasAddedDailyScoreRef = useRef(false);

  const calculateFantasyPoints = (stats) => {
    const pts = Number(stats.pts) || 0;
    const reb = Number(stats.reb) || 0;
    const ast = Number(stats.ast) || 0;
    const stl = Number(stats.stl) || 0;
    const blk = Number(stats.blk) || 0;
    return pts + reb * 1.2 + ast * 1.5 + stl * 3 + blk * 3;
  };

  // Sum total score from an array of game stats
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
        // Set the season range using the fetched dates (formatted as YYYY-MM-DD)
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
          //selected date to the season start date
          new Date(leagueInfo.season_start).toISOString().slice(0, 10)
        );
      } catch (err) {
        console.error("Error fetching league info:", err);
        setError("Error fetching league info");
      }
    };
    fetchLeagueInfo();
  }, []);


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

        if (isCancelled) return; 

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

      if (!hasAddedDailyScoreRef.current) {
        overallTeamAScore = storedTeamAScore + dailyScoreTeamA;
        overallTeamBScore = storedTeamBScore + dailyScoreTeamB;
        hasAddedDailyScoreRef.current = true;
        
        // Check if overallTeamAScore is double the stored score.
        if (overallTeamAScore === storedTeamAScore * 2 || overallTeamAScore === overallTeamAScore * 2 ) {
          overallTeamAScore = overallTeamAScore - dailyScoreTeamA;
          overallTeamBScore = overallTeamBScore - dailyScoreTeamB;
          console.log("Detected double addition; subtracted dailyScoreTeamA");
        } 
      } else {
        overallTeamAScore = storedTeamAScore;
        overallTeamBScore = storedTeamBScore;
        console.log("Daily score already added.");
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

        // Update the local state with the new overall scores
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
      <tr key={`${categoryLabel}-header`} className="bg-purple-900/30 font-semibold text-center">
        <td colSpan="8" className="py-3 px-4 text-purple-300 rounded-l-lg">{categoryLabel.toUpperCase()}</td>
        <td className="bg-gray-800 text-gray-500 text-center font-bold">|</td>
        <td colSpan="8" className="py-3 px-4 text-purple-300 rounded-r-lg">{categoryLabel.toUpperCase()}</td>
      </tr>
    );

    for (let i = 0; i < maxLength; i++) {
      const playerA = teamAPlayers[i];
      const playerB = teamBPlayers[i];
      const statsA = gamesA.find((game) => game.player_id === playerA?.player_id);
      const statsB = gamesB.find((game) => game.player_id === playerB?.player_id);

      rows.push(
        <tr key={`${categoryLabel}-row-${i}`} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
          {playerA ? (
            <>
              <td className="py-2 px-3 text-gray-300">{playerA.pos}</td>
              <td className={`py-2 px-3 text-gray-200 font-medium ${statsA ? 'flex items-center' : ''}`}>
                {statsA && <span className="w-2 h-2 rounded-full bg-purple-500 mr-2 inline-block"></span>}
                {playerA.player_name}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? calculateFantasyPoints(statsA).toFixed(2) : "-"}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? statsA.pts : "-"}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? statsA.reb : "-"}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? statsA.ast : "-"}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? statsA.stl : "-"}
              </td>
              <td className={`py-2 px-3 ${statsA ? 'text-purple-300 font-medium' : 'text-gray-300'}`}>
                {statsA ? statsA.blk : "-"}
              </td>
            </>
          ) : (
            <td colSpan="8"></td>
          )}
          <td className="bg-gray-800 text-gray-500 text-center font-bold">|</td>
          {playerB ? (
            <>
              <td className="py-2 px-3 text-gray-300">{playerB.pos}</td>
              <td className={`py-2 px-3 text-gray-200 font-medium ${statsB ? 'flex items-center' : ''}`}>
                {statsB && <span className="w-2 h-2 rounded-full bg-teal-500 mr-2 inline-block"></span>}
                {playerB.player_name}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? calculateFantasyPoints(statsB).toFixed(2) : "-"}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? statsB.pts : "-"}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? statsB.reb : "-"}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? statsB.ast : "-"}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? statsB.stl : "-"}
              </td>
              <td className={`py-2 px-3 ${statsB ? 'text-teal-300 font-medium' : 'text-gray-300'}`}>
                {statsB ? statsB.blk : "-"}
              </td>
            </>
          ) : (
            <td colSpan="8"></td>
          )}
        </tr>
      );
    }

    return rows;
  };


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

  if (loading) return <div className="bg-gray-900 text-gray-300 p-4 text-center">Loading matchup data...</div>;
  if (error) return <div className="bg-gray-900 text-red-400 p-4 text-center">Error: {error}</div>;
  if (!data || !data.matchup) return <div className="bg-gray-900 text-gray-300 p-4 text-center">No matchup data available.</div>;
  if (!selectedDate) return <div className="bg-gray-900 text-gray-300 p-4 text-center">No date selected.</div>;

  const { matchup } = data;
  const teamACategories = categorizePlayers(rosterA);
  const teamBCategories = categorizePlayers(rosterB);

  return (
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />
      
      <div className="max-w-6xl mx-auto">
        {/* League */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-gray-300">
          <p>
            <span className="font-semibold text-purple-300">Season:</span> {seasonRange.season_start} to {seasonRange.season_end}
            <br />
            <span className="font-semibold text-purple-300">League:</span> {seasonRange.league_name}
          </p>
        </div>

        {/* Team Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg w-full md:w-auto">
            <div className="text-lg font-semibold text-purple-400">
              {matchup.teamA_name || matchup.teama_name}
              <span className="text-gray-300 text-base ml-2">
                (Score: <span className="text-white font-medium">{Number(matchup.team_a_score).toFixed(2)}</span> | 
                Today's: <span className="text-white font-medium">{totalScore(gamesPlayedTeamA).toFixed(2)}</span>)
              </span>
            </div>
          </div>
          
          <div className="text-xl font-bold text-gray-500">VS</div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg w-full md:w-auto">
            <div className="text-lg font-semibold text-purple-400">
              {matchup.teamB_name || matchup.teamb_name}
              <span className="text-gray-300 text-base ml-2">
                (Score: <span className="text-white font-medium">{Number(matchup.team_b_score).toFixed(2)}</span> | 
                Today's: <span className="text-white font-medium">{totalScore(gamesPlayedTeamB).toFixed(2)}</span>)
              </span>
            </div>
          </div>
        </div>

        {/* Score Visualization Bar */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg h-8 mb-6 overflow-hidden shadow-lg relative">

          {(() => {
            const teamAScore = Number(matchup.team_a_score) || 0;
            const teamBScore = Number(matchup.team_b_score) || 0;
            const totalScore = teamAScore + teamBScore;
            const teamAPercentage = totalScore > 0 ? (teamAScore / totalScore) * 100 : 50;
            
            return (
              <>
                <div 
                  className="absolute top-0 left-0 h-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${teamAPercentage}%` }}
                >
                  {teamAPercentage > 15 && (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-bold">
                      {teamAScore.toFixed(2)}
                    </span>
                  )}
                </div>
                <div 
                  className="absolute top-0 right-0 h-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${100 - teamAPercentage}%` }}
                >
                  {(100 - teamAPercentage) > 15 && (
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-bold">
                      {teamBScore.toFixed(2)}
                    </span>
                  )}
                </div>
              </>
            );
          })()}
          <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center z-10">
            <div className="h-full w-px bg-gray-900"></div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            onClick={handlePrevDay}
            disabled={selectedDate === seasonRange.season_start}
            className="px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Prev Day
          </button>
          <span className="text-gray-200 font-semibold px-3 py-2 bg-gray-800/50 rounded-md border border-gray-700">
            {selectedDate}
          </span>
          <button
            onClick={handleNextDay}
            disabled={selectedDate === seasonRange.season_end}
            className="px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next Day
          </button>
        </div>

        {/* Matchup Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800/90 border-b border-gray-700">
                <th className="p-3 text-left text-gray-300 font-semibold">Pos</th>
                <th className="p-3 text-left text-gray-300 font-semibold">Player</th>
                <th className="p-3 text-left text-gray-300 font-semibold">CurrPts</th>
                <th className="p-3 text-left text-gray-300 font-semibold">PTS</th>
                <th className="p-3 text-left text-gray-300 font-semibold">REB</th>
                <th className="p-3 text-left text-gray-300 font-semibold">AST</th>
                <th className="p-3 text-left text-gray-300 font-semibold">ST</th>
                <th className="p-3 text-left text-gray-300 font-semibold">BLK</th>
                <th className="bg-gray-800 text-gray-500 text-center font-bold">|</th>
                <th className="p-3 text-left text-gray-300 font-semibold">Pos</th>
                <th className="p-3 text-left text-gray-300 font-semibold">Player</th>
                <th className="p-3 text-left text-gray-300 font-semibold">CurrPts</th>
                <th className="p-3 text-left text-gray-300 font-semibold">PTS</th>
                <th className="p-3 text-left text-gray-300 font-semibold">REB</th>
                <th className="p-3 text-left text-gray-300 font-semibold">AST</th>
                <th className="p-3 text-left text-gray-300 font-semibold">ST</th>
                <th className="p-3 text-left text-gray-300 font-semibold">BLK</th>
              </tr>
            </thead>
            <tbody>
              {/* Render rows for each player category */}
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
      
    </div>
  );
}

export default PlayerDashboardMatchup;
