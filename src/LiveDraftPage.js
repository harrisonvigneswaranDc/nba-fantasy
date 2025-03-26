import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./LiveDraftPage.css";

// Hard-coded league ID (could be passed in via props or context)
const leagueId = 1;

// Salary Cap Rules (in full dollars)
const SALARY_CAP_RULES = {
  salaryFloor: 126000000,
  softCap: 140000000,
  firstApron: 178000000,
  hardCap: 189000000,
  totalBudget: 300000000,
};

// Helper to determine current cap stage
const getCapStage = (payroll) => {
  if (payroll <= SALARY_CAP_RULES.softCap) return "Below Soft Cap";
  if (payroll <= SALARY_CAP_RULES.firstApron) return "Soft Cap";
  if (payroll <= SALARY_CAP_RULES.hardCap) return "First Apron";
  return "Second Apron (Hard Cap)";
};

// Optional helper to shuffle an array (if needed)
const shuffleArray = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const LiveDraftComponent = () => {
  const TOTAL_ROUNDS = 15;
  const navigate = useNavigate();

  // ---------------------------
  // State Hooks
  const [currentRound, setCurrentRound] = useState(1);
  const [draftingTeam, setDraftingTeam] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  // Participants: array of team IDs (from DB)
  const [participants, setParticipants] = useState([]);
  const [currentPickerIndex, setCurrentPickerIndex] = useState(0);

  // Local rosters and salary caps (object keyed by teamId)
  const [rosters, setRosters] = useState({});
  const [teamSalaryCaps, setTeamSalaryCaps] = useState({});

  // Players available to be drafted
  const [allPlayers, setAllPlayers] = useState([]);
  const [players, setPlayers] = useState([]);

  // UI filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriteria, setSortCriteria] = useState("salary");

  // Pick history for display
  const [pickHistory, setPickHistory] = useState([]);

  // Final pick phase state (if any team misses its turn)
  const [finalPickPhase, setFinalPickPhase] = useState(false);
  const [finalPickQueue, setFinalPickQueue] = useState([]);

  // Fetched teams from the league (expected 2 teams)
  const [teams, setTeams] = useState([]);

  // Roster view: cycle through teams
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  // ---------------------------
  // Fetch teams for this league
  useEffect(() => {
    fetch(`http://localhost:3001/teams-for-league?leagueId=${leagueId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTeams(data); // Expected format: [{ team_id, team_name, user_id, team_salary? }, ...]
        const teamIds = data.map((team) => team.team_id);
        setParticipants(teamIds);

        if (teamIds.length > 0) {
          setDraftingTeam(teamIds[0]);
        }

        // Initialize rosters and salary caps for each team
        const initialRosters = {};
        const initialCaps = {};
        teamIds.forEach((id) => {
          initialRosters[id] = [];
          // We'll start used=0 locally; the server will override as picks are made
          initialCaps[id] = {
            used: 0,
            totalBudget: SALARY_CAP_RULES.totalBudget,
          };
        });
        setRosters(initialRosters);
        setTeamSalaryCaps(initialCaps);
      })
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  // ---------------------------
  // Fetch players for this league (from DB)
  useEffect(() => {
    fetch(`http://localhost:3001/league-players?leagueId=${leagueId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        // Data fields: player, pos, rb, ast, stl, blk, tov, pf, pts, player_id, salary, player_picked
        setAllPlayers(data);
      })
      .catch((error) => console.error("Error loading players:", error));
  }, []);

  // When draft not started, show all available players
  useEffect(() => {
    if (!isDraftStarted && allPlayers.length > 0) {
      setPlayers(allPlayers);
    }
  }, [allPlayers, isDraftStarted]);

  // ---------------------------
  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const name = p.player?.toLowerCase() || "";
      const pos = p.pos?.toLowerCase() || "";
      return (
        name.includes(searchQuery.toLowerCase()) ||
        pos.includes(searchQuery.toLowerCase())
      );
    });
  }, [players, searchQuery]);

  // ---------------------------
  // Sorting players by selected criteria
  const sortedPlayers = useMemo(() => {
    let sorted = [...filteredPlayers];
    if (sortCriteria === "position") {
      sorted.sort((a, b) => (a.pos || "").localeCompare(b.pos || ""));
    } else if (sortCriteria === "salary") {
      sorted.sort((a, b) => b.salary - a.salary);
    } else if (sortCriteria === "ppg") {
      sorted.sort((a, b) => b.pts - a.pts);
    } else if (sortCriteria === "apg") {
      sorted.sort((a, b) => b.ast - a.ast);
    } else if (sortCriteria === "rbg") {
      sorted.sort((a, b) => b.rb - a.rb);
    }
    return sorted;
  }, [filteredPlayers, sortCriteria]);

  // ---------------------------
  // Determine if drafting team is above the second apron
  // and optionally restrict available players
  const currentDraftingTeamUsed =
    teamSalaryCaps[draftingTeam]?.used ?? 0; // fallback to 0
  const currentDraftingTeamStage = getCapStage(currentDraftingTeamUsed);

  const availablePlayers = useMemo(() => {
    if (currentDraftingTeamStage === "Second Apron (Hard Cap)") {
      return sortedPlayers.filter((p) => p.salary <= 5000000);
    }
    return sortedPlayers;
  }, [sortedPlayers, currentDraftingTeamStage]);

  // ---------------------------
  // Timer logic for draft countdown
  useEffect(() => {
    if (!isDraftStarted) return;
    if (timeLeft <= 0) {
      skipTurn();
      return;
    }
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isDraftStarted]);

  // Skip turn if time runs out
  const skipTurn = () => {
    const currentParticipant = participants[currentPickerIndex];
    setPickHistory((prev) => [
      ...prev,
      { round: currentRound, participant: currentParticipant, player: "Missed Turn" },
    ]);
    nextPicker();
  };

  // Move to next team or next round
  const nextPicker = () => {
    if (currentPickerIndex + 1 < participants.length) {
      setCurrentPickerIndex((prev) => prev + 1);
      setDraftingTeam(participants[currentPickerIndex + 1]);
      setTimeLeft(10);
    } else {
      // We finished this round
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound((prev) => prev + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(participants[0]);
        setTimeLeft(10);
      } else {
        // All rounds complete
        endDraft();
      }
    }
  };

  // Local helper: decide category for new pick
  const determineCategory = (teamId) => {
    const count = rosters[teamId]?.length || 0;
    if (count < 5) return "starter";
    if (count < 9) return "bench";
    if (count < 15) return "reserve";
    return "none";
  };

  // ---------------------------
  // Main pick function
  const handlePick = async (playerName) => {
    if (!isDraftStarted) return;
    const currentParticipant = participants[currentPickerIndex];

    // Find the chosen player
    const playerIndex = players.findIndex((p) => p.player === playerName);
    if (playerIndex === -1) return;
    const chosenPlayer = players[playerIndex];

    // Quick local check if the budget would be exceeded
    const currentUsed = parseFloat(teamSalaryCaps[currentParticipant]?.used ?? 0);
    const playerSalary = parseFloat(chosenPlayer.salary || 0);
    const tempNewUsed = currentUsed + playerSalary;

    // Compare to totalBudget
    const totalBudget = parseFloat(teamSalaryCaps[currentParticipant]?.totalBudget ?? SALARY_CAP_RULES.totalBudget);
    if (tempNewUsed > totalBudget) {
      alert(
        `Cannot pick ${chosenPlayer.player}: That would bring payroll to $${tempNewUsed.toLocaleString()}, exceeding your budget of $${totalBudget.toLocaleString()}.`
      );
      return;
    }

    // Make the pick on the server
    try {
      const res = await fetch("http://localhost:3001/make-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leagueId,
          teamId: currentParticipant,
          playerId: chosenPlayer.player_id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Pick failed");
        return;
      }

      // data.newTeamSalary is returned from the backend (if you added RETURNING in your query)
      const updatedTotal = parseFloat(data.newTeamSalary ?? tempNewUsed);

      // Update local state with the pick
      setPickHistory((prev) => [
        ...prev,
        { round: currentRound, participant: currentParticipant, player: chosenPlayer.player },
      ]);
      setRosters((prev) => {
        const updated = { ...prev };
        updated[currentParticipant] = [
          ...(updated[currentParticipant] || []),
          { ...chosenPlayer, category: determineCategory(currentParticipant) },
        ];
        return updated;
      });

      // Use the server's official updated salary
      setTeamSalaryCaps((prev) => ({
        ...prev,
        [currentParticipant]: {
          ...prev[currentParticipant],
          used: updatedTotal,
        },
      }));

      // Remove the player from the available list
      setPlayers((prev) => prev.filter((_, idx) => idx !== playerIndex));
      setSearchQuery("");
      nextPicker();
    } catch (error) {
      console.error("Error making pick:", error);
    }
  };

  // ---------------------------
  // Final pick function for teams that missed their turn
  const finalPickPlayer = async (playerName) => {
    if (!finalPickPhase || finalPickQueue.length === 0) return;
    const currentParticipant = finalPickQueue[0];

    // Find the chosen player
    const playerIndex = players.findIndex((p) => p.player === playerName);
    if (playerIndex === -1) return;
    const chosenPlayer = players[playerIndex];

    // Local budget check
    const currentUsed = parseFloat(teamSalaryCaps[currentParticipant]?.used ?? 0);
    const playerSalary = parseFloat(chosenPlayer.salary ?? 0);
    const newUsed = currentUsed + playerSalary;
    const totalBudget = parseFloat(teamSalaryCaps[currentParticipant]?.totalBudget ?? SALARY_CAP_RULES.totalBudget);

    if (newUsed > totalBudget) {
      alert(
        `Cannot pick ${chosenPlayer.player}: That would bring payroll to $${newUsed.toLocaleString()}, exceeding your budget of $${totalBudget.toLocaleString()}.`
      );
      return;
    }

    // Make the final pick on the server
    try {
      const res = await fetch("http://localhost:3001/make-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leagueId,
          teamId: currentParticipant,
          playerId: chosenPlayer.player_id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Pick failed");
        return;
      }

      // (If your server also returns the newTeamSalary, parse that here)
      // const updatedTotal = parseFloat(data.newTeamSalary ?? newUsed);

      // Update local state for final pick
      setPickHistory((prev) => [
        ...prev,
        { round: "Final", participant: currentParticipant, player: chosenPlayer.player },
      ]);
      setRosters((prev) => {
        const updated = { ...prev };
        updated[currentParticipant] = [
          ...(updated[currentParticipant] || []),
          { ...chosenPlayer, category: determineCategory(currentParticipant) },
        ];
        return updated;
      });
      setTeamSalaryCaps((prev) => ({
        ...prev,
        [currentParticipant]: {
          ...prev[currentParticipant],
          used: newUsed,
        },
      }));
      setPlayers((prev) => prev.filter((_, idx) => idx !== playerIndex));
      setFinalPickQueue((prev) => {
        const newQueue = prev.slice(1);
        if (newQueue.length === 0) setFinalPickPhase(false);
        return newQueue;
      });
    } catch (error) {
      console.error("Error making final pick:", error);
      return;
    }
  };

  // ---------------------------
  // End draft: if any team has no picks, trigger final pick phase
  const endDraft = () => {
    const emptyTeams = participants.filter((p) => !rosters[p] || rosters[p].length === 0);
    if (emptyTeams.length > 0) {
      setIsDraftStarted(false);
      setFinalPickQueue(emptyTeams);
      setFinalPickPhase(true);
    } else {
      setIsDraftStarted(false);
      setDraftingTeam(null);
      setTimeLeft(0);
    }
  };

  // Handle "Next Team" button to view different rosters
  const handleNextTeam = () => {
    const teamIds = Object.keys(rosters);
    setCurrentTeamIndex((prev) => (prev + 1) % teamIds.length);
  };

  // Identify the currentTeamId in the roster view
  const teamIds = Object.keys(rosters);
  const currentTeamId = teamIds[currentTeamIndex] || "";
  const currentRoster = rosters[currentTeamId] || [];

  // Pull the team's salary info (with fallback)
  const currentTeamSalaryCap =
    teamSalaryCaps[currentTeamId] || {
      used: 0,
      totalBudget: SALARY_CAP_RULES.totalBudget,
    };

  // Convert them to real numbers so .toLocaleString() won't fail
  const payroll = parseFloat(currentTeamSalaryCap.used ?? 0);
  const budget = parseFloat(currentTeamSalaryCap.totalBudget ?? SALARY_CAP_RULES.totalBudget);

  // ---------------------------
  // Calculate payroll and tax tiers for display
  const tier1Excess =
    payroll > SALARY_CAP_RULES.softCap
      ? Math.min(payroll - SALARY_CAP_RULES.softCap, 31000000)
      : 0;
  const tier1Tax = tier1Excess * 1.5;

  const tier2Excess =
    payroll > SALARY_CAP_RULES.firstApron
      ? Math.min(payroll - SALARY_CAP_RULES.firstApron, 11000000)
      : 0;
  const tier2Tax = tier2Excess * 2;

  const tier3Excess =
    payroll > SALARY_CAP_RULES.hardCap
      ? payroll - SALARY_CAP_RULES.hardCap
      : 0;
  const tier3Tax = tier3Excess * 3;

  const totalTax = tier1Tax + tier2Tax + tier3Tax;

  // ---------------------------
  // Split current roster into groups for display
  const starters = currentRoster.slice(0, 5);
  const bench = currentRoster.slice(5, 9);
  const dnp = currentRoster.slice(9, 15);

  // ---------------------------
  // Start Draft Handler
  const handleStartDraft = () => {
    // Optionally exclude certain players
    const namesToExclude = ["Sarah", "You", "Michael", "Samantha"];
    setPlayers(allPlayers.filter((player) => !namesToExclude.includes(player.player)));
    setCurrentPickerIndex(0);

    if (participants.length > 0) {
      setDraftingTeam(participants[0]);
    }

    setCurrentRound(1);
    setTimeLeft(10);
    setIsDraftStarted(true);
    setPickHistory([]);
  };

  // ---------------------------
  // Reset Draft Handler
  const handleResetDraft = async () => {
    try {
      const res = await fetch("http://localhost:3001/reset-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error resetting draft");
        return;
      }
      alert("Draft reset successfully!");
      // Reload or refresh page state
      window.location.reload();
    } catch (error) {
      console.error("Error resetting draft:", error);
      alert("Network error");
    }
  };

  // ---------------------------
  // Render the component
  return (
    <div className="draft-board">
      <header className="draft-header">
        <div className="logo">NBA Fantasy Draft</div>
        <button onClick={handleResetDraft} style={{ marginLeft: "20px" }}>
          Reset Draft
        </button>
        {!finalPickPhase && draftingTeam && (
          <div className="draft-info">
            <span>
              Round: {currentRound} / {TOTAL_ROUNDS}
            </span>
            <span>Drafting Team: {draftingTeam}</span>
            <span>Time Left: {timeLeft}s</span>
          </div>
        )}
        {!isDraftStarted && !finalPickPhase && (
          <div style={{ marginLeft: "20px" }}>
            <button onClick={handleStartDraft} style={{ marginLeft: "10px" }}>
              Start Draft
            </button>
          </div>
        )}
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <h2>
            {finalPickPhase
              ? `Final Pick Phase - ${finalPickQueue[0]}: Please select your player`
              : "Available Players"}
          </h2>
          <div className="player-filters">
            <input
              type="text"
              placeholder="Search by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={sortCriteria}
              onChange={(e) => setSortCriteria(e.target.value)}
            >
              <option value="position">Sort by Position</option>
              <option value="salary">Sort by Salary</option>
              <option value="ppg">Sort by PPG</option>
              <option value="apg">Sort by APG</option>
              <option value="rbg">Sort by RBG</option>
            </select>
          </div>
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            <table className="players-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>PTS</th>
                  <th>RB</th>
                  <th>AST</th>
                  <th>Salary</th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.map((player) => (
                  <tr key={player.player_id}>
                    <td>{player.rank}</td>
                    <td
                      style={{ color: "#007bff", cursor: "pointer" }}
                      onClick={() =>
                        finalPickPhase
                          ? finalPickPlayer(player.player)
                          : handlePick(player.player)
                      }
                    >
                      {player.player}
                    </td>
                    <td>{player.pos}</td>
                    <td>{player.pts}</td>
                    <td>{player.rb}</td>
                    <td>{player.ast}</td>
                    <td>
                      $
                      {(parseFloat(player.salary ?? 0) / 1_000_000).toLocaleString()}
                      M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>

        <main className="center-panel">
          {!finalPickPhase && (
            <>
              <div className="draft-order-container">
                <h2>Draft Order (This Round)</h2>
                <ol>
                  {participants.map((p, idx) => (
                    <li
                      key={p}
                      style={{
                        fontWeight: idx === currentPickerIndex ? "bold" : "normal",
                      }}
                    >
                      {p}{" "}
                      {idx === currentPickerIndex && isDraftStarted
                        ? "(On the clock)"
                        : ""}
                    </li>
                  ))}
                </ol>
              </div>
              {pickHistory.length > 0 && (
                <div className="pick-history-container">
                  <h3>Pick History</h3>
                  <ul>
                    {pickHistory.map((pick, idx) => (
                      <li key={idx}>
                        {pick.round === "Final"
                          ? "Final Pick"
                          : `Round ${pick.round}`}
                        : {pick.participant} picked {pick.player}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <section className="my-team">
        <h2>
          Team:{" "}
          {teams.find((t) => t.team_id === currentTeamId)?.team_name ||
            currentTeamId}
        </h2>
        <div className="team-roster">
          <div className="roster-group">
            <h3>Starters (First 5 Picks)</h3>
            {starters.length > 0 ? (
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Player</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {starters.map((p, i) => (
                    <tr key={`starter-${i}`}>
                      <td>{p.pos}</td>
                      <td>{p.player}</td>
                      <td>
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No starters yet.</p>
            )}
          </div>
          <div className="roster-group">
            <h3>Bench (Next 4 Picks)</h3>
            {bench.length > 0 ? (
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Player</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {bench.map((p, i) => (
                    <tr key={`bench-${i}`}>
                      <td>{p.pos}</td>
                      <td>{p.player}</td>
                      <td>
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No bench picks yet.</p>
            )}
          </div>
          <div className="roster-group">
            <h3>DNP (Last 6 Picks)</h3>
            {dnp.length > 0 ? (
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Player</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {dnp.map((p, i) => (
                    <tr key={`dnp-${i}`}>
                      <td>{p.pos}</td>
                      <td>{p.player}</td>
                      <td>
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No DNP picks yet.</p>
            )}
          </div>
        </div>
        <div className="salary-cap" style={{ marginTop: "10px" }}>
          <div className="salary-cap-info">
            Budget: (${payroll.toLocaleString()} used / {budget.toLocaleString()})
            <br />
            Current Cap Stage: {getCapStage(payroll)}
          </div>
          <div className="salary-cap-bar">
            <div
              className="salary-cap-progress"
              style={{
                width: `${(payroll / budget) * 100}%`,
              }}
            ></div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.95rem", color: "#444" }}>
            <div>
              <strong>Tier 1 (Over Soft Cap $140M, max 31M taxable):</strong>{" "}
              {Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000)
                .toLocaleString()}{" "}
              taxed at 1.5× ={" "}
              {(
                Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000) *
                1.5
              ).toLocaleString()}
            </div>
            <div>
              <strong>Tier 2 (From $178M to $189M, max 11M taxable):</strong>{" "}
              {Math.min(Math.max(payroll - SALARY_CAP_RULES.firstApron, 0), 11000000)
                .toLocaleString()}{" "}
              taxed at 2× ={" "}
              {(
                Math.min(
                  Math.max(payroll - SALARY_CAP_RULES.firstApron, 0),
                  11000000
                ) * 2
              ).toLocaleString()}
            </div>
            <div>
              <strong>Tier 3 (Above $189M):</strong>{" "}
              {Math.max(payroll - SALARY_CAP_RULES.hardCap, 0).toLocaleString()}{" "}
              taxed at 3× ={" "}
              {(
                Math.max(payroll - SALARY_CAP_RULES.hardCap, 0) * 3
              ).toLocaleString()}
            </div>
            <div>
              <strong>Total Tax:</strong> {totalTax.toLocaleString()}
            </div>
          </div>
        </div>
        <button onClick={handleNextTeam} style={{ marginTop: "10px" }}>
          Next Team
        </button>
      </section>
    </div>
  );
};

export default LiveDraftComponent;

