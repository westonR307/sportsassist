import { Request, Response, Express } from "express";
import { pool } from "./db";

export function registerDebugRoutes(app: Express) {
  // Debug SQL query endpoint (only for development)
  app.post("/api/debug/sql-query", async (req: Request, res: Response) => {
    // Make sure user is authenticated and is admin or camp_creator
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Only allow certain roles to use this endpoint
    if (req.user?.role !== "camp_creator" && req.user?.role !== "platform_admin") {
      return res.status(403).json({ error: "Not authorized to run SQL queries" });
    }
    
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }
      
      // Only allow SELECT queries for security
      if (!query.trim().toLowerCase().startsWith("select")) {
        return res.status(403).json({ error: "Only SELECT queries are allowed" });
      }
      
      // Run the query
      console.log("Running debug SQL query:", query);
      const result = await pool.query(query);
      
      return res.json(result.rows);
    } catch (error) {
      console.error("Error executing debug SQL query:", error);
      return res.status(500).json({ error: "Error executing SQL query" });
    }
  });
}