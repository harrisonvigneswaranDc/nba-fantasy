import React, { useEffect, useState } from "react";
import Header from "./Header";
import { format } from "date-fns"; // optional: using date-fns for formatting
import "./PlayerLeague.css";

function PlayerLeague() {
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/league-info", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching league info");
        }
        return response.json();
      })
      .then((data) => setLeagueInfo(data))
      .catch((err) => {
        console.error("Error:", err);
        setError(err.message);
      });
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!leagueInfo) return <div>Loading league info...</div>;

  // Create Date objects from the ISO strings.
  // Adding one day to season_start
  const seasonStartDate = new Date(leagueInfo.season_start);
  seasonStartDate.setDate(seasonStartDate.getDate());
  const seasonEndDate = new Date(leagueInfo.season_end);
  seasonEndDate.setDate(seasonEndDate.getDate());

  // Format dates using date-fns (or you can use toISOString() if you prefer)
  const formattedStart = format(seasonStartDate, "yyyy-MM-dd");
  const formattedEnd = format(seasonEndDate, "yyyy-MM-dd");

  return (
    <div className="league-page">
      <Header />
      <div className="league-info-box">
        <p>
          <strong>League Name:</strong> {leagueInfo.league_name}
        </p>
        <p>
          <strong>Draft Time:</strong>{" "}
          {new Date(leagueInfo.draft_time).toLocaleString()}
        </p>
        <p>
          <strong>Season:</strong> {formattedStart} to {formattedEnd}
        </p>
      </div>
      <div className="league-standings">
        <h2>League Standings</h2>
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team Name</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Ties</th>
            </tr>
          </thead>
          <tbody>
            {leagueInfo.teams.map((team, index) => (
              <tr key={team.team_id}>
                <td>{index + 1}</td>
                <td>{team.team_name}</td>
                <td>{team.wins}</td>
                <td>{team.losses}</td>
                <td>{team.ties}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerLeague;
