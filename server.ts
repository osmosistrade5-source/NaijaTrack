import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import { getAdminDb } from "./src/server/config/firebase-admin";
import apiRoutes from "./src/server/routes/index";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Seed Admin Wallet in Firestore
  const seedAdmin = async () => {
    try {
      const dbInstance = getAdminDb();
      const adminWalletRef = dbInstance.collection("admin_wallets").doc("main");
      const doc = await adminWalletRef.get();
      if (!doc.exists) {
        await adminWalletRef.set({
          totalEarnings: 0,
          subscriptionRevenue: 0,
          commissionRevenue: 0,
          updatedAt: new Date().toISOString()
        });
        console.log("Admin wallet seeded in Firestore");
      }
    } catch (error: any) {
      console.error("Failed to seed admin wallet:", error);
    }
  };
  await seedAdmin();

  // WebSocket connection handling
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // API Routes
  app.use("/api", apiRoutes);

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
