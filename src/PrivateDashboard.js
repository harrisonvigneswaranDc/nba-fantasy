// Import React and other necessary libraries
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

//State to indicate if the user is authenticated
    const PrivateRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

  // Fetch the profile data from the backend to verify authentication.
    useEffect(() => {
      // Check if user is authenticated by calling your profile endpoint
      fetch("http://localhost:3001/profile", {
        credentials: "include", 
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Not authenticated");
        })
        .then((data) => {
          setAuthenticated(true);
        })
        .catch((err) => {
          setAuthenticated(false);
        })
        .finally(() => setLoading(false));
    }, []);

// While the authentication check is in progress wich in turn displays a loading message
    if (loading) return <div>Loading...</div>;
  
    return authenticated ? children : <Navigate to="/login" />;
  };
  
  export default PrivateRoute;