import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./FreeAgents.css";
import Header from "./Header";

function FreeAgents() {
  const [players, setPlayers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [error, setError] = useState("");

  // Replace with your method of determining the logged in user's team ID.
  const userTeamId = 1; // Example team id

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

  // Filter players based on search query
  const filteredPlayers = players.filter((player) =>
    player.player.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by position
  const filteredByPosition = filteredPlayers.filter((player) => {
    if (!positionFilter) return true;
    return player.pos === positionFilter;
  });

  // Sorting based on selected stat key (if provided)
  const sortedPlayers = filteredByPosition.sort((a, b) => {
    if (!sortType) return 0;
    return b[sortType] - a[sortType];
  });

  // Pagination logic
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

  // Handler for the ADD button
  // In FreeAgents.js
const handleAddFreeAgent = async (player) => {
  try {
    // Determine the contract amount based on salary rules.
    // For free agents with a salary >= 178000000, only a 5M contract is allowed.
    // Otherwise, the contract amount is set to the player's salary.
    let contractAmount = Number(player.salary);
    if (contractAmount >= 178000000) {
      contractAmount = 5000000;
    }
    // Create the payload for updating the roster.
    const payload = {
      team_id: userTeamId,
      player_id: player.player_id,
      contract_amount: contractAmount,
      // Set the default category for a new free agent addition.
      category: "reserve"
    };

    // Call the API to update the roster.
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
    // Optionally, update local state to remove the player from the free agents list.
  } catch (err) {
    console.error("Error adding free agent:", err);
    alert("Error adding free agent: " + err.message);
  }
};


  return (
    <div className="free-agents-page">
      <Header />

      {/* Search / Filters Row */}
      <div className="filters-row">
        <input
          type="text"
          placeholder="Search Player..."
          className="search-input"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <select
          className="select-filter"
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
          className="select-sort"
          value={sortType}
          onChange={handleSortChange}
        >
          <option value="">Sort by Stat</option>
          <option value="pts">PTS</option>
          <option value="rb">REB</option>
          <option value="ast">AST</option>
        </select>
        <button className="refresh-btn" onClick={resetEv}>
          Refresh
        </button>
      </div>

      {/* Table of Free Agents */}
      <div className="free-agents-table-container">
        <table className="free-agents-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>PLAYER</th>
              <th>SALARY</th>
              <th>STATUS</th>
              <th>POSITION</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>TOV</th>
              <th>ADD</th>
            </tr>
          </thead>
          <tbody>
            {currentPlayers.map((player, index) => (
              <tr key={player.player_id}>
                <td>{index + 1}</td>
                <td>{player.player}</td>
                <td>${player.salary}</td>
                <td>Active</td>
                <td>{player.pos}</td>
                <td>{player.pts}</td>
                <td>{player.rb}</td>
                <td>{player.ast}</td>
                <td>{player.stl}</td>
                <td>{player.blk}</td>
                <td>{player.tov}</td>
                <td>
                  <button
                    className="add-btn"
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

      {/* Table Footer / Pagination */}
      <div className="table-footer">
        <button
          className="nav-btn"
          onClick={previousPage}
          disabled={currentPage === 1}
        >
          &larr; Previous 25
        </button>
        <button
          className="nav-btn"
          onClick={nextPage}
          disabled={currentPage === totalPages}
        >
          Next 25 &rarr;
        </button>
      </div>

      {/* Disclaimer / Additional Info */}
      <div className="disclaimer-box">
        <p>
          <strong>WHEN ADDING A PLAYER:</strong>
        </p>
        <ul>
          <li>
            - If the roster is full, a pop-up appears with “Select a player to drop.”
          </li>
          <li>
            - If any rules (e.g. salary cap or roster size) are violated, a warning is shown.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default FreeAgents;
