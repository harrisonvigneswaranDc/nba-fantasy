import React, { useEffect, useState } from "react";
import Header from "./Header";
import { format } from "date-fns"; 

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

  if (error) return <div className="bg-gray-900 text-red-500 p-4 text-center font-semibold">Error: {error}</div>;
  if (!leagueInfo) return <div className="bg-gray-900 text-gray-300 p-4 text-center">Loading league info...</div>;


  const seasonStartDate = new Date(leagueInfo.season_start);
  seasonStartDate.setDate(seasonStartDate.getDate());
  const seasonEndDate = new Date(leagueInfo.season_end);
  seasonEndDate.setDate(seasonEndDate.getDate());


  const formattedStart = format(seasonStartDate, "yyyy-MM-dd");
  const formattedEnd = format(seasonEndDate, "yyyy-MM-dd");

  return (
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />
      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-purple-400">League Information</h2>
          <div className="text-gray-200 space-y-2">
            <p>
              <span className="font-semibold text-purple-300">League Name:</span> {leagueInfo.league_name}
            </p>
            <p>
              <span className="font-semibold text-purple-300">Draft Time:</span>{" "}
              {new Date(leagueInfo.draft_time).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold text-purple-300">Season:</span> {formattedStart} to {formattedEnd}
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-purple-400">League Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-purple-300 border-b border-gray-600">Rank</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-purple-300 border-b border-gray-600">Team Name</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-purple-300 border-b border-gray-600">Wins</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-purple-300 border-b border-gray-600">Losses</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-purple-300 border-b border-gray-600">Ties</th>
                </tr>
              </thead>
              <tbody>
                {leagueInfo.teams.map((team, index) => (
                  <tr key={team.team_id} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700/50"}>
                    <td className="py-3 px-4 text-sm text-gray-200 border-b border-gray-600">{index + 1}</td>
                    <td className="py-3 px-4 text-sm text-gray-200 border-b border-gray-600">{team.team_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-200 border-b border-gray-600">{team.wins}</td>
                    <td className="py-3 px-4 text-sm text-gray-200 border-b border-gray-600">{team.losses}</td>
                    <td className="py-3 px-4 text-sm text-gray-200 border-b border-gray-600">{team.ties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
     
    </div>
  );
}

export default PlayerLeague;
