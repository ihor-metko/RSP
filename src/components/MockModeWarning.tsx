// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// This component displays a warning banner when mock mode is active (development only)
// See TODO_MOCK_CLEANUP.md for removal instructions.

"use client";

import { useEffect, useState } from "react";

export function MockModeWarning() {
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== "production") {
      console.log("MockModeWarning: Checking mock mode status...", process.env.USE_MOCK_DATA);
      setIsMockMode(process.env.USE_MOCK_DATA === "true");
    }
  }, []);

  if (!isMockMode || process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div
      className="im-warning-banner"
      style={{
        backgroundColor: "#ff9800",
        color: "#000",
        padding: "8px 16px",
        textAlign: "center",
        zIndex: 9999,
        fontWeight: "bold",
        fontSize: "14px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      ⚠️ MOCK DATA MODE ACTIVE - Using simulated data instead of real database
    </div>
  );
}
