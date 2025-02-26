import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async (retryCount = 0) => {
      try {
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

  const handleLogout = () => {
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

  return (
    <header className="app-header">
      <nav className="navbar">
        {/* Always show Home link */}
        <Link className="nav-link" to="/">Home</Link>
        
        {/* Conditionally show links when logged in */}
        {user ? (
          <>
            <Link className="nav-link" to="/player-dashboard">Player Dashboard</Link>
            <Link className="nav-link" to="/profile">Profile</Link>
            <button className="nav-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">Login</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
