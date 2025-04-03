// PlayerDashboard.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PlayerDashboard.css"; 
import Header from "./Header";

function PlayerDashboard() {
  // State for the user's team 
  const [teamInfo, setTeamInfo] = useState(null);
  // State for matchup data 
  const [matchupData, setMatchupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the logged-in user's team info 
  useEffect(() => {
    fetch("http://localhost:3001/team-info", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching team info");
        }
        return response.json();
      })
      .then((data) => {
        setTeamInfo(data);
      })
      .catch((err) => {
        console.error("Error fetching team info:", err);
        setError("Error fetching team info");
      });
  }, []);

 
  // Fetch the matchup data 
  useEffect(() => {
    fetch("http://localhost:3001/matchup-season", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching matchup data");
        }
        return response.json();
      })
      .then((data) => {
        setMatchupData(data);
      })
      .catch((err) => {
        console.error("Error fetching matchup data:", err);
        setError("Error fetching matchup data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="bg-gray-900 text-gray-300 p-4 text-center">Loading dashboard...</div>;
  if (error) return <div className="bg-gray-900 text-red-500 p-4 text-center font-semibold">Error: {error}</div>;
  if (!teamInfo) return <div className="bg-gray-900 text-gray-300 p-4 text-center">No team info available.</div>;

  // Extract matchup info if available
  const matchup = matchupData?.matchup;
  const teamAScore = matchup ? Number(matchup.team_a_score).toFixed(2) : "N/A";
  const teamBScore = matchup ? Number(matchup.team_b_score).toFixed(2) : "N/A";

  // Get the user's team info from the endpoint response.
  const myTeam = teamInfo.myTeam;
  
  // Format the salary with commas
  const formattedSalary = parseInt(myTeam.team_salary).toLocaleString();

  return (
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />
      <h2 className="text-2xl font-bold text-center text-purple-400 mb-6">PLAYER DASHBOARD</h2>

      {/* Info & Score Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-6xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300 flex-1">
          <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
            </svg>
            Team Information
          </h3>
          <div className="text-gray-200 space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-3">
                <span className="text-white font-bold">T</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Team Name</p>
                <p className="font-semibold text-lg text-white">{myTeam.team_name}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-400">Record</p>
                <div className="flex items-center gap-2">
                  <span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded">{myTeam.wins} W</span>
                  <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded">{myTeam.losses} L</span>
                  
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-400">Salary Cap Usage</p>
                <p className="font-semibold text-white">${formattedSalary}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min((parseInt(myTeam.team_salary) / 300000000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/60 transition-all duration-300 flex-1">
          <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
            </svg>
            Current Matchup
          </h3>
          {matchup ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-purple-900/40 mx-auto mb-2 flex items-center justify-center border-2 border-purple-700">
                    <span className="text-2xl font-bold text-white">{matchup.teamA_name?.charAt(0) || "A"}</span>
                  </div>
                  <p className="font-bold text-gray-200 mb-1 text-sm truncate">{matchup.teamA_name || "Team A"}</p>
                  <p className="text-2xl font-bold text-white">{teamAScore}</p>
                </div>
                
                <div className="text-center px-2">
                  <div className="bg-gray-700 rounded-lg p-2 mb-2">
                    <span className="text-gray-400 font-medium text-sm">VS</span>
                  </div>
                  <p className="text-xs text-gray-500">matchup</p>
                </div>
                
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-teal-900/40 mx-auto mb-2 flex items-center justify-center border-2 border-teal-700">
                    <span className="text-2xl font-bold text-white">{matchup.teamB_name?.charAt(0) || "B"}</span>
                  </div>
                  <p className="font-bold text-gray-200 mb-1 text-sm truncate">{matchup.teamB_name || "Team B"}</p>
                  <p className="text-2xl font-bold text-white">{teamBScore}</p>
                </div>
              </div>
              
              
              <div className="h-4 bg-gray-700 rounded-lg overflow-hidden relative">
                {(() => {
                  const scoreA = parseFloat(teamAScore);
                  const scoreB = parseFloat(teamBScore);
                  const totalScore = scoreA + scoreB;
                  const teamAPercentage = totalScore > 0 ? (scoreA / totalScore) * 100 : 50;
                  
                  return (
                    <>
                      <div 
                        className="absolute top-0 left-0 h-full bg-purple-600 transition-all duration-500"
                        style={{ width: `${teamAPercentage}%` }}
                      ></div>
                      <div 
                        className="absolute top-0 right-0 h-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${100 - teamAPercentage}%` }}
                      ></div>
                    </>
                  );
                })()}
              </div>
              
              <div className="text-center text-xs text-gray-400">
                {parseFloat(teamAScore) > parseFloat(teamBScore) 
                  ? `${matchup.teamA_name || "Team A"} leads by ${(parseFloat(teamAScore) - parseFloat(teamBScore)).toFixed(2)} points`
                  : parseFloat(teamBScore) > parseFloat(teamAScore)
                  ? `${matchup.teamB_name || "Team B"} leads by ${(parseFloat(teamBScore) - parseFloat(teamAScore)).toFixed(2)} points`
                  : "Teams are tied"}
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/30 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
              </svg>
              <p className="text-gray-400">No matchup information available at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-wrap justify-center gap-5 max-w-6xl mx-auto">
        <Link to="/player-roster" className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg hover:shadow-purple-900/60 hover:bg-gray-700 transition-all duration-300 w-52 text-center group">
          <h3 className="text-lg font-bold mb-2 text-purple-400 group-hover:text-purple-300">Roster</h3>
          <p className="text-blue-400 font-medium mb-2 group-hover:text-blue-300">Go to Your Roster</p>
          <p className="text-gray-300 text-sm">View and manage your players.</p>
        </Link>
        
        <Link to="/free-agents" className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg hover:shadow-purple-900/60 hover:bg-gray-700 transition-all duration-300 w-52 text-center group">
          <h3 className="text-lg font-bold mb-2 text-purple-400 group-hover:text-purple-300">Free Agents</h3>
          <p className="text-blue-400 font-medium mb-2 group-hover:text-blue-300">Go to Free Agents</p>
          <p className="text-gray-300 text-sm">Discover and sign available players.</p>
        </Link>
        
        <Link to="/player-trade-machine" className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg hover:shadow-purple-900/60 hover:bg-gray-700 transition-all duration-300 w-52 text-center group">
          <h3 className="text-lg font-bold mb-2 text-purple-400 group-hover:text-purple-300">Trade Machine</h3>
          <p className="text-blue-400 font-medium mb-2 group-hover:text-blue-300">Go to Trade Machine</p>
          <p className="text-gray-300 text-sm">Propose and review trades.</p>
        </Link>
        
        <Link to="/player-matchup" className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg hover:shadow-purple-900/60 hover:bg-gray-700 transition-all duration-300 w-52 text-center group">
          <h3 className="text-lg font-bold mb-2 text-purple-400 group-hover:text-purple-300">Matchup</h3>
          <p className="text-blue-400 font-medium mb-2 group-hover:text-blue-300">Go to Current Matchup</p>
          <p className="text-gray-300 text-sm">View the results of your matchup.</p>
        </Link>
        
        <Link to="/player-league" className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg hover:shadow-purple-900/60 hover:bg-gray-700 transition-all duration-300 w-52 text-center group">
          <h3 className="text-lg font-bold mb-2 text-purple-400 group-hover:text-purple-300">League</h3>
          <p className="text-blue-400 font-medium mb-2 group-hover:text-blue-300">Go to Player League</p>
          <p className="text-gray-300 text-sm">View league standings, chat, etc.</p>
        </Link>
      </div>
      
    </div>
  );
}

export default PlayerDashboard;
