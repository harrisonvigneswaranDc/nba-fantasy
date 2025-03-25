import React, { useState, useEffect, useMemo } from "react";
import "./PracticeFantasyDraft.css";

// Helper function to shuffle an array (Fisher-Yates)
const shuffleArray = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Salary Cap Rules Configuration (values in dollars)
const SALARY_CAP_RULES = {
  salaryFloor: 126000000,   // $126M
  softCap: 140000000,       // $140M
  firstApron: 178000000,    // $178M
  hardCap: 189000000,       // $189M (Second Apron / Hard Cap)
  totalBudget: 300000000    // Overall team budget
};

// Helper function to indicate the current cap stage based on payroll
const getCapStage = (payroll) => {
  if (payroll <= SALARY_CAP_RULES.softCap) {
    return "Below Soft Cap";
  } else if (payroll <= SALARY_CAP_RULES.firstApron) {
    return "Soft Cap";
  } else if (payroll <= SALARY_CAP_RULES.hardCap) {
    return "First Apron";
  } else {
    return "Second Apron (Hard Cap)";
  }
};

const PracticeFantasyDraft = () => {
  const TOTAL_ROUNDS = 15;

  // Draft state variables
  const [currentRound, setCurrentRound] = useState(1);
  const [draftingTeam, setDraftingTeam] = useState("None");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  // Participants, rosters, and salary caps
  const [participants, setParticipants] = useState([]);
  const [currentPickerIndex, setCurrentPickerIndex] = useState(0);
  const [rosters, setRosters] = useState({});
  const [teamSalaryCaps, setTeamSalaryCaps] = useState({});

  // Players state and backup of the full players list
  const [allPlayers, setAllPlayers] = useState([]);
  const [players, setPlayers] = useState([]);

  // States for search and sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriteria, setSortCriteria] = useState("salary");

  // Dropdown state for user count
  const [selectedUserCount, setSelectedUserCount] = useState("4");

  // Pick history state
  const [pickHistory, setPickHistory] = useState([]);

  // States for final pick phase (for users who missed all rounds)
  const [finalPickPhase, setFinalPickPhase] = useState(false);
  const [finalPickQueue, setFinalPickQueue] = useState([]);

  // Fetch full players list from JSON
  useEffect(() => {
    fetch("/data/players.json")
      .then((response) => response.json())
      .then((data) => {
        const formattedData = data.map((player, index) => ({
          rank: player.Rank || index + 1,
          name: player.Player,
          position: player.Pos,
          pts: player.PTS,
          rb: player.RB,
          assist: player.AST,
          stls: player.STL,
          blks: player.BLK,
          tvs: player.TVS || 0,
          salary: player.Salary, // Salary in dollars
        }));
        setAllPlayers(formattedData);
      })
      .catch((error) => console.error("Error loading players:", error));
  }, []);

  // Update players list (for display) once the draft hasn't started.
  useEffect(() => {
    if (!isDraftStarted && allPlayers.length > 0) {
      setPlayers(allPlayers);
    }
  }, [allPlayers, isDraftStarted]);

  // Filter players by search query (by name or position)
  const filteredPlayers = useMemo(() => {
    return players.filter((player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  // Sort players by the selected criteria
  const sortedPlayers = useMemo(() => {
    let sorted = [...filteredPlayers];
    if (sortCriteria === "position") {
      sorted.sort((a, b) => a.position.localeCompare(b.position));
    } else if (sortCriteria === "salary") {
      sorted.sort((a, b) => b.salary - a.salary);
    } else if (sortCriteria === "ppg") {
      sorted.sort((a, b) => b.pts - a.pts);
    } else if (sortCriteria === "apg") {
      sorted.sort((a, b) => b.assist - a.assist);
    } else if (sortCriteria === "rbg") {
      sorted.sort((a, b) => b.rb - a.rb);
    }
    return sorted;
  }, [filteredPlayers, sortCriteria]);

  // --- Restrict Available Players in Second Apron ---
  // If the drafting team is in "Second Apron (Hard Cap)", only show players worth <= $5M.
  const currentDraftingTeamUsed = teamSalaryCaps[draftingTeam]?.used || 0;
  const currentDraftingTeamStage = getCapStage(currentDraftingTeamUsed);
  const availablePlayers = 
    currentDraftingTeamStage === "Second Apron (Hard Cap)"
      ? sortedPlayers.filter(player => player.salary <= 5000000)
      : sortedPlayers;
  // ---------------------------------------------------

  // Timer logic for draft countdown
  useEffect(() => {
    if (!isDraftStarted) return;
    if (timeLeft <= 0) {
      skipTurn();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isDraftStarted]);

  // Skip turn when time runs out
  const skipTurn = () => {
    const currentParticipant = participants[currentPickerIndex];
    setPickHistory((prev) => [
      ...prev,
      { round: currentRound, participant: currentParticipant, player: "Missed Turn" },
    ]);
    if (currentPickerIndex + 1 < participants.length) {
      setCurrentPickerIndex(currentPickerIndex + 1);
      setDraftingTeam(participants[currentPickerIndex + 1]);
      setTimeLeft(10);
    } else {
      if (currentRound < TOTAL_ROUNDS) {
        const newOrder = shuffleArray(participants);
        setParticipants(newOrder);
        setCurrentRound(currentRound + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(newOrder[0]);
        setTimeLeft(10);
      } else {
        endDraft();
      }
    }
  };

  // When a player is picked manually during the main draft.
  const pickPlayer = (playerName) => {
    if (!isDraftStarted) return;
    const currentParticipant = participants[currentPickerIndex];
    const playerIndex = players.findIndex((p) => p.name === playerName);
    if (playerIndex === -1) return;
    const chosenPlayer = players[playerIndex];

    // If in second apron, enforce that only players ≤ $5M can be picked.
    if (getCapStage(teamSalaryCaps[currentParticipant]?.used || 0) === "Second Apron (Hard Cap)" && chosenPlayer.salary > 5000000) {
      alert("In Second Apron, you can only pick players worth $5M or less.");
      return;
    }

    // Validate that adding this player does not exceed the team's budget.
    const currentUsed = teamSalaryCaps[currentParticipant]?.used || 0;
    const newUsed = currentUsed + chosenPlayer.salary;
    if (newUsed > teamSalaryCaps[currentParticipant].totalBudget) {
      alert(`Cannot pick ${chosenPlayer.name}: That would bring payroll to $${newUsed.toLocaleString()}M, exceeding your budget of $${teamSalaryCaps[currentParticipant].totalBudget.toLocaleString()}M.`);
      return;
    }

    setPickHistory((prev) => [
      ...prev,
      { round: currentRound, participant: currentParticipant, player: chosenPlayer.name },
    ]);

    setRosters((prev) => {
      const updated = { ...prev };
      updated[currentParticipant] = [...updated[currentParticipant], chosenPlayer];
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
    setSearchQuery("");

    if (currentPickerIndex + 1 < participants.length) {
      setCurrentPickerIndex(currentPickerIndex + 1);
      setDraftingTeam(participants[currentPickerIndex + 1]);
      setTimeLeft(10);
    } else {
      if (currentRound < TOTAL_ROUNDS) {
        const newOrder = shuffleArray(participants);
        setParticipants(newOrder);
        setCurrentRound(currentRound + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(newOrder[0]);
        setTimeLeft(10);
      } else {
        endDraft();
      }
    }
  };

  // Final pick function for users who missed their turns.
  const finalPickPlayer = (playerName) => {
    if (!finalPickPhase || finalPickQueue.length === 0) return;
    const currentParticipant = finalPickQueue[0];
    const playerIndex = players.findIndex((p) => p.name === playerName);
    if (playerIndex === -1) return;
    const chosenPlayer = players[playerIndex];

    // Enforce the $5M limit if in second apron.
    if (getCapStage(teamSalaryCaps[currentParticipant]?.used || 0) === "Second Apron (Hard Cap)" && chosenPlayer.salary > 5000000) {
      alert("In Second Apron, you can only pick players worth $5M or less.");
      return;
    }

    const currentUsed = teamSalaryCaps[currentParticipant]?.used || 0;
    const newUsed = currentUsed + chosenPlayer.salary;
    if (newUsed > teamSalaryCaps[currentParticipant].totalBudget) {
      alert(`Cannot pick ${chosenPlayer.name}: That would exceed your budget.`);
      return;
    }

    setPickHistory((prev) => [
      ...prev,
      { round: "Final", participant: currentParticipant, player: chosenPlayer.name },
    ]);

    setRosters((prev) => {
      const updated = { ...prev };
      updated[currentParticipant] = [...updated[currentParticipant], chosenPlayer];
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
      if (newQueue.length === 0) {
        setFinalPickPhase(false);
      }
      return newQueue;
    });
  };

  // End the main draft; trigger final pick phase if any participant never picked.
  const endDraft = () => {
    const emptyRosters = participants.filter((p) => rosters[p].length === 0);
    if (emptyRosters.length > 0) {
      setIsDraftStarted(false);
      setFinalPickQueue(emptyRosters);
      setFinalPickPhase(true);
    } else {
      setIsDraftStarted(false);
      setDraftingTeam("None");
      setTimeLeft(0);
    }
  };

  // For displaying team rosters, allow cycling through teams.
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const handleNextTeam = () => {
    const teamNames = Object.keys(rosters);
    setCurrentTeamIndex((prev) => (prev + 1) % teamNames.length);
  };

  const teamNames = Object.keys(rosters);
  const currentTeamName = teamNames[currentTeamIndex] || "";
  const currentRoster = rosters[currentTeamName] || [];
  const currentTeamSalaryCap =
    teamSalaryCaps[currentTeamName] || { used: 0, totalBudget: SALARY_CAP_RULES.totalBudget };

  // --- Existing Payroll & Tax Calculations (Tiered) ---
  const payroll = currentTeamSalaryCap.used; // current team's payroll  
  const softCap = SALARY_CAP_RULES.softCap;      // $140M  
  const firstApron = SALARY_CAP_RULES.firstApron;  // $178M  
  const secondApron = SALARY_CAP_RULES.hardCap;    // $189M  

  // Tier 1: Max taxable excess capped at $31M (with multiplier 1.5×)
  const tier1Excess = payroll > softCap ? Math.min(payroll - softCap, 31000000) : 0;
  const tier1Tax = tier1Excess * 1.5;

  // Tier 2: Applies from $178M to $189M (max $11M taxable with multiplier 2×)
  const tier2Excess = payroll > firstApron ? Math.min(payroll - firstApron, 11000000) : 0;
  const tier2Tax = tier2Excess * 2;

  // Tier 3: Applies for payroll above $189M (multiplier 3×)
  const tier3Excess = payroll > secondApron ? payroll - secondApron : 0;
  const tier3Tax = tier3Excess * 3;

  const totalTax = tier1Tax + tier2Tax + tier3Tax;
  // ---------------------------------------------------

  // For splitting the team's roster into groups:
  const starters = currentRoster.slice(0, 5);
  const bench = currentRoster.slice(5, 9);
  const dnp = currentRoster.slice(9, 15);

  // Start Draft Handler: initializes participants, rosters, and salary caps.
  const handleStartDraft = () => {
    const namesToExclude = ["Sarah", "You", "Michael", "Samantha"];
    setPlayers(allPlayers.filter((player) => !namesToExclude.includes(player.name)));

    const numUsers = parseInt(selectedUserCount, 10);
    const generatedParticipants = Array.from({ length: numUsers }, (_, i) => `User ${i + 1}`);
    const shuffledParticipants = shuffleArray(generatedParticipants);
    setParticipants(shuffledParticipants);

    const initialRosters = {};
    const initialCaps = {};
    shuffledParticipants.forEach((user) => {
      initialRosters[user] = [];
      initialCaps[user] = { used: 0, totalBudget: SALARY_CAP_RULES.totalBudget };
    });
    setRosters(initialRosters);
    setTeamSalaryCaps(initialCaps);

    setCurrentPickerIndex(0);
    setDraftingTeam(shuffledParticipants[0]);
    setCurrentRound(1);
    setTimeLeft(10);
    setIsDraftStarted(true);
    setPickHistory([]);
  };

  return (
    <div className="draft-board">
      <header className="draft-header">
        <div className="logo">NBA Fantasy Draft</div>
        {!finalPickPhase && (
          <div className="draft-info">
            <span>Round: {currentRound} / {TOTAL_ROUNDS}</span>
            <span>Drafting Team: {draftingTeam}</span>
            <span>Time Left: {timeLeft}s</span>
          </div>
        )}
        {!isDraftStarted && !finalPickPhase && (
          <div style={{ marginLeft: "20px" }}>
            <label style={{ marginRight: "10px" }}>Select Number of Users: </label>
            <select
              value={selectedUserCount}
              onChange={(e) => setSelectedUserCount(e.target.value)}
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
            </select>
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
            <select value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)}>
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
                  <tr key={player.rank}>
                    <td>{player.rank}</td>
                    <td
                      style={{ color: "#007bff", cursor: "pointer" }}
                      onClick={() =>
                        finalPickPhase ? finalPickPlayer(player.name) : pickPlayer(player.name)
                      }
                    >
                      {player.name}
                    </td>
                    <td>{player.position}</td>
                    <td>{player.pts}</td>
                    <td>{player.rb}</td>
                    <td>{player.assist}</td>
                    <td>${player.salary.toLocaleString()}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>

        <main className="center-panel">
          {/* Draft Order */}
          {!finalPickPhase && (
            <>
              <div className="draft-order-container">
                <h2>Draft Order (This Round)</h2>
                <ol>
                  {participants.map((p, idx) => (
                    <li key={p} style={{ fontWeight: idx === currentPickerIndex ? "bold" : "normal" }}>
                      {p} {idx === currentPickerIndex && isDraftStarted ? "(On the clock)" : ""}
                    </li>
                  ))}
                </ol>
              </div>
              {/* Pick History */}
              {pickHistory.length > 0 && (
                <div className="pick-history-container">
                  <h3>Pick History</h3>
                  <ul>
                    {pickHistory.map((pick, idx) => (
                      <li key={idx}>
                        {pick.round === "Final" ? "Final Pick" : `Round ${pick.round}`}: {pick.participant} picked {pick.player}
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
        <h2>Team: {currentTeamName}</h2>
        <div className="team-roster">
          {/* Starters Group */}
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
                  {starters.map((player, index) => (
                    <tr key={`starter-${index}`}>
                      <td>{player.position}</td>
                      <td>{player.name}</td>
                      <td>${player.salary.toLocaleString()}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No starters yet.</p>
            )}
          </div>
          {/* Bench Group */}
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
                  {bench.map((player, index) => (
                    <tr key={`bench-${index}`}>
                      <td>{player.position}</td>
                      <td>{player.name}</td>
                      <td>${player.salary.toLocaleString()}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No bench picks yet.</p>
            )}
          </div>
          {/* DNP Group */}
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
                  {dnp.map((player, index) => (
                    <tr key={`dnp-${index}`}>
                      <td>{player.position}</td>
                      <td>{player.name}</td>
                      <td>${player.salary.toLocaleString()}M</td>
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
            Budget: (${currentTeamSalaryCap.used.toLocaleString()}M used / ${currentTeamSalaryCap.totalBudget.toLocaleString()}M)
            <br />
            Current Cap Stage: {getCapStage(currentTeamSalaryCap.used)}
          </div>
          <div className="salary-cap-bar">
            <div
              className="salary-cap-progress"
              style={{ width: `${(currentTeamSalaryCap.used / currentTeamSalaryCap.totalBudget) * 100}%` }}
            ></div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.95rem", color: "#444" }}>
            <div>
              <strong>Tier 1 (Over Soft Cap $140M, max 31M taxable):</strong>{" "}
              ${Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000).toLocaleString()}M taxed at 1.5× = ${(Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000) * 1.5).toLocaleString()}M
            </div>
            <div>
              <strong>Tier 2 (From $178M to $189M, max 11M taxable):</strong>{" "}
              ${Math.min(Math.max(payroll - SALARY_CAP_RULES.firstApron, 0), 11000000).toLocaleString()}M taxed at 2× = ${(Math.min(Math.max(payroll - SALARY_CAP_RULES.firstApron, 0), 11000000) * 2).toLocaleString()}M
            </div>
            <div>
              <strong>Tier 3 (Above $189M):</strong>{" "}
              ${Math.max(payroll - SALARY_CAP_RULES.hardCap, 0).toLocaleString()}M taxed at 3× = ${(Math.max(payroll - SALARY_CAP_RULES.hardCap, 0) * 3).toLocaleString()}M
            </div>
            <div>
              <strong>Total Tax:</strong> ${(tier1Tax + tier2Tax + tier3Tax).toLocaleString()}M
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

export default PracticeFantasyDraft;
