//import react, useState for state management and useEffect
import React, { useEffect, useState } from 'react';

// Import Link for navigation and useNavigate hook for routing
import { Link, useNavigate } from 'react-router-dom';

// define the Header component
const Header = () => {
  // State to manage user authentication status
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  // Fetch the current user profile 
  useEffect(() => {
    const fetchCurrentUser = async (retryCount = 0) => {
      try {
        // Make a fetch request to the backend profile endpoint
        const res = await fetch(`http://localhost:3001/profile`, {
          credentials: 'include'
        });
        console.log(res);
        if (res.status === 401) {
          setUser(null);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch user');
        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error(err);
        if (retryCount < 3) {
          setTimeout(() => fetchCurrentUser(retryCount + 1), 1000 * (retryCount + 1));
        }
      }
    };
    fetchCurrentUser();
  }, []);

// Function to handle user logout
  const handleLogout = () => {
    // Send a request to the backend logout endpoint
    fetch("http://localhost:3001/logout", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          setUser(null);
          // Redirect to login page after logout
          navigate("/login");
        } else {
          throw new Error("Logout failed");
        }
      })
      .catch((err) => {
        console.error("Logout error:", err);
      });
  };

  // Render the header with navigation links and user info
  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 text-gray-200 shadow-md">
      <div className="container mx-auto">
        <nav className="flex items-center justify-between">
          {/* left side*/}
          <div className="flex items-center">
            <Link className="text-xl font-bold text-purple-400 hover:text-purple-300 transition-colors duration-200" to="/">
              NBA Fantasy
            </Link>
          </div>
          
          {/* nav links */}
          <div className="hidden md:flex space-x-6">
            {/* Home link always visible */}
            <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/">Home</Link>
             {/* if logged in it renders link */}
            {user && (
              <>
                <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/player-dashboard">Dashboard</Link>
                <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/player-matchup">Matchups</Link>
                <Link className="text-gray-300 hover:text-purple-400 transition-colors duration-200" to="/player-roster">Roster</Link>
              </>
            )}
          </div>
          
          {/* right side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="hidden md:inline text-sm text-gray-400">Welcome, {user.name || 'User'}</span>
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-semibold shadow-md hover:shadow-purple-900/50"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-semibold shadow-md hover:shadow-purple-900/50"
                  to="/login"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
