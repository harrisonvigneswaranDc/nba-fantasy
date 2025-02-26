import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

import HomePage from "./HomePage";
import Header from "./Header";
import PlayerDashboard from "./PlayerDashboard"; 
import PlayerTradeMachine from "./PlayerTradeMachine"; 
import PlayerDashboardMatchup from "./PlayerDashboardMatchup"; 
import PlayerLeague from "./PlayerLeague"; 
import FreeAgents from "./FreeAgents"; 
import PlayerDashboardRoster from "./PlayerDashboardRoster"; 
import LoginPage from "./LoginPage"; 
import PrivateDashboard from "./PrivateDashboard"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/profile", { credentials: "include" })
      .then((res) => {
        console.log("Profile response status:", res.status);
        if (res.ok) {
          return res.json();
        }
        throw new Error("Not authenticated");
      })
      .then((data) => {
        console.log("Profile data:", data);
        setIsLoggedIn(true);
      })
      .catch((err) => {
        console.log("Profile error:", err);
        setIsLoggedIn(false);
      });
  }, []);

  const handleLogout = () => {
    fetch("http://localhost:3001/logout", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          setIsLoggedIn(false);
        } else {
          throw new Error("Logout failed");
        }
      })
      .catch((err) => {
        console.error("Logout error:", err);
      });
  };

  return (
    <div className="App">
      
        <Router>
          
          <main style={{ paddingBottom: '60px' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
              <Route path="/player-dashboard" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboard /></PrivateDashboard>} />
              <Route path="/player-matchup" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboardMatchup /></PrivateDashboard>} />
              <Route path="/player-roster" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboardRoster /></PrivateDashboard>} />
              <Route path="/player-trade-machine" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerTradeMachine /></PrivateDashboard>} />
              <Route path="/player-league" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerLeague /></PrivateDashboard>} />
              <Route path="/free-agents" element={<PrivateDashboard isLoggedIn={isLoggedIn}><FreeAgents /></PrivateDashboard>} />
            </Routes>
          </main>
        </Router>

    </div>
  );
}

export default App;