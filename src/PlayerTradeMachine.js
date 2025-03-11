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

  const myRoster = tradeData.rosters.filter(r => r.team_id === tradeData.myTeamId);
  const team2Roster = tradeData.rosters.filter(r => r.team_id === Number(selectedTeam2Id));

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

  const executeTrade = async () => {
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
              <option value="" disabled>Select Team to Trade With</option>
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
                selectedPlayersTeam1.map(p => <li key={p.player_id}>{p.player_name} (${p.salary}M)</li>)
              ) : (
                <li>None selected</li>
              )}
            </ul>
          </div>
          <div>
            <strong>Other Team Sending:</strong>
            <ul>
              {selectedPlayersTeam2.length > 0 ? (
                selectedPlayersTeam2.map(p => <li key={p.player_id}>{p.player_name} (${p.salary}M)</li>)
              ) : (
                <li>None selected</li>
              )}
            </ul>
          </div>
          <button
            className="validate-btn"
            onClick={executeTrade}
            disabled={!selectedTeam2Id || selectedPlayersTeam1.length === 0 || selectedPlayersTeam2.length === 0}
          >
            Try Trade (Validate)
          </button>
          {tradeResult && <p className="trade-result-placeholder">{tradeResult}</p>}
        </div>
      </div>
    </div>
  );
}
