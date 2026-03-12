import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("naijatrack.db");

// ... (Database initialization remains the same)
db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    subscription_status TEXT DEFAULT 'inactive', -- active, inactive
    last_payment_date DATETIME
  );
`);

// Migration: Add columns if they don't exist
try {
  db.exec("ALTER TABLE brands ADD COLUMN subscription_status TEXT DEFAULT 'inactive'");
} catch (e) {}
try {
  db.exec("ALTER TABLE brands ADD COLUMN last_payment_date DATETIME");
} catch (e) {}
try {
  db.exec("ALTER TABLE platform_stats ADD COLUMN balance REAL DEFAULT 0");
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS platform_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_commissions REAL DEFAULT 0,
    total_subscription_revenue REAL DEFAULT 0,
    balance REAL DEFAULT 0
  );

  INSERT OR IGNORE INTO platform_stats (id, total_commissions, total_subscription_revenue, balance) VALUES (1, 0, 0, 0);

  CREATE TABLE IF NOT EXISTS platform_withdrawals (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget REAL,
    payout_per_lead REAL,
    wa_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
  );

  CREATE TABLE IF NOT EXISTS influencers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    platform TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaign_links (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    influencer_id TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id TEXT PRIMARY KEY,
    link_id TEXT NOT NULL,
    fingerprint TEXT,
    user_agent TEXT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES campaign_links(id)
  );

  CREATE TABLE IF NOT EXISTS conversions (
    id TEXT PRIMARY KEY,
    click_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
    amount REAL,
    confirmed_at DATETIME,
    FOREIGN KEY (click_id) REFERENCES clicks(id)
  );

  CREATE TABLE IF NOT EXISTS wallets (
    influencer_id TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    total_earned REAL DEFAULT 0,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    influencer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    bank_name TEXT,
    account_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id)
  );

  -- Ensure all influencers have wallets
  INSERT OR IGNORE INTO wallets (influencer_id, balance, total_earned)
  SELECT id, 0, 0 FROM influencers;
`);

