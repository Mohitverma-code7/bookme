// DB Schema: Run schema.sql first!
// CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR UNIQUE, password_hash VARCHAR, created_at TIMESTAMP DEFAULT NOW());
// ALTER TABLE seats ADD user_id INT REFERENCES users(id);

import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || 8080;
const JWT_SECRET = "bookmysecretkey-super-secret-do-not-use-in-prod";

// 🔥 FIXED: DB CONFIG (MAKE SURE THIS MATCHES YOUR POSTGRES)
const pool = new pg.Pool({
  host: "localhost",
  port: 5432, // ⚠️ change to 5433 ONLY if you're 100% sure postgres is running there
  user: "postgres",
  password: "33961",
  database: "bookme", // ⚠️ change if your DB name is different
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// ✅ DB CONNECTION TEST (IMPORTANT)
pool.query("SELECT NOW()")
  .then((res) => {
    console.log("✅ DATABASE CONNECTED:", res.rows[0]);
  })
  .catch((err) => {
    console.error("❌ DATABASE CONNECTION FAILED:");
    console.error(err.message);
  });

const app = express();

app.use(cors());
app.use(express.json());

// Home
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Get all seats
app.get("/seats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.username 
      FROM seats s 
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seats" });
  }
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username/password" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hash]
    );

    res.json({ message: "Registered", user: result.rows[0] });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Username already exists" });
    }

    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username/password" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Auth middleware
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Book seat
app.put("/:id", auth, async (req, res) => {
  const conn = await pool.connect();

  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const username = req.user.username;

    await conn.query("BEGIN");

    const check = await conn.query(
      `SELECT * FROM seats 
       WHERE id = $1 AND isbooked = 0 
       FOR UPDATE`,
      [id]
    );

    if (check.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.json({ error: "Seat already booked" });
    }

    const update = await conn.query(
      `UPDATE seats 
       SET isbooked = 1, name = $3, user_id = $2 
       WHERE id = $1`,
      [id, userId, username]
    );

    await conn.query("COMMIT");

    res.json({ message: "Booked successfully!", update: update.rowCount });

  } catch (err) {
    await conn.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Booking failed" });
  } finally {
    conn.release();
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port: ${port}`);
});