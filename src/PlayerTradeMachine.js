import React, { useState, useEffect } from "react";
// Import Header component to display at the top of the page.
import Header from "./Header";

// allows users to propose and analyze a trade between teams
export default function TradeMachine() {
  // State to hold trade data including team IDs, rosters, and player details
  const [tradeData, setTradeData] = useState({ myTeamId: null, teams: [], rosters: [] });
  const [loading, setLoading] = useState(true);
  // The ID of the other team selected for trade.
  const [selectedTeam2Id, setSelectedTeam2Id] = useState(null);
  // Array of players selected from your team to trade
  const [selectedPlayersTeam1, setSelectedPlayersTeam1] = useState([]);
  // Array of players selected from the other team to acquire
  const [selectedPlayersTeam2, setSelectedPlayersTeam2] = useState([]);
  // Trade result message to display trade 
  const [tradeResult, setTradeResult] = useState("");

  // function to sum the salary values from an array of players
  const sumSalary = (players) => players.reduce((acc, p) => acc + Number(p.salary), 0);
  // calculates the allowed incoming salary based on the outgoing salary 
  const computeAllowedIncoming = (outgoing) => {
    if (outgoing <= 6530000) return outgoing * 1.75 + 100000;
    if (outgoing <= 19600000) return outgoing + 5000000;
    return outgoing * 1.25 + 100000;
  };

  
  useEffect(() => {
    async function fetchTradeData() {
      try {
        // endpoint to get your team, all teams, and rosters
        const res = await fetch("http://localhost:3001/trade-setup", { credentials: "include" });
        const data = await res.json();
        
        setTradeData(data);
        
        const otherTeams = data.teams.filter(team => team.team_id !== data.myTeamId);
        if (otherTeams.length > 0) setSelectedTeam2Id(otherTeams[0].team_id);
      } catch (error) {
        console.error("Error fetching trade setup data");
      } finally {
        
        setLoading(false);
      }
    }
    fetchTradeData();
  }, []);

  // Filter your roster
  const myRoster = tradeData.rosters.filter(r => r.team_id === tradeData.myTeamId);
  // Filter the other team's roster based on selectedTeam2Id
  const team2Roster = tradeData.rosters.filter(r => r.team_id === Number(selectedTeam2Id));

  // Toggles a player selection for trade
  const handleAddPlayer = (player, isMyTeam) => {
    if (isMyTeam) {
      // Toggle player selection for your team
      setSelectedPlayersTeam1(prev =>
        prev.some(p => p.player_id === player.player_id)
          ? prev.filter(p => p.player_id !== player.player_id)
          : [...prev, player]
      );
    } else {
      // Toggle player selection for the other team
      setSelectedPlayersTeam2(prev =>
        prev.some(p => p.player_id === player.player_id)
          ? prev.filter(p => p.player_id !== player.player_id)
          : [...prev, player]
      );
    }
  };

  // Analyzes the trade by computing salary, roster and  validates the trade conditions
  const analyzeTrade = () => {
    const softCap = 140000000;
    const firstApron = 178000000;

    // Current total salary for both teams.
    const myCurrentSalary = sumSalary(myRoster);
    const team2CurrentSalary = sumSalary(team2Roster);

    // Total salary of players selected to be traded away
    const myOutgoing = sumSalary(selectedPlayersTeam1);
    const myIncoming = sumSalary(selectedPlayersTeam2);
    const team2Outgoing = sumSalary(selectedPlayersTeam2);
    const team2Incoming = sumSalary(selectedPlayersTeam1);

    // New team salaries after the trade.
    const myNewSalary = myCurrentSalary - myOutgoing + myIncoming;
    const team2NewSalary = team2CurrentSalary - team2Outgoing + team2Incoming;

    // Allowed incoming salary based on the tiered trade rules.
    const myAllowedIncoming = computeAllowedIncoming(myOutgoing);
    const team2AllowedIncoming = computeAllowedIncoming(team2Outgoing);

    let myTradeValid = true;
    let team2TradeValid = true;
    let myError = "";
    let team2Error = "";

    // Validate your team's trade conditions
    if (myCurrentSalary >= firstApron) {
      if (myIncoming !== myOutgoing) {
        myTradeValid = false;
        myError = "As a second apron team, you must take back exactly the same salary you send out.";
      }
    } else if (myIncoming > myAllowedIncoming) {
      myTradeValid = false;
      myError = "Your incoming salary exceeds the allowed limit based on tiered rules.";
    }

    // Validate the other team's trade conditions
    if (team2CurrentSalary >= firstApron) {
      if (team2Incoming !== team2Outgoing) {
        team2TradeValid = false;
        team2Error = "As a second apron team, the other team must take back exactly the same salary they send out.";
      }
    } else if (team2Incoming > team2AllowedIncoming) {
      team2TradeValid = false;
      team2Error = "Other team's incoming salary exceeds the allowed limit based on tiered rules.";
    }

    // Check roster size limits after trade.
    const myNewRosterSize = myRoster.length - selectedPlayersTeam1.length + selectedPlayersTeam2.length;
    const team2NewRosterSize = team2Roster.length - selectedPlayersTeam2.length + selectedPlayersTeam1.length;

    if (myNewRosterSize > 15) {
      myTradeValid = false;
      myError = "Your team would exceed 15 players.";
    }
    if (team2NewRosterSize > 15) {
      team2TradeValid = false;
      team2Error = "Other team would exceed 15 players.";
    }

    // Return with all the calculations of each team
    return {
      myTeam: {
        currentSalary: myCurrentSalary,
        outgoing: myOutgoing,
        incoming: myIncoming,
        allowedIncoming: myAllowedIncoming,
        newSalary: myNewSalary,
        rosterSize: myRoster.length,
        newRosterSize: myNewRosterSize,
        valid: myTradeValid,
        error: myError,
      },
      team2: {
        currentSalary: team2CurrentSalary,
        outgoing: team2Outgoing,
        incoming: team2Incoming,
        allowedIncoming: team2AllowedIncoming,
        newSalary: team2NewSalary,
        rosterSize: team2Roster.length,
        newRosterSize: team2NewRosterSize,
        valid: team2TradeValid,
        error: team2Error,
      },
    };
  };

  // Run the trade analysis.
  const analysis = analyzeTrade();

  // returns an error message if validation fails.
  const validateTrade = () => {
    if (!analysis.myTeam.valid) return analysis.myTeam.error;
    if (!analysis.team2.valid) return analysis.team2.error;
    return null;
  };

  // Executes the trade after validation.
  const executeTrade = async () => {
    const validationError = validateTrade();
    if (validationError) {
      setTradeResult(validationError);
      return;
    }

    
    const payload = {
      team1Id: tradeData.myTeamId,
      team2Id: Number(selectedTeam2Id),
      team1Players: selectedPlayersTeam1.map(p => p.player_id),
      team2Players: selectedPlayersTeam2.map(p => p.player_id)
    };

    try {
      // Send the trade proposal to the server for execution.
      const res = await fetch("http://localhost:3001/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        setTradeResult("Trade executed successfully!");
        // Clear selected players after successful trade
        setSelectedPlayersTeam1([]);
        setSelectedPlayersTeam2([]);
      } else {
        setTradeResult(`Trade failed: ${result.error}`);
      }
    } catch (error) {
      setTradeResult("Trade failed due to network error.");
    }
  };

  // Renders a panel for a team showing its roster and allowing player selection
  const renderTeamPanel = (teamId, teamName, isTradeTeam = false) => {
    // Determine roster based on teamId
    const roster = teamId === tradeData.myTeamId ? myRoster : team2Roster;
    // Choose the appropriate selected players array
    const selectedPlayers = isTradeTeam ? selectedPlayersTeam2 : selectedPlayersTeam1;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg flex-1 min-w-[300px]">
        
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg text-purple-400">{teamName}</h3>
          {isTradeTeam && (
            <select
              value={selectedTeam2Id || ""}
              onChange={e => {
                // Update the selected team for trade and clear its selected players.
                setSelectedTeam2Id(parseInt(e.target.value, 10));
                setSelectedPlayersTeam2([]);
              }}
              className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="" disabled>
                Select Team to Trade With
              </option>
              {tradeData.teams
                .filter(team => team.team_id !== tradeData.myTeamId)
                .map(team => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.team_name}
                  </option>
                ))}
            </select>
          )}
        </div>
        {/* Roster display */}
        <div className="mt-4">
          <h4 className="text-gray-300 font-semibold mb-2">Roster ({roster.length})</h4>
          {roster.length > 0 ? (
            <div className="space-y-2">
              {roster.map(player => (
                
                <div
                  key={player.player_id}
                  onClick={() => handleAddPlayer(player, teamId === tradeData.myTeamId)}
                  className={`bg-gray-700/60 border p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all duration-200 hover:bg-gray-700
                    ${selectedPlayers.some(p => p.player_id === player.player_id) 
                      ? 'border-purple-500 shadow-md shadow-purple-900/20' 
                      : 'border-gray-600'}`}
                >
                  <p className="text-gray-200 text-sm">
                    <span className="font-semibold">{player.player_name} ({player.pos})</span>
                    <br />${Number(player.salary).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic">No players found.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    // Main container with dark background and padding.
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-purple-400 mb-6">Propose New Trade</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Your Team Panel */}
            {renderTeamPanel(tradeData.myTeamId, "Your Team")}
            
            {renderTeamPanel(selectedTeam2Id, "Team B", true)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trade Summary Panel */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-purple-400">Trade Summary</h3>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-300 mb-2">Your Team Sending:</h4>
                <ul className="list-disc pl-6 space-y-1 text-gray-300">
                  {selectedPlayersTeam1.length > 0 ? (
                    selectedPlayersTeam1.map(p => (
                      <li key={p.player_id}>
                        {p.player_name} (${Number(p.salary).toLocaleString()})
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 italic">None selected</li>
                  )}
                </ul>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-gray-300 mb-2">Other Team Sending:</h4>
                <ul className="list-disc pl-6 space-y-1 text-gray-300">
                  {selectedPlayersTeam2.length > 0 ? (
                    selectedPlayersTeam2.map(p => (
                      <li key={p.player_id}>
                        {p.player_name} (${Number(p.salary).toLocaleString()})
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 italic">None selected</li>
                  )}
                </ul>
              </div>
              {/*  execute trade  */}
              <button
                className={`mt-4 py-2.5 px-6 rounded-lg font-semibold text-white transition-colors 
                  ${!selectedTeam2Id || selectedPlayersTeam1.length === 0 || selectedPlayersTeam2.length === 0
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-purple-900/50'}`}
                onClick={executeTrade}
                disabled={
                  !selectedTeam2Id ||
                  selectedPlayersTeam1.length === 0 ||
                  selectedPlayersTeam2.length === 0
                }
              >
                Try Trade (Validate)
              </button>
              {/* Display trade result */}
              {tradeResult && (
                <p className={`mt-4 p-3 rounded-lg ${tradeResult.includes('success') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                  {tradeResult}
                </p>
              )}
            </div>

            {/* Trade Analysis Panel */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-purple-400">Trade Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Analysis for your team */}
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-purple-300 mb-2">Your Team</h4>
                  <div className="space-y-1 text-gray-300 text-sm">
                    <p>Current Salary: ${analysis.myTeam.currentSalary.toLocaleString()}</p>
                    <p>Outgoing Salary: ${analysis.myTeam.outgoing.toLocaleString()}</p>
                    <p>Incoming Salary: ${analysis.myTeam.incoming.toLocaleString()}</p>
                    <p>Allowed Incoming: ${analysis.myTeam.allowedIncoming.toLocaleString()}</p>
                    <p>New Salary After Trade: ${analysis.myTeam.newSalary.toLocaleString()}</p>
                    <p>
                      Roster: {analysis.myTeam.rosterSize} → {analysis.myTeam.newRosterSize}
                    </p>
                  </div>
                  {!analysis.myTeam.valid && (
                    <p className="mt-2 text-red-400 bg-red-900/20 p-2 rounded">
                      {analysis.myTeam.error}
                    </p>
                  )}
                </div>
                {/* Analysis for the other team */}
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-purple-300 mb-2">Other Team</h4>
                  <div className="space-y-1 text-gray-300 text-sm">
                    <p>Current Salary: ${analysis.team2.currentSalary.toLocaleString()}</p>
                    <p>Outgoing Salary: ${analysis.team2.outgoing.toLocaleString()}</p>
                    <p>Incoming Salary: ${analysis.team2.incoming.toLocaleString()}</p>
                    <p>Allowed Incoming: ${analysis.team2.allowedIncoming.toLocaleString()}</p>
                    <p>New Salary After Trade: ${analysis.team2.newSalary.toLocaleString()}</p>
                    <p>
                      Roster: {analysis.team2.rosterSize} → {analysis.team2.newRosterSize}
                    </p>
                  </div>
                  {!analysis.team2.valid && (
                    <p className="mt-2 text-red-400 bg-red-900/20 p-2 rounded">
                      {analysis.team2.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