// Helper for simple random string
function generateShortCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

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

  // --- API Routes ---

  // Brands
  app.post("/api/brands", (req, res) => {
    const { name, email } = req.body;
    const id = Math.random().toString(36).substring(2, 9);
    try {
      db.prepare("INSERT INTO brands (id, name, email, subscription_status) VALUES (?, ?, ?, 'inactive')").run(id, name, email);
      res.json({ id, name, email, subscription_status: 'inactive' });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.get("/api/brands", (req, res) => {
    const brands = db.prepare("SELECT * FROM brands").all();
    res.json(brands);
  });

  app.post("/api/brands/:id/subscribe", (req, res) => {
    const { id } = req.params;
    const fee = 15000; // Monthly fee in Naira
    db.prepare(`
      UPDATE brands 
      SET subscription_status = 'active', last_payment_date = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    db.prepare("UPDATE platform_stats SET total_subscription_revenue = total_subscription_revenue + ?, balance = balance + ? WHERE id = 1").run(fee, fee);
    res.json({ success: true });
  });

  // Campaigns
  app.post("/api/campaigns", (req, res) => {
    const { brand_id, title, description, budget, payout_per_lead, wa_number } = req.body;
    const id = Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO campaigns (id, brand_id, title, description, budget, payout_per_lead, wa_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, brand_id, title, description, budget, payout_per_lead, wa_number);
    res.json({ id, brand_id, title, description, budget, payout_per_lead, wa_number });
  });

  app.get("/api/campaigns", (req, res) => {
    const campaigns = db.prepare("SELECT * FROM campaigns ORDER BY created_at DESC").all();
    res.json(campaigns);
  });

  // Influencers
  app.post("/api/influencers", (req, res) => {
    const { name, handle, platform } = req.body;
    const id = Math.random().toString(36).substring(2, 9);
    db.prepare("INSERT INTO influencers (id, name, handle, platform) VALUES (?, ?, ?, ?)").run(id, name, handle, platform);
    // Initialize wallet
    db.prepare("INSERT INTO wallets (influencer_id) VALUES (?)").run(id);
    res.json({ id, name, handle, platform });
  });

  app.get("/api/influencers", (req, res) => {
    const influencers = db.prepare("SELECT * FROM influencers").all();
    res.json(influencers);
  });

  // Wallets & Withdrawals
  app.get("/api/influencers/:id/wallet", (req, res) => {
    const { id } = req.params;
    const wallet = db.prepare("SELECT * FROM wallets WHERE influencer_id = ?").get(id);
    const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE influencer_id = ? ORDER BY created_at DESC").all(id);
    res.json({ wallet, withdrawals });
  });

  app.post("/api/withdrawals", (req, res) => {
    const { influencer_id, amount, bank_name, account_number } = req.body;
    const wallet = db.prepare("SELECT balance FROM wallets WHERE influencer_id = ?").get(influencer_id) as any;
    
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const id = Math.random().toString(36).substring(2, 9);
    const transaction = db.transaction(() => {
      db.prepare("UPDATE wallets SET balance = balance - ? WHERE influencer_id = ?").run(amount, influencer_id);
      db.prepare(`
        INSERT INTO withdrawals (id, influencer_id, amount, bank_name, account_number)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, influencer_id, amount, bank_name, account_number);
    });
    
    transaction();
    res.json({ success: true, id });
  });

  // Links
  app.post("/api/links", (req, res) => {
    const { campaign_id, influencer_id } = req.body;
    const id = Math.random().toString(36).substring(2, 9);
    const short_code = generateShortCode();
    db.prepare("INSERT INTO campaign_links (id, campaign_id, influencer_id, short_code) VALUES (?, ?, ?, ?)").run(id, campaign_id, influencer_id, short_code);
    res.json({ id, campaign_id, influencer_id, short_code });
  });

  app.get("/api/campaigns/:id/stats", (req, res) => {
    const { id } = req.params;
    const stats = db.prepare(`
      SELECT 
        i.name as influencer_name,
        cl.short_code,
        COUNT(c.id) as click_count,
        COUNT(conv.id) as conversion_count
      FROM campaign_links cl
      JOIN influencers i ON cl.influencer_id = i.id
      LEFT JOIN clicks c ON cl.id = c.link_id
      LEFT JOIN conversions conv ON c.id = conv.click_id AND conv.status = 'confirmed'
      WHERE cl.campaign_id = ?
      GROUP BY cl.id
    `).all(id);
    res.json(stats);
  });

  app.get("/api/analytics", (req, res) => {
    // CTR Trends (Clicks & Conversions per day for last 14 days)
    const trends = db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-13 days')
        UNION ALL
        SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
      )
      SELECT 
        d.date,
        COALESCE(click_counts.count, 0) as clicks,
        COALESCE(conv_counts.count, 0) as conversions
      FROM dates d
      LEFT JOIN (
        SELECT date(timestamp) as date, COUNT(*) as count 
        FROM clicks 
        GROUP BY date
      ) click_counts ON d.date = click_counts.date
      LEFT JOIN (
        SELECT date(confirmed_at) as date, COUNT(*) as count 
        FROM conversions 
        WHERE status = 'confirmed'
        GROUP BY date
      ) conv_counts ON d.date = conv_counts.date
      ORDER BY d.date ASC
    `).all();

    // Click vs Sale Ratio
    const ratio = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM clicks) as total_clicks,
        (SELECT COUNT(*) FROM conversions WHERE status = 'confirmed') as total_sales
    `).get();

    // Influencer Ranking
    const ranking = db.prepare(`
      SELECT 
        i.name,
        i.handle,
        w.total_earned,
        (
          SELECT COUNT(conv.id)
          FROM campaign_links cl
          JOIN clicks c ON cl.id = c.link_id
          JOIN conversions conv ON c.id = conv.click_id
          WHERE cl.influencer_id = i.id AND conv.status = 'confirmed'
        ) as conversions
      FROM influencers i
      JOIN wallets w ON i.id = w.influencer_id
      ORDER BY conversions DESC
      LIMIT 10
    `).all();

    res.json({ trends, ratio, ranking });
  });

  app.get("/api/admin/stats", (req, res) => {
    const stats = db.prepare("SELECT * FROM platform_stats WHERE id = 1").get();
    const brands = db.prepare("SELECT COUNT(*) as count FROM brands").get();
    const influencers = db.prepare("SELECT COUNT(*) as count FROM influencers").get();
    const activeSubscriptions = db.prepare("SELECT COUNT(*) as count FROM brands WHERE subscription_status = 'active'").get();
    const withdrawals = db.prepare("SELECT * FROM platform_withdrawals ORDER BY created_at DESC").all();
    
    res.json({ 
      ...stats, 
      brandCount: (brands as any).count, 
      influencerCount: (influencers as any).count,
      activeSubscriptions: (activeSubscriptions as any).count,
      withdrawals
    });
  });

  app.post("/api/admin/withdraw", (req, res) => {
    const { amount, bank_name, account_number } = req.body;
    const stats = db.prepare("SELECT balance FROM platform_stats WHERE id = 1").get() as any;

    if (!stats || stats.balance < amount) {
      return res.status(400).json({ error: "Insufficient platform balance" });
    }

    const id = Math.random().toString(36).substring(2, 9);
    const transaction = db.transaction(() => {
      db.prepare("UPDATE platform_stats SET balance = balance - ? WHERE id = 1").run(amount);
      db.prepare(`
        INSERT INTO platform_withdrawals (id, amount, bank_name, account_number)
        VALUES (?, ?, ?, ?)
      `).run(id, amount, bank_name, account_number);
    });

    transaction();
    res.json({ success: true, id });
  });

  // Tracking Redirect
  app.get("/t/:shortCode", (req, res) => {
    const { shortCode } = req.params;
    const link = db.prepare(`
      SELECT cl.*, c.wa_number, c.title
      FROM campaign_links cl
      JOIN campaigns c ON cl.campaign_id = c.id
      WHERE cl.short_code = ?
    `).get(shortCode) as any;

    if (!link) {
      return res.status(404).send("Link not found");
    }

    // Capture click
    const clickId = Math.random().toString(36).substring(2, 9);
    const fingerprint = req.query.fp || "unknown";
    const userAgent = req.headers["user-agent"];
    const ip = req.ip;

    db.prepare(`
      INSERT INTO clicks (id, link_id, fingerprint, user_agent, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(clickId, link.id, fingerprint, userAgent, ip);

    // Redirect to WhatsApp
    const waMessage = encodeURIComponent(`Hi, I'm interested in ${link.title}. [Ref: ${clickId}]`);
    const waUrl = `https://wa.me/${link.wa_number}?text=${waMessage}`;
    
    res.redirect(waUrl);
  });

  // Conversion Confirmation (for SMEs)
  app.post("/api/conversions/confirm", (req, res) => {
    const { click_id, amount } = req.body;
    const id = Math.random().toString(36).substring(2, 9);
    
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO conversions (id, click_id, status, amount, confirmed_at)
        VALUES (?, ?, 'confirmed', ?, CURRENT_TIMESTAMP)
      `).run(id, click_id, amount);

      // Credit influencer wallet (minus 7% commission)
      const details = db.prepare(`
        SELECT 
          i.id as influencer_id,
          i.name as influencer_name,
          c.title as campaign_title,
          c.payout_per_lead,
          conv.amount as sale_amount
        FROM conversions conv
        JOIN clicks cl ON conv.click_id = cl.id
        JOIN campaign_links link ON cl.link_id = link.id
        JOIN influencers i ON link.influencer_id = i.id
        JOIN campaigns c ON link.campaign_id = c.id
        WHERE conv.id = ?
      `).get(id) as any;

      const commission = details.payout_per_lead * 0.07;
      const influencerShare = details.payout_per_lead - commission;

      db.prepare(`
        UPDATE wallets 
        SET balance = balance + ?, total_earned = total_earned + ?
        WHERE influencer_id = ?
      `).run(influencerShare, influencerShare, details.influencer_id);

      // Track platform commission
      db.prepare("UPDATE platform_stats SET total_commissions = total_commissions + ?, balance = balance + ? WHERE id = 1").run(commission, commission);

      return { ...details, commission, influencerShare };
    });

    try {
      const details = transaction();
      broadcast({ type: "CONVERSION", ...details });
      res.json({ success: true, id });
    } catch (e) {
      res.status(400).json({ error: "Conversion already recorded or invalid click ID" });
    }
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

startServer();
