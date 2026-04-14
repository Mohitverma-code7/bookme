-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- SEATS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    isbooked INT DEFAULT 0,
    user_id INT REFERENCES users(id)
);

-- =========================
-- RESET SEATS (20 SEATS CLEAN SETUP)
-- =========================

-- Clear old data safely
DELETE FROM seats;

-- Recreate 20 seats
INSERT INTO seats (id, isbooked, name, user_id)
SELECT generate_series(1, 20), 0, NULL, NULL;