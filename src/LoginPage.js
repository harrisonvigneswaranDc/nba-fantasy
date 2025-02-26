import React, { useState } from 'react';
import './LoginPage.css';
import { useNavigate } from 'react-router-dom';
import Header from "./Header";

function LoginPage() {
  // State to store username, password, and any error messages.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // For redirecting upon successful login

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!username || !password) {
      setError('Please fill in both fields');
      return;
    }
    setError('');

    // Send login credentials to the server
    fetch("http://localhost:3001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for sending cookies (sessions)
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        if (!response.ok) {
          // If the response is not OK, throw an error to be caught below
          throw new Error("Invalid username or password");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Login successful:", data);
        // Optionally, you can save user info in a global state here

        // Redirect the user to a protected route (e.g., PlayerDashboard)
        navigate("/player-dashboard");
      })
      .catch((error) => {
        console.error("Error logging in:", error);
        setError(error.message);
      });
  };

  return (
    <div>
    <Header />
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input 
              type="text" 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
    </div>
  </div>
  );
}

export default LoginPage;
