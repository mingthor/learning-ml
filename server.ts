console.log("SERVER.TS IS STARTING...");
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  console.log("Starting server...");

  // Initialize SQLite
  console.log("Initializing SQLite...");
  let db: any;
  try {
    db = await open({
      filename: "./stats.db",
      driver: sqlite3.Database,
    });
    console.log("SQLite connected.");
  } catch (error) {
    console.error("Failed to connect to SQLite:", error);
    process.exit(1);
  }

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS question_stats (
      id TEXT PRIMARY KEY,
      viewCount INTEGER DEFAULT 0,
      skipCount INTEGER DEFAULT 0,
      mastery INTEGER DEFAULT 0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("SQLite table checked/created.");

  // API Routes
  app.get("/api/stats", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM question_stats");
      const stats: Record<string, any> = {};
      rows.forEach((row) => {
        stats[row.id] = {
          viewCount: row.viewCount,
          skipCount: row.skipCount,
          mastery: row.mastery,
          updatedAt: row.updatedAt,
        };
      });
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/stats/:id/view", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run(
        `INSERT INTO question_stats (id, viewCount) VALUES (?, 1)
         ON CONFLICT(id) DO UPDATE SET viewCount = viewCount + 1, updatedAt = CURRENT_TIMESTAMP`,
        [id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to increment view count" });
    }
  });

  app.post("/api/stats/:id/skip", async (req, res) => {
    const { id } = req.params;
    try {
      await db.run(
        `INSERT INTO question_stats (id, skipCount) VALUES (?, 1)
         ON CONFLICT(id) DO UPDATE SET skipCount = skipCount + 1, updatedAt = CURRENT_TIMESTAMP`,
        [id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to increment skip count" });
    }
  });

  app.post("/api/stats/:id/mastery", async (req, res) => {
    const { id } = req.params;
    const { score } = req.body;
    try {
      await db.run(
        `INSERT INTO question_stats (id, mastery) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET mastery = ?, updatedAt = CURRENT_TIMESTAMP`,
        [id, score, score]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update mastery score" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
