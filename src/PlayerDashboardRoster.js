import React, { useEffect, useState } from "react";
import "./PlayerDashboardRoster.css";
import Header from "./Header";

function PlayerDashboardRoster() {
  // STATES
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [seasonRange, setSeasonRange] = useState({
    season_start: "",
    season_end: "",
    league_name: ""
  });
  const [rosterLocked, setRosterLocked] = useState(false);

  // SALARY CAP SETTINGS
  const SALARY_CAP_RULES = {
    softCap: 140000000,
    firstApron: 178000000,
    hardCap: 189000000,
    totalBudget: 300000000
  };

  // CALCULATE PAYROLL AND TAXES
  const payroll = roster.reduce((sum, p) => sum + Number(p.salary || 0), 0);
  const tier1Excess = payroll > SALARY_CAP_RULES.softCap ? Math.min(payroll - SALARY_CAP_RULES.softCap, 31000000) : 0;
  const tier1Tax = tier1Excess * 1.5;
  const tier2Excess = payroll > SALARY_CAP_RULES.firstApron ? Math.min(payroll - SALARY_CAP_RULES.firstApron, 11000000) : 0;
  const tier2Tax = tier2Excess * 2;
  const tier3Excess = payroll > SALARY_CAP_RULES.hardCap ? payroll - SALARY_CAP_RULES.hardCap : 0;
  const tier3Tax = tier3Excess * 3;
  const totalTax = tier1Tax + tier2Tax + tier3Tax;

  const capStage = payroll <= SALARY_CAP_RULES.softCap
    ? "Below Soft Cap"
    : payroll <= SALARY_CAP_RULES.firstApron
    ? "Soft Cap"
    : payroll <= SALARY_CAP_RULES.hardCap
    ? "First Apron"
    : "Second Apron (Hard Cap)";

  const getCapColor = (payroll) => {
    if (payroll <= SALARY_CAP_RULES.softCap) return "bg-green-500";
    if (payroll <= SALARY_CAP_RULES.firstApron) return "bg-yellow-500";
    if (payroll <= SALARY_CAP_RULES.hardCap) return "bg-orange-500";
    return "bg-red-500";
  };

  // FETCH LEAGUE INFO
  useEffect(() => {
    fetch("http://localhost:3001/league-info", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch league info");
        return res.json();
      })
      .then((leagueInfo) => {
        const seasonStart = new Date(leagueInfo.season_start)
          .toISOString()
          .slice(0, 10);
        const seasonEnd = new Date(leagueInfo.season_end)
          .toISOString()
          .slice(0, 10);
        setSeasonRange({
          season_start: seasonStart,
          season_end: seasonEnd,
          league_name: leagueInfo.league_name,
        });
        setSelectedDate(seasonStart);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Error fetching league info");
      });
  }, []);

  // FETCH ROSTER LOCK STATUS for a given date
  const fetchLockStatus = (date) => {
    fetch(`http://localhost:3001/roster/is-locked?gameDate=${date}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch lock status");
        return res.json();
      })
      .then((data) => {
        setRosterLocked(data.isLocked);
      })
      .catch((err) => {
        console.error("Error checking lock status:", err);
      });
  };

  // FETCH ROSTER FOR SELECTED DATE
  const fetchRoster = (date) => {
    setLoading(true);
    fetch(`http://localhost:3001/roster?gameDate=${date}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch roster");
        return res.json();
      })
      .then((data) => setRoster(data))
      .catch((error) => {
        console.error("Error fetching roster:", error);
        setErrorMsg("Error fetching roster");
      })
      .finally(() => setLoading(false));
  };

  // Combined effect to fetch both lock status and roster whenever THE DATE CHANGES
  useEffect(() => {
    if (!selectedDate) return;
    fetchLockStatus(selectedDate);
    fetchRoster(selectedDate);
  }, [selectedDate]);

  // Roster filters by category
  const starters = roster.filter((player) => player.category === "starter");
  const bench = roster.filter((player) => player.category === "bench");
  const reserve = roster.filter((player) => player.category === "reserve");

  // Handler for editing player category UNLESS ITS LOCKED
  const handleChangeCategory = (playerId, newCategory) => {
    if (rosterLocked) return;
    fetch("http://localhost:3001/roster/category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ playerId, newCategory, gameDate: selectedDate }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update player category.");
        return res.json();
      })
      .then(() => {
        fetchRoster(selectedDate);
      })
      .catch((error) => console.error("Error updating category:", error));
  };

  // Handle remove a player
  const handleRemovePlayer = (playerId) => {
    if (rosterLocked) return;
    fetch("http://localhost:3001/roster/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ playerId, gameDate: selectedDate }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to remove player");
        return res.json();
      })
      .then(() => {

        fetchRoster(selectedDate);
      })
      .catch((error) => console.error("Error removing player:", error));
  };

  // Save lineup 
  const handleSaveLineup = () => {
    setErrorMsg("");
    if (starters.length !== 5) {
      setErrorMsg("You must have exactly 5 starters.");
      return;
    }
    if (bench.length !== 4) {
      setErrorMsg("You must have exactly 4 bench players.");
      return;
    }
    if (reserve.length !== 6) {
      setErrorMsg("You must have exactly 6 reserve players.");
      return;
    }
    fetch("http://localhost:3001/roster/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roster, gameDate: selectedDate }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save lineup");
        return res.json();
      })
      .then(() => {
        alert(`Lineup saved successfully for ${selectedDate}!`);
        fetchRoster(selectedDate);
      })
      .catch((error) => {
        console.error("Error saving lineup:", error);
        setErrorMsg("Error saving lineup. Please try again.");
      });
  };

  // Date navigation 
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().slice(0, 10);
    if (newDate >= seasonRange.season_start) {
      setSelectedDate(newDate);
    }
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().slice(0, 10);
    if (newDate <= seasonRange.season_end) {
      setSelectedDate(newDate);
    }
  };

  if (loading) return <div className="bg-gray-900 text-gray-300 p-4 text-center">Loading roster...</div>;

  return (
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />

      {/* League Info/Date Selection */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
          <div className="text-gray-200">
            <p>
              <span className="font-semibold text-purple-300">Season:</span> {seasonRange.season_start} to {seasonRange.season_end} <br />
              <span className="font-semibold text-purple-300">League:</span> {seasonRange.league_name}
            </p>
          </div>
          {rosterLocked && (
            <span className="text-red-400 font-semibold bg-red-900/20 py-1 px-3 rounded-md">
              Roster is locked for this game (finalized).
            </span>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevDay} 
              disabled={selectedDate === seasonRange.season_start}
              className="px-3 py-1 bg-gray-700 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              min={seasonRange.season_start}
              max={seasonRange.season_end}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1 px-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-purple-500 focus:outline-none"
            />
            <button 
              onClick={handleNextDay} 
              disabled={selectedDate === seasonRange.season_end}
              className="px-3 py-1 bg-gray-700 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ▶
            </button>
          </div>
          
        </div>
      </div>

      {/* Salary Cap Card */}
      <div className="max-w-6xl mx-auto mb-6 bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-3 text-purple-400">Salary Cap Details</h3>
          <div className="flex flex-col md:flex-row justify-between mb-2">
            <p className="text-gray-200">
              <span className="font-semibold text-purple-300">Salary Cap:</span>
              <span> (${payroll.toLocaleString()} / ${SALARY_CAP_RULES.totalBudget.toLocaleString()})</span>
            </p>
            <p className="text-gray-200">
              <span className="font-semibold text-purple-300">Current Cap Stage:</span> 
              <span className={`ml-1 px-2 py-0.5 rounded ${
                capStage === "Below Soft Cap" ? "bg-green-900/30 text-green-400" :
                capStage === "Soft Cap" ? "bg-yellow-900/30 text-yellow-400" :
                capStage === "First Apron" ? "bg-orange-900/30 text-orange-400" :
                "bg-red-900/30 text-red-400"
              }`}>
                {capStage}
              </span>
            </p>
          </div>
          <div className="w-full h-4 bg-gray-700 rounded-lg overflow-hidden mt-2 relative">
            {/* Add cap threshold markers */}
            <div className="absolute top-0 bottom-0 border-l border-gray-300 border-dashed" 
                 style={{ left: `${(SALARY_CAP_RULES.softCap / SALARY_CAP_RULES.totalBudget) * 100}%` }}></div>
            <div className="absolute top-0 bottom-0 border-l border-gray-300 border-dashed" 
                 style={{ left: `${(SALARY_CAP_RULES.firstApron / SALARY_CAP_RULES.totalBudget) * 100}%` }}></div>
            <div className="absolute top-0 bottom-0 border-l border-gray-300 border-dashed" 
                 style={{ left: `${(SALARY_CAP_RULES.hardCap / SALARY_CAP_RULES.totalBudget) * 100}%` }}></div>
            <div
              className={`h-full rounded-l-lg transition-all duration-300 ${getCapColor(payroll)}`}
              style={{
                width: `${(payroll / SALARY_CAP_RULES.totalBudget) * 100}%`
              }}
            ></div>
          </div>
          <div className="relative text-xs text-gray-400 mt-1">
            <span className="absolute left-0">$0</span>
            <span className="absolute" style={{ left: `${(SALARY_CAP_RULES.softCap / SALARY_CAP_RULES.totalBudget) * 100}%`, transform: 'translateX(-50%)' }}>Soft Cap</span>
            <span className="absolute" style={{ left: `${(SALARY_CAP_RULES.firstApron / SALARY_CAP_RULES.totalBudget) * 100}%`, transform: 'translateX(-80%)' }}>First Apron</span>
            <span className="absolute" style={{ left: `${(SALARY_CAP_RULES.hardCap / SALARY_CAP_RULES.totalBudget) * 100}%`, transform: 'translateX(-20%)' }}>Hard Cap</span>
            <span className="absolute right-0">${SALARY_CAP_RULES.totalBudget.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-purple-300 mb-3">Luxury Tax Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg border ${tier1Excess > 0 ? 'bg-green-900/20 border-green-700' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-sm font-medium mb-1 text-gray-300">Tier 1 (1.5×)</div>
              <div className="text-white mb-2 font-bold">${tier1Excess.toLocaleString()}</div>
              <div className="text-sm flex justify-between">
                <span className="text-gray-400">Tax:</span> 
                <span className={`font-semibold ${tier1Tax > 0 ? 'text-green-400' : 'text-gray-500'}`}>${tier1Tax.toLocaleString()}</span>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border ${tier2Excess > 0 ? 'bg-yellow-900/20 border-yellow-700' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-sm font-medium mb-1 text-gray-300">Tier 2 (2×)</div>
              <div className="text-white mb-2 font-bold">${tier2Excess.toLocaleString()}</div>
              <div className="text-sm flex justify-between">
                <span className="text-gray-400">Tax:</span> 
                <span className={`font-semibold ${tier2Tax > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>${tier2Tax.toLocaleString()}</span>
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border ${tier3Excess > 0 ? 'bg-red-900/20 border-red-700' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-sm font-medium mb-1 text-gray-300">Tier 3 (3×)</div>
              <div className="text-white mb-2 font-bold">${tier3Excess.toLocaleString()}</div>
              <div className="text-sm flex justify-between">
                <span className="text-gray-400">Tax:</span> 
                <span className={`font-semibold ${tier3Tax > 0 ? 'text-red-400' : 'text-gray-500'}`}>${tier3Tax.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center p-3 bg-purple-900/30 rounded-lg border border-purple-700">
            <span className="text-purple-300 font-semibold">Total Tax Owed:</span>
            <span className="text-2xl font-bold text-white">${totalTax.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Roster Sections */}
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          {/* Starters */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-purple-400">Starters (Max 5)</h3>
            <ul className="space-y-2">
              {starters.length > 0 ? (
                starters.map((player) => (
                  <li key={player.player_id} className="flex justify-between items-center bg-gray-700/60 border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-200">
                      <strong>{player.player_name}</strong> ({player.pos}) - ${Number(player.salary).toLocaleString()}
                    </div>
                    {!rosterLocked && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRemovePlayer(player.player_id)}
                          className="py-1 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          REMOVE
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "bench")}
                          className="py-1 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          BENCH
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "reserve")}
                          className="py-1 px-3 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                        >
                          DNP
                        </button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-400 italic">No starters assigned</li>
              )}
            </ul>
          </div>

          {/* Bench */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-purple-400">Bench (Max 4)</h3>
            <ul className="space-y-2">
              {bench.length > 0 ? (
                bench.map((player) => (
                  <li key={player.player_id} className="flex justify-between items-center bg-gray-700/60 border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-200">
                      <strong>{player.player_name}</strong> ({player.pos}) - ${Number(player.salary).toLocaleString()}
                    </div>
                    {!rosterLocked && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRemovePlayer(player.player_id)}
                          className="py-1 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          REMOVE
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "starter")}
                          className="py-1 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          START
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "reserve")}
                          className="py-1 px-3 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                        >
                          DNP
                        </button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-400 italic">No bench players assigned</li>
              )}
            </ul>
          </div>

          {/* Reserve */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-purple-400">DNP / Reserve (Max 6)</h3>
            <ul className="space-y-2">
              {reserve.length > 0 ? (
                reserve.map((player) => (
                  <li key={player.player_id} className="flex justify-between items-center bg-gray-700/60 border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-200">
                      <strong>{player.player_name}</strong> ({player.pos}) - ${Number(player.salary).toLocaleString()}
                    </div>
                    {!rosterLocked && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRemovePlayer(player.player_id)}
                          className="py-1 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          REMOVE
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "bench")}
                          className="py-1 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          BENCH
                        </button>
                        <button 
                          onClick={() => handleChangeCategory(player.player_id, "starter")}
                          className="py-1 px-3 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                        >
                          START
                        </button>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-400 italic">No reserve players assigned</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Save Lineup Button */}
      {!rosterLocked && (
        <div className="max-w-6xl mx-auto mt-6 text-center">
          <button 
            className="py-2.5 px-6 text-base font-semibold text-white bg-purple-600 border-none rounded-lg cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-purple-900/50 hover:bg-purple-700"
            onClick={handleSaveLineup}
          >
            Save Lineup
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="max-w-6xl mx-auto mt-4 text-center text-red-500 p-3 bg-red-900/20 rounded-lg">
          {errorMsg}
        </div>
      )}
      
    </div>
  );
}

export default PlayerDashboardRoster;
