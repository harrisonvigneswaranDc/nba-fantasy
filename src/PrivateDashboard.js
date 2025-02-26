import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

    const PrivateRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
  
    useEffect(() => {
      // Check if user is authenticated by calling your profile endpoint
      fetch("http://localhost:3001/profile", {
        credentials: "include", // ensures cookies are sent
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
  
    if (loading) return <div>Loading...</div>;
  
    return authenticated ? children : <Navigate to="/login" />;
  };
  
  export default PrivateRoute;