import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom"; 

const leagueId = 1;

// Time limit constant for each pick
const TIME_LIMIT = 30; // seconds for each pick

// Salary Cap Rules 
const SALARY_CAP_RULES = {
  salaryFloor: 126000000,
  softCap: 140000000,
  firstApron: 178000000,
  hardCap: 189000000,
  totalBudget: 300000000,
};

//  determine current cap 
const getCapStage = (payroll) => {
  if (payroll <= SALARY_CAP_RULES.softCap) return "Below Soft Cap";
  if (payroll <= SALARY_CAP_RULES.firstApron) return "Soft Cap";
  if (payroll <= SALARY_CAP_RULES.hardCap) return "First Apron";
  return "Second Apron (Hard Cap)";
};



const LiveDraftComponent = () => {
  const TOTAL_ROUNDS = 15;



  // State 
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

  
  const [finalPickPhase, setFinalPickPhase] = useState(false);
  const [finalPickQueue, setFinalPickQueue] = useState([]);

  // Fetched teams from the league (expected 2 teams)
  const [teams, setTeams] = useState([]);

  // Roster view: cycle through teams
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);


  // Fetch teams for this league
  useEffect(() => {
    fetch(`http://localhost:3001/teams-for-league?leagueId=${leagueId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTeams(data); 
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


  // Fetch players for this league 
  useEffect(() => {
    fetch(`http://localhost:3001/league-players?leagueId=${leagueId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {

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


  // Determine if drafting team is above the second apron
  const currentDraftingTeamUsed =
    teamSalaryCaps[draftingTeam]?.used ?? 0; 
  const currentDraftingTeamStage = getCapStage(currentDraftingTeamUsed);

  const availablePlayers = useMemo(() => {
    if (currentDraftingTeamStage === "Second Apron (Hard Cap)") {
      return sortedPlayers.filter((p) => p.salary <= 5000000);
    }
    return sortedPlayers;
  }, [sortedPlayers, currentDraftingTeamStage]);


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
      setTimeLeft(TIME_LIMIT);
    } else {
      // We finished this round
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound((prev) => prev + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(participants[0]);
        setTimeLeft(TIME_LIMIT);
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

      // Use the official updated salary
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

  const handleNextTeam = () => {
    const teamIds = Object.keys(rosters);
    setCurrentTeamIndex((prev) => (prev + 1) % teamIds.length);
  };


  const teamIds = Object.keys(rosters);
  const currentTeamId = teamIds[currentTeamIndex] || "";
  const currentRoster = rosters[currentTeamId] || [];

  // Pull the team's salary i
  const currentTeamSalaryCap =
    teamSalaryCaps[currentTeamId] || {
      used: 0,
      totalBudget: SALARY_CAP_RULES.totalBudget,
    };


  const payroll = parseFloat(currentTeamSalaryCap.used ?? 0);
  const budget = parseFloat(currentTeamSalaryCap.totalBudget ?? SALARY_CAP_RULES.totalBudget);


  // Calculate payroll and tax 
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


  // Split current roster 
  const starters = currentRoster.slice(0, 5);
  const bench = currentRoster.slice(5, 9);
  const dnp = currentRoster.slice(9, 15);


  // Start Draft 
  const handleStartDraft = async () => {
    try {
      // Call backend to reset draft
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
  
      console.log("Draft reset successfully!");
  
      // Clear local state rosters and caps
      const resetRosters = {};
      const resetCaps = {};
      participants.forEach((teamId) => {
        resetRosters[teamId] = [];
        resetCaps[teamId] = {
          used: 0,
          totalBudget: SALARY_CAP_RULES.totalBudget,
        };
      });
      setRosters(resetRosters);
      setTeamSalaryCaps(resetCaps);
  
      // Exclude unwanted players
      const namesToExclude = ["Sarah", "You", "Michael", "Samantha"];
      setPlayers(allPlayers.filter((player) => !namesToExclude.includes(player.player)));
  
      // Reset draft state
      setCurrentPickerIndex(0);
      if (participants.length > 0) {
        setDraftingTeam(participants[0]);
      }
  
      setCurrentRound(1);
      setTimeLeft(TIME_LIMIT);
      setIsDraftStarted(true);
      setPickHistory([]);
      setFinalPickPhase(false);
      setFinalPickQueue([]);
  
    } catch (error) {
      console.error("Error resetting draft:", error);
      alert("Network error");
    }
  };
  

  // Calculate the timer progress percentage
  const timerPercentage = (timeLeft / TIME_LIMIT) * 100;
  
  // Function to determine the timer bar color based on time remaining
  const getTimerColor = () => {
    if (timerPercentage > 66) return 'bg-green-500';
    if (timerPercentage > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };


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


  return (
    <div className="max-w-7xl mx-auto p-5 bg-gray-900 rounded-lg shadow-md text-gray-200">
      <header className="flex items-center justify-between pb-5 mb-5 border-b border-gray-700">
        <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/">NBA Fantasy Draft</Link>
        <button onClick={handleResetDraft} className="ml-5 py-2.5 px-5 text-base font-semibold text-white bg-red-600 border-none rounded-md cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-red-900/50 hover:bg-red-700">
          Reset Draft
        </button>
        {!finalPickPhase && draftingTeam && (
          <div className="flex items-center space-x-4 text-gray-300">
            <span>
              Round: {currentRound} / {TOTAL_ROUNDS}
            </span>
            <span>Drafting Team: {draftingTeam}</span>
            <span>Time Left: {timeLeft}s</span>
          </div>
        )}
        {!isDraftStarted && !finalPickPhase && (
          <div className="ml-5">
            <button onClick={handleStartDraft} className="ml-2.5 py-2.5 px-5 text-base font-semibold text-white bg-green-600 border-none rounded-md cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-green-900/50 hover:bg-green-700">
              Start Draft
            </button>
          </div>
        )}
      </header>

      {/* Timer Bar */}
      {isDraftStarted && !finalPickPhase && (
        <div className="w-full h-4 bg-gray-700 rounded-full mb-6 overflow-hidden shadow-inner">
          <div 
            className={`h-full transition-all duration-[900ms] ease-linear rounded-full ${getTimerColor()}`}
            style={{ 
              width: '100%',
              transform: `translateX(${100 - timerPercentage}%)` 
            }}
          ></div>
        </div>
      )}

      <div className="flex gap-5 flex-col md:flex-row">
        <aside className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <h2 className="mt-0 text-xl mb-4 text-purple-400 font-bold">
            {finalPickPhase
              ? `Final Pick Phase - ${finalPickQueue[0]}: Please select your player`
              : "Available Players"}
          </h2>
          <div className="mb-4 space-y-2">
            <input
              type="text"
              placeholder="Search by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2 px-3 text-base border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:border-purple-500 focus:outline-none w-full placeholder-gray-400"
            />
            <select
              value={sortCriteria}
              onChange={(e) => setSortCriteria(e.target.value)}
              className="py-2 px-3 text-base text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:border-purple-500 focus:outline-none w-full"
            >
              <option value="position">Sort by Position</option>
              <option value="salary">Sort by Salary</option>
              <option value="ppg">Sort by PPG</option>
              <option value="apg">Sort by APG</option>
              <option value="rbg">Sort by RBG</option>
            </select>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Rank</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Player</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Pos</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">PTS</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">RB</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">AST</th>
                  <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Salary</th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.map((player) => (
                  <tr key={player.player_id} className="odd:bg-gray-800 even:bg-gray-700/50 hover:bg-gray-600 transition-colors duration-150">
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.rank}</td>
                    <td
                      className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm text-blue-400 cursor-pointer hover:text-blue-300 font-medium"
                      onClick={() =>
                        finalPickPhase
                          ? finalPickPlayer(player.player)
                          : handlePick(player.player)
                      }
                    >
                      {player.player}
                    </td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.pos}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.pts}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.rb}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.ast}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">
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

        <main className="flex-[1.5] bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          {!finalPickPhase && (
            <>
              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-5">
                <h2 className="mt-0 text-xl mb-4 px-2.5 pt-2.5 text-purple-400 font-bold">Draft Order (This Round)</h2>
                <ol className="m-0 p-0 list-none">
                  {participants.map((p, idx) => (
                    <li
                      key={p}
                      className={`text-center py-2.5 px-2.5 border-b border-gray-600 text-sm ${idx % 2 === 1 ? 'bg-gray-700/50' : ''} ${idx === currentPickerIndex ? 'font-bold text-purple-300' : 'font-normal'}`}
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
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-5 max-h-[300px] overflow-y-auto">
                  <h3 className="mt-5 text-lg mb-3 px-2.5 pt-2.5 text-purple-400 font-bold">Pick History</h3>
                  <ul className="m-0 p-0 list-none">
                    {pickHistory.map((pick, idx) => (
                      <li
                        key={idx}
                        className={`text-center py-2.5 px-2.5 border-b border-gray-600 text-sm ${idx % 2 === 1 ? 'bg-gray-700/50' : ''}`}
                      >
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

      <section className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
        <h2 className="mt-0 text-xl mb-4 text-purple-400 font-bold">
          Team:{" "}
          {teams.find((t) => t.team_id === currentTeamId)?.team_name ||
            currentTeamId}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="mb-5">
            <h3 className="my-5 text-lg text-purple-300 font-semibold">Starters (First 5 Picks)</h3>
            {starters.length > 0 ? (
              <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden mb-5">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Position</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Player</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {starters.map((p, i) => (
                    <tr key={`starter-${i}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.pos}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.player}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No starters yet.</p>
            )}
          </div>
          <div className="mb-5">
            <h3 className="my-5 text-lg text-purple-300 font-semibold">Bench (Next 4 Picks)</h3>
            {bench.length > 0 ? (
              <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden mb-5">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Position</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Player</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {bench.map((p, i) => (
                    <tr key={`bench-${i}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.pos}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.player}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No bench picks yet.</p>
            )}
          </div>
          <div className="mb-5">
            <h3 className="my-5 text-lg text-purple-300 font-semibold">DNP (Last 6 Picks)</h3>
            {dnp.length > 0 ? (
              <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden mb-5">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Position</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Player</th>
                    <th className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm font-semibold text-purple-300">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {dnp.map((p, i) => (
                    <tr key={`dnp-${i}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.pos}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{p.player}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">
                        $
                        {(parseFloat(p.salary ?? 0) / 1_000_000).toLocaleString()}
                        M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No DNP picks yet.</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="font-semibold mb-2.5 text-sm text-gray-300">
            Budget: (${payroll.toLocaleString()} used / {budget.toLocaleString()})
            <br />
            Current Cap Stage: <span className="text-purple-400">{getCapStage(payroll)}</span>
          </div>
          <div className="w-full bg-gray-700 h-4 rounded-lg overflow-hidden relative">
            <div
              className="h-full bg-purple-600 rounded-l-lg transition-all duration-300"
              style={{
                width: `${(payroll / budget) * 100}%`,
              }}
            ></div>
          </div>
          <div className="mt-4 text-[0.95rem] text-gray-400 space-y-2">
            <div>
              <strong className="text-purple-300">Tier 1 (Over Soft Cap $140M, max 31M taxable):</strong>{" "}
              {Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000)
                .toLocaleString()}{" "}
              taxed at 1.5× ={" "}
              {(
                Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000) *
                1.5
              ).toLocaleString()}
            </div>
            <div>
              <strong className="text-purple-300">Tier 2 (From $178M to $189M, max 11M taxable):</strong>{" "}
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
              <strong className="text-purple-300">Tier 3 (Above $189M):</strong>{" "}
              {Math.max(payroll - SALARY_CAP_RULES.hardCap, 0).toLocaleString()}{" "}
              taxed at 3× ={" "}
              {(
                Math.max(payroll - SALARY_CAP_RULES.hardCap, 0) * 3
              ).toLocaleString()}
            </div>
            <div>
              <strong className="text-purple-300">Total Tax:</strong> {totalTax.toLocaleString()}
            </div>
          </div>
        </div>
        <button onClick={handleNextTeam} className="mt-6 py-2.5 px-6 text-base font-semibold text-white bg-purple-600 border-none rounded-lg cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-purple-900/50 hover:bg-purple-700">
          Next Team
        </button>
      </section>
    </div>
  );
};

export default LiveDraftComponent;

