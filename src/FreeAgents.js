import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";

function FreeAgents() {
  const [players, setPlayers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [error, setError] = useState("");


  const userTeamId = 1; 

  useEffect(() => {
    fetch("http://localhost:3001/freeagents", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setPlayers(data))
      .catch((error) =>
        console.error("Error fetching free agents:", error)
      );
  }, []);

  const filteredPlayers = players.filter((player) =>
    player.player.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredByPosition = filteredPlayers.filter((player) => {
    if (!positionFilter) return true;
    return player.pos === positionFilter;
  });


  const sortedPlayers = filteredByPosition.sort((a, b) => {
    if (!sortType) return 0;
    return b[sortType] - a[sortType];
  });


  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPlayers = sortedPlayers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedPlayers.length / pageSize);

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePositionFilterChange = (e) => {
    setPositionFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortType(e.target.value);
    setCurrentPage(1);
  };

  const resetEv = () => {
    setSearchQuery("");
    setPositionFilter("");
    setSortType("");
    setCurrentPage(1);
  };


  const handleAddFreeAgent = async (player) => {
    try {

      let contractAmount = Number(player.salary);
      if (contractAmount >= 178000000) {
        contractAmount = 5000000;
      }

      const payload = {
        team_id: userTeamId,
        player_id: player.player_id,
        contract_amount: contractAmount,

        category: "reserve"
      };


      const updateRes = await fetch("http://localhost:3001/update-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.error || "Failed to add free agent");
      }

      alert("Player added successfully!");
 
    } catch (err) {
      console.error("Error adding free agent:", err);
      alert("Error adding free agent: " + err.message);
    }
  };


  return (
    <div className="bg-gray-900 min-h-screen font-sans p-4">
      <Header />


      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search Player..."
            className="flex-1 min-w-[200px] p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <select
            className="p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-purple-500"
            value={positionFilter}
            onChange={handlePositionFilterChange}
          >
            <option value="">Filter by Position</option>
            <option>PG</option>
            <option>SG</option>
            <option>SF</option>
            <option>PF</option>
            <option>C</option>
          </select>
          <select
            className="p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-purple-500"
            value={sortType}
            onChange={handleSortChange}
          >
            <option value="">Sort by Stat</option>
            <option value="pts">PTS</option>
            <option value="rb">REB</option>
            <option value="ast">AST</option>
          </select>
          <button 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200 shadow-md"
            onClick={resetEv}
          >
            Refresh
          </button>
        </div>


        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-x-auto mb-4 shadow-lg">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/90">
                <th className="p-3 text-left text-gray-300 font-semibold">RANK</th>
                <th className="p-3 text-left text-gray-300 font-semibold">PLAYER</th>
                <th className="p-3 text-left text-gray-300 font-semibold">SALARY</th>
                <th className="p-3 text-left text-gray-300 font-semibold">STATUS</th>
                <th className="p-3 text-left text-gray-300 font-semibold">POSITION</th>
                <th className="p-3 text-left text-gray-300 font-semibold">PTS</th>
                <th className="p-3 text-left text-gray-300 font-semibold">REB</th>
                <th className="p-3 text-left text-gray-300 font-semibold">AST</th>
                <th className="p-3 text-left text-gray-300 font-semibold">STL</th>
                <th className="p-3 text-left text-gray-300 font-semibold">BLK</th>
                <th className="p-3 text-left text-gray-300 font-semibold">TOV</th>
                <th className="p-3 text-left text-gray-300 font-semibold">ADD</th>
              </tr>
            </thead>
            <tbody>
              {currentPlayers.map((player, index) => (
                <tr 
                  key={player.player_id} 
                  className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <td className="p-3 text-gray-300">{startIndex + index + 1}</td>
                  <td className="p-3 text-gray-200 font-medium">{player.player}</td>
                  <td className="p-3 text-gray-300">${Number(player.salary).toLocaleString()}</td>
                  <td className="p-3 text-green-400">Active</td>
                  <td className="p-3 text-gray-300">{player.pos}</td>
                  <td className="p-3 text-gray-300">{player.pts}</td>
                  <td className="p-3 text-gray-300">{player.rb}</td>
                  <td className="p-3 text-gray-300">{player.ast}</td>
                  <td className="p-3 text-gray-300">{player.stl}</td>
                  <td className="p-3 text-gray-300">{player.blk}</td>
                  <td className="p-3 text-gray-300">{player.tov}</td>
                  <td className="p-3">
                    <button
                      className="bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded-md transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onClick={() => handleAddFreeAgent(player)}
                    >
                      ADD
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        <div className="flex justify-center gap-4 mb-6">
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 transition-colors shadow-md"
            onClick={previousPage}
            disabled={currentPage === 1}
          >
            &larr; Previous 25
          </button>
          <button
            className="px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 transition-colors shadow-md"
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next 25 &rarr;
          </button>
        </div>


        <div className="max-w-6xl mx-auto bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-gray-300">
          <p className="text-purple-400 font-bold mb-2">
            WHEN ADDING A PLAYER:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              If the roster is full, a pop-up appears with "Select a player to drop."
            </li>
            <li>
              If any rules (e.g. salary cap or roster size) are violated, a warning is shown.
            </li>
          </ul>
        </div>
      </div>
      
    </div>
  );
}

export default FreeAgents;
