import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom"; 


// shuffle an array (Fisher-Yates)
const shuffleArray = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Salary Cap Rules Configuration 
const SALARY_CAP_RULES = {
  salaryFloor: 126000000,   
  softCap: 140000000,       
  firstApron: 178000000,    
  hardCap: 189000000,       
  totalBudget: 300000000    
};

// current cap stage based on payroll
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
  const TIME_LIMIT = 30; 

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

  // States for final pick phase 
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
          salary: player.Salary, 
        }));
        setAllPlayers(formattedData);
      })
      .catch((error) => console.error("Error loading players:", error));
  }, []);

  // Update players list 
  useEffect(() => {
    if (!isDraftStarted && allPlayers.length > 0) {
      setPlayers(allPlayers);
    }
  }, [allPlayers, isDraftStarted]);

  // Filter players by search query 
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

  // Determine available players based on the current drafting team and cap stage
  const currentDraftingTeamUsed = teamSalaryCaps[draftingTeam]?.used || 0;
  const currentDraftingTeamStage = getCapStage(currentDraftingTeamUsed);
  const availablePlayers = 
    currentDraftingTeamStage === "Second Apron (Hard Cap)"
      ? sortedPlayers.filter(player => player.salary <= 5000000)
      : sortedPlayers;
  

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
      setTimeLeft(TIME_LIMIT);
    } else {
      if (currentRound < TOTAL_ROUNDS) {
        const newOrder = shuffleArray(participants);
        setParticipants(newOrder);
        setCurrentRound(currentRound + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(newOrder[0]);
        setTimeLeft(TIME_LIMIT);
      } else {
        endDraft();
      }
    }
  };

  // When a player is picked manually 
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
      setTimeLeft(TIME_LIMIT);
    } else {
      if (currentRound < TOTAL_ROUNDS) {
        const newOrder = shuffleArray(participants);
        setParticipants(newOrder);
        setCurrentRound(currentRound + 1);
        setCurrentPickerIndex(0);
        setDraftingTeam(newOrder[0]);
        setTimeLeft(TIME_LIMIT);
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

  //  trigger final pick phase if any participant never picked.
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


  const payroll = currentTeamSalaryCap.used; // current team's payroll  
  const softCap = SALARY_CAP_RULES.softCap;      // $140M  
  const firstApron = SALARY_CAP_RULES.firstApron;  // $178M  
  const secondApron = SALARY_CAP_RULES.hardCap;    // $189M  

  // Tier 1: Max taxable excess capped at $31M 
  const tier1Excess = payroll > softCap ? Math.min(payroll - softCap, 31000000) : 0;
  const tier1Tax = tier1Excess * 1.5;

  // Tier 2: Applies from $178M to $189M 
  const tier2Excess = payroll > firstApron ? Math.min(payroll - firstApron, 11000000) : 0;
  const tier2Tax = tier2Excess * 2;

  // Tier 3: Applies for payroll above $189M 
  const tier3Excess = payroll > secondApron ? payroll - secondApron : 0;
  const tier3Tax = tier3Excess * 3;

  const totalTax = tier1Tax + tier2Tax + tier3Tax;


  // For splitting the team's roster into groups:
  const starters = currentRoster.slice(0, 5);
  const bench = currentRoster.slice(5, 9);
  const dnp = currentRoster.slice(9, 15);

  // initializes participants, rosters, and salary caps.
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
    setTimeLeft(TIME_LIMIT);
    setIsDraftStarted(true);
    setPickHistory([]);
  };

  // Calculate the timer progress percentage
  const timerPercentage = (timeLeft / TIME_LIMIT) * 100;
  
  // Function to determine the timer bar color based on time remaining
  const getTimerColor = () => {
    if (timerPercentage > 66) return 'bg-green-500';
    if (timerPercentage > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto p-5 bg-gray-900 rounded-lg shadow-md text-gray-200">
      
      <header className="flex items-center justify-between pt-5 pb-5 mb-5 border-b border-gray-700">
        <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/">NBA Fantasy Draft</Link>
        {!finalPickPhase && (
          <div className="text-base text-gray-300">
            <span className="ml-5">Round: {currentRound} / {TOTAL_ROUNDS}</span>
            <span className="ml-5">Drafting Team: {draftingTeam}</span>
            <span className="ml-5">Time Left: {timeLeft}s</span>
          </div>
        )}
        {!isDraftStarted && !finalPickPhase && (
          <div className="ml-5">
            <label className="mr-2.5 text-gray-300">Select Number of Users: </label>
            <select
              className="py-2 px-3 text-base text-gray-200 bg-gray-800 border border-gray-600 rounded-md focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 mr-2.5"
              value={selectedUserCount}
              onChange={(e) => setSelectedUserCount(e.target.value)}
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
            </select>
            <button 
              onClick={handleStartDraft} 
              className="py-2.5 px-5 text-base font-semibold text-white bg-purple-600 border-none rounded-md cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-purple-900/50 hover:bg-purple-700"
            >
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
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2 px-3 text-base border border-gray-600 rounded-md bg-gray-700 text-gray-200 focus:border-purple-500 focus:outline-none w-full mb-2 placeholder-gray-400"
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
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
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
                  <tr key={player.rank} className="odd:bg-gray-800 even:bg-gray-700/50 hover:bg-gray-600 transition-colors duration-150">
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.rank}</td>
                    <td
                      className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm text-purple-400 cursor-pointer hover:text-purple-300 font-medium"
                      onClick={() =>
                        finalPickPhase ? finalPickPlayer(player.name) : pickPlayer(player.name)
                      }
                    >
                      {player.name}
                    </td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.position}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.pts}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.rb}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.assist}</td>
                    <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">${player.salary.toLocaleString()}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>

        <main className="flex-[1.5] bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          {/* Draft Order */}
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
                      {p} {idx === currentPickerIndex && isDraftStarted ? "(On the clock)" : ""}
                    </li>
                  ))}
                </ol>
              </div>
              {/* Pick History */}
              {pickHistory.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <h3 className="mt-5 text-lg mb-3 px-2.5 pt-2.5 text-purple-400 font-bold">Pick History</h3>
                  <ul className="m-0 p-0 list-none">
                    {pickHistory.map((pick, idx) => (
                      <li 
                        key={idx} 
                        className={`text-center py-2.5 px-2.5 border-b border-gray-600 text-sm ${idx % 2 === 1 ? 'bg-gray-700/50' : ''}`}
                      >
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

      <section className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
        <h2 className="mt-0 text-xl mb-4 text-purple-400 font-bold">Team: {currentTeamName}</h2>
        <div className="overflow-x-auto custom-scrollbar">
          {/* Starters Group */}
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
                  {starters.map((player, index) => (
                    <tr key={`starter-${index}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.position}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.name}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">${player.salary.toLocaleString()}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No starters yet.</p>
            )}
          </div>
          {/* Bench Group */}
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
                  {bench.map((player, index) => (
                    <tr key={`bench-${index}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.position}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.name}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">${player.salary.toLocaleString()}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No bench picks yet.</p>
            )}
          </div>
          {/* DNP Group */}
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
                  {dnp.map((player, index) => (
                    <tr key={`dnp-${index}`} className="odd:bg-gray-800 even:bg-gray-700/50">
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.position}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">{player.name}</td>
                      <td className="text-center py-2.5 px-2.5 border-b border-gray-600 text-sm">${player.salary.toLocaleString()}M</td>
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
            Budget: (${currentTeamSalaryCap.used.toLocaleString()}M used / ${currentTeamSalaryCap.totalBudget.toLocaleString()}M)
            <br />
            Current Cap Stage: <span className="text-purple-400">{getCapStage(currentTeamSalaryCap.used)}</span>
          </div>
          <div className="w-full bg-gray-700 h-4 rounded-lg overflow-hidden relative">
            <div
              className="h-full bg-purple-600 rounded-l-lg transition-all duration-300"
              style={{ width: `${(currentTeamSalaryCap.used / currentTeamSalaryCap.totalBudget) * 100}%` }}
            ></div>
          </div>
          <div className="mt-4 text-[0.95rem] text-gray-400 space-y-2">
            <div>
              <strong className="text-purple-300">Tier 1 (Over Soft Cap $140M, max 31M taxable):</strong>{" "}
              ${Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000).toLocaleString()}M taxed at 1.5× = ${(Math.min(Math.max(payroll - SALARY_CAP_RULES.softCap, 0), 31000000) * 1.5).toLocaleString()}M
            </div>
            <div>
              <strong className="text-purple-300">Tier 2 (From $178M to $189M, max 11M taxable):</strong>{" "}
              ${Math.min(Math.max(payroll - SALARY_CAP_RULES.firstApron, 0), 11000000).toLocaleString()}M taxed at 2× = ${(Math.min(Math.max(payroll - SALARY_CAP_RULES.firstApron, 0), 11000000) * 2).toLocaleString()}M
            </div>
            <div>
              <strong className="text-purple-300">Tier 3 (Above $189M):</strong>{" "}
              ${Math.max(payroll - SALARY_CAP_RULES.hardCap, 0).toLocaleString()}M taxed at 3× = ${(Math.max(payroll - SALARY_CAP_RULES.hardCap, 0) * 3).toLocaleString()}M
            </div>
            <div>
              <strong className="text-purple-300">Total Tax:</strong> ${(tier1Tax + tier2Tax + tier3Tax).toLocaleString()}M
            </div>
          </div>
        </div>
        <button 
          onClick={handleNextTeam} 
          className="mt-6 py-2.5 px-6 text-base font-semibold text-white bg-purple-600 border-none rounded-lg cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-purple-900/50 hover:bg-purple-700"
        >
          Next Team
        </button>
      </section>
                  
    </div>
  );
};

export default PracticeFantasyDraft;
