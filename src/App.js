//APP.JS
 
//import react, useState for state management and useEffect
import React, { useState, useEffect } from "react";

//router components for client side routing
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

//importing css for styling
import './App.css';

//importing components for different pages
import HomePage from "./HomePage";
import PlayerDashboard from "./PlayerDashboard"; 
import PlayerTradeMachine from "./PlayerTradeMachine"; 
import PlayerDashboardMatchup from "./PlayerDashboardMatchup"; 
import PlayerLeague from "./PlayerLeague"; 
import FreeAgents from "./FreeAgents"; 
import PlayerDashboardRoster from "./PlayerDashboardRoster"; 
import LoginPage from "./LoginPage"; 
import PrivateDashboard from "./PrivateDashboard"; 
import PracticeDraft from "./PracticeFantasyDraft"; 
import LiveDraftPage from "./LiveDraftPage"; 

//App function
//This is the main component of the application
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  //checks if the user is logged in by making a fetch request to the server
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

  // Returns the user interface based on the login status
  // If the user is logged in, it shows the dashboard and other components
  return (
    <div className="App bg-gray-900">
      
        <Router>
        
          <main style={{ paddingBottom: '60px' }}>
            <Routes>
              {/* Public route: Home page */}
              <Route path="/" element={<HomePage />} />
              {/* Private routes */}
              <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} />} />
              <Route path="/player-dashboard" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboard /></PrivateDashboard>} />
              <Route path="/player-matchup" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboardMatchup /></PrivateDashboard>} />
              <Route path="/player-roster" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerDashboardRoster /></PrivateDashboard>} />
              <Route path="/player-trade-machine" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerTradeMachine /></PrivateDashboard>} />
              <Route path="/player-league" element={<PrivateDashboard isLoggedIn={isLoggedIn}><PlayerLeague /></PrivateDashboard>} />
              <Route path="/free-agents" element={<PrivateDashboard isLoggedIn={isLoggedIn}><FreeAgents /></PrivateDashboard>} />
              {/* Public routes: Draft Component does not need validation is user logged in */}
              <Route path="/practice-draft" element={<PracticeDraft />} />
              <Route path="/live-draft-page" element={<LiveDraftPage />} />
            </Routes>
          </main>
        </Router>
      {/* Footer Area */}
      <footer className="bg-gray-800 border-t border-gray-700 px-8 py-4 flex gap-6 justify-center text-gray-400 mt-10">
        
        <span className="cursor-pointer hover:text-purple-400 transition-colors duration-200">&copy; {new Date().getFullYear()} NBA Real GM</span>
        
      </footer>
    </div>
  );
}

//Exporting the App component
export default App;