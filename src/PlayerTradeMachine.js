import React, { useEffect, useState } from "react";
import Header from "./Header";
import "./PlayerTradeMachine.css";

export default function TradeMachine() {
  const [tradeData, setTradeData] = useState({ myTeamId: null, teams: [], rosters: [] });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTeam2Id, setSelectedTeam2Id] = useState(null);
  const [selectedPlayersTeam1, setSelectedPlayersTeam1] = useState([]);
  const [selectedPlayersTeam2, setSelectedPlayersTeam2] = useState([]);
  const [tradeResult, setTradeResult] = useState("");

  // Salary thresholds (in millions)
  const softCap = 140000000;
  const firstApron = 178000000;

  // Helper: Sum salary from an array of player objects
  const sumSalary = (players) =>
    players.reduce((acc, p) => acc + Number(p.salary), 0);

  // Helper: Compute allowed incoming salary based on outgoing salary for teams in the Soft Cap to First Apron range.
  // (Outgoing salary brackets:
  //  $0–$6.53M: 175% of outgoing + $0.1M,
  //  $6.53M–$19.6M: outgoing + $5M,
  //  $19.6M+: 125% of outgoing + $0.1M)
  const computeAllowedIncoming = (outgoing) => {
    if (outgoing <= 6530000) return outgoing * 1.75 + 100000;
    if (outgoing <= 19600000) return outgoing + 5000000;
    return outgoing * 1.25 + 100000;
  };

  useEffect(() => {
    async function fetchTradeData() {
      try {
        const res = await fetch("http://localhost:3001/trade-setup", { credentials: "include" });
        if (!res.ok) throw new Error("Network response not ok");
        const data = await res.json();
        setTradeData(data);
        const otherTeams = data.teams.filter(team => team.team_id !== data.myTeamId);
        if (otherTeams.length > 0) setSelectedTeam2Id(otherTeams[0].team_id);
      } catch (error) {
        setErrorMsg("Error fetching trade setup data");
      } finally {
        setLoading(false);
      }
    }
    fetchTradeData();
  }, []);

  if (loading) return <div>Loading trade data...</div>;
  if (!tradeData.myTeamId) return <div>Team not found</div>;

  // Extract rosters for the two teams
  const myRoster = tradeData.rosters.filter(r => r.team_id === tradeData.myTeamId);
  const team2Roster = tradeData.rosters.filter(r => r.team_id === Number(selectedTeam2Id));

  // Handle player selection/deselection
  const handleAddPlayer = (player, isMyTeam) => {
    if (isMyTeam) {
      setSelectedPlayersTeam1(prev =>
        prev.some(p => p.player_id === player.player_id)
          ? prev.filter(p => p.player_id !== player.player_id)
          : [...prev, player]
      );
    } else {
      setSelectedPlayersTeam2(prev =>
        prev.some(p => p.player_id === player.player_id)
          ? prev.filter(p => p.player_id !== player.player_id)
          : [...prev, player]
      );
    }
  };

  // This function performs a detailed analysis of the trade based on the league rules.
  // It calculates for each team:
  // - The current total salary.
  // - The total salary of the players being traded out (outgoing) and acquired (incoming).
  // - The allowed incoming salary, which for teams in the Soft Cap–First Apron range is computed via computeAllowedIncoming,
  //   otherwise the trade must be exactly salary matched.
  // - The new total salary after the trade.
  // - The change in roster size.
  // Any violation (exceeding allowed incoming, surpassing the First Apron, or roster size limit) is flagged.
  const analyzeTrade = () => {
    // Define cap thresholds in dollars.
    const softCap = 140000000;    // $140M
    const firstApron = 178000000; // $178M
  
    // Calculate current total salaries for each team.
    const myCurrentSalary = sumSalary(myRoster);
    const team2CurrentSalary = sumSalary(team2Roster);
  
    // Calculate the total outgoing and incoming salaries (from selected players).
    const myOutgoing = sumSalary(selectedPlayersTeam1);
    const myIncoming = sumSalary(selectedPlayersTeam2);
    const team2Outgoing = sumSalary(selectedPlayersTeam2);
    const team2Incoming = sumSalary(selectedPlayersTeam1);
  
    // New total salaries after trade.
    const myNewSalary = myCurrentSalary - myOutgoing + myIncoming;
    const team2NewSalary = team2CurrentSalary - team2Outgoing + team2Incoming;
  
    // Allowed incoming is determined by your tiered rules.
    // For example, for an outgoing of $13M using the 125% rule:
    // allowedIncoming = 13M * 1.25 + 0.1M = 16.35M.
    // (The computeAllowedIncoming function should implement your tiers.)
    const myAllowedIncoming = computeAllowedIncoming(myOutgoing);
    const team2AllowedIncoming = computeAllowedIncoming(team2Outgoing);
  
    let myTradeValid = true;
    let team2TradeValid = true;
    let myError = "";
    let team2Error = "";
  
    // --- NEW SALARY LIMITS BASED ON TEAM'S CURRENT SALARY ---
  
    // For teams BELOW the Soft Cap, their post-trade salary must remain below $140M.
    if (myCurrentSalary < softCap) {
      if (myNewSalary >= softCap) {
        myTradeValid = false;
        myError = "Your new salary would reach or exceed the Soft Cap ($140M).";
      }
    } else {
      // For teams at or above the Soft Cap (but below First Apron), the new salary must stay below the First Apron ($178M).
      if (myNewSalary >= firstApron) {
        myTradeValid = false;
        myError = "Your new salary would reach or exceed the First Apron ($178M).";
      }
    }
    if (team2CurrentSalary < softCap) {
      if (team2NewSalary >= softCap) {
        team2TradeValid = false;
        team2Error = "Other team's new salary would reach or exceed the Soft Cap ($140M).";
      }
    } else {
      if (team2NewSalary >= firstApron) {
        team2TradeValid = false;
        team2Error = "Other team's new salary would reach or exceed the First Apron ($178M).";
      }
    }
  
    // --- ALLOWED INCOMING SALARY CHECK ---
    // Enforce that the incoming salary does not exceed the allowed tiered amount.
    if (myIncoming > myAllowedIncoming) {
      myTradeValid = false;
      myError = "Your incoming salary exceeds the allowed limit based on tiered rules.";
    }
    if (team2Incoming > team2AllowedIncoming) {
      team2TradeValid = false;
      team2Error = "Other team's incoming salary exceeds the allowed limit based on tiered rules.";
    }
  
    // --- ROSTER SIZE CHECK (max 15 players) ---
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
        error: myError
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
        error: team2Error
      }
    };
  };
  
  
  
  

  const analysis = analyzeTrade();

  // Validate the trade overall (using analysis) before executing.
  const validateTrade = () => {
    if (!analysis.myTeam.valid) return analysis.myTeam.error;
    if (!analysis.team2.valid) return analysis.team2.error;
    return null;
  };

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
      const res = await fetch("http://localhost:3001/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        setTradeResult("Trade executed successfully!");
        setSelectedPlayersTeam1([]);
        setSelectedPlayersTeam2([]);
      } else {
        setTradeResult(`Trade failed: ${result.error}`);
      }
    } catch (error) {
      setTradeResult("Trade failed due to network error.");
    }
  };

  const renderTeamPanel = (teamId, teamName, isTradeTeam = false) => {
    const roster = teamId === tradeData.myTeamId ? myRoster : team2Roster;
    const selectedPlayers = isTradeTeam ? selectedPlayersTeam2 : selectedPlayersTeam1;
    return (
      <div className="trade-panel">
        <div className="panel-header">
          <h3>{teamName}</h3>
          {isTradeTeam && (
            <select
              value={selectedTeam2Id || ""}
              onChange={e => {
                setSelectedTeam2Id(parseInt(e.target.value, 10));
                setSelectedPlayersTeam2([]);
              }}
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
        <div className="player-cards">
          <h4>Roster ({roster.length})</h4>
          {roster.length > 0 ? (
            roster.map(player => (
              <div
                key={player.player_id}
                className="player-card"
                onClick={() => handleAddPlayer(player, teamId === tradeData.myTeamId)}
                style={{
                  border: selectedPlayers.some(p => p.player_id === player.player_id)
                    ? "2px solid blue"
                    : "1px solid #ccc"
                }}
              >
                <p>
                  <strong>{player.player_name} ({player.pos})</strong>
                  <br />${player.salary}M
                </p>
              </div>
            ))
          ) : (
            <p>No players found.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="trade-machine-page">
      <Header />
      <h2>Propose New Trade</h2>
      <div className="propose-trade-container">
        <div className="trade-panels">
          {renderTeamPanel(tradeData.myTeamId, "Your Team")}
          {renderTeamPanel(selectedTeam2Id, "Team B", true)}
        </div>

        <div className="trade-summary">
          <h3>Trade Summary</h3>
          <div>
            <strong>Your Team Sending:</strong>
            <ul>
              {selectedPlayersTeam1.length > 0 ? (
                selectedPlayersTeam1.map(p => (
                  <li key={p.player_id}>
                    {p.player_name} (${p.salary}M)
                  </li>
                ))
              ) : (
                <li>None selected</li>
              )}
            </ul>
          </div>
          <div>
            <strong>Other Team Sending:</strong>
            <ul>
              {selectedPlayersTeam2.length > 0 ? (
                selectedPlayersTeam2.map(p => (
                  <li key={p.player_id}>
                    {p.player_name} (${p.salary}M)
                  </li>
                ))
              ) : (
                <li>None selected</li>
              )}
            </ul>
          </div>
          <button
            className="validate-btn"
            onClick={executeTrade}
            disabled={
              !selectedTeam2Id ||
              selectedPlayersTeam1.length === 0 ||
              selectedPlayersTeam2.length === 0
            }
          >
            Try Trade (Validate)
          </button>
          {tradeResult && <p className="trade-result-placeholder">{tradeResult}</p>}
        </div>

        {/* Dynamic Trade Analysis Panel */}
        <div className="trade-analysis">
          <h3>Trade Analysis</h3>
          <div className="analysis-panel">
            <h4>Your Team</h4>
            <p>Current Salary: ${analysis.myTeam.currentSalary.toFixed(2)}M</p>
            <p>Outgoing Salary: ${analysis.myTeam.outgoing.toFixed(2)}M</p>
            <p>Incoming Salary: ${analysis.myTeam.incoming.toFixed(2)}M</p>
            <p>Allowed Incoming: ${analysis.myTeam.allowedIncoming.toFixed(2)}M</p>
            <p>New Salary After Trade: ${analysis.myTeam.newSalary.toFixed(2)}M</p>
            <p>
              Roster: {analysis.myTeam.rosterSize} → {analysis.myTeam.newRosterSize}
            </p>
            {!analysis.myTeam.valid && (
              <p className="error">{analysis.myTeam.error}</p>
            )}
          </div>
          <div className="analysis-panel">
            <h4>Other Team</h4>
            <p>Current Salary: ${analysis.team2.currentSalary.toFixed(2)}M</p>
            <p>Outgoing Salary: ${analysis.team2.outgoing.toFixed(2)}M</p>
            <p>Incoming Salary: ${analysis.team2.incoming.toFixed(2)}M</p>
            <p>Allowed Incoming: ${analysis.team2.allowedIncoming.toFixed(2)}M</p>
            <p>New Salary After Trade: ${analysis.team2.newSalary.toFixed(2)}M</p>
            <p>
              Roster: {analysis.team2.rosterSize} → {analysis.team2.newRosterSize}
            </p>
            {!analysis.team2.valid && (
              <p className="error">{analysis.team2.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
