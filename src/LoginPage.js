import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "./Header";

function LoginPage() {
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); 

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
      credentials: "include", 
      body: JSON.stringify({ username, password }),
    })
      .then((response) => {
        if (!response.ok) {
          
          throw new Error("Invalid username or password");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Login successful:", data);
        

       
        navigate("/player-dashboard");
      })
      .catch((error) => {
        console.error("Error logging in:", error);
        setError(error.message);
      });
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <Header />
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] px-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 w-full max-w-md shadow-lg hover:shadow-purple-900/20 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-center text-purple-400">Login</h2>
          {error && <p className="text-red-500 text-center mb-4 bg-red-900/20 py-2 px-3 rounded-md">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-gray-300 font-semibold">Username:</label>
              <input 
                type="text" 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-gray-300 font-semibold">Password:</label>
              <input 
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full py-2 px-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 placeholder-gray-400"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-2.5 px-5 mt-6 text-base font-semibold text-white bg-purple-600 border-none rounded-md cursor-pointer shadow-md transition-all duration-200 hover:translate-y-[-2px] hover:shadow-purple-900/50 hover:bg-purple-700"
            >
              Login
            </button>
          </form>
        </div>
      </div>
     
    </div>
  );
}

export default LoginPage;
