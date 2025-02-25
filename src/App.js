import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

import HomePage from "./HomePage";
import PlayerDashboard from "./PlayerDashboard"; 
import PlayerTradeMachine from "./PlayerTradeMachine"; 
import PlayerDashboardMatchup from "./PlayerDashboardMatchup"; 
import PlayerLeague from "./PlayerLeague"; 
import FreeAgents from "./FreeAgents"; 
import PlayerDashboardRoster from "./PlayerDashboardRoster"; 

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Router>
          <Routes>
            {/* Existing Home Page route */}
            <Route path="/" element={<HomePage />} />

            {/* New Player Dashboard route */}
            <Route path="/player-dashboard" element={<PlayerDashboard />} />
            <Route path="/player-matchup" element={<PlayerDashboardMatchup />} />
            <Route path="/player-roster" element={<PlayerDashboardRoster />} />
            <Route path="/player-trade-machine" element={<PlayerTradeMachine />} />
            <Route path="/player-league" element={<PlayerLeague />} />
            <Route path="/free-agents" element={<FreeAgents />} />
          </Routes>
        </Router>
      </header>
    </div>
  );
}

export default App;

