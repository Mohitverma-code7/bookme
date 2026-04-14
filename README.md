# Book My Ticket - Authenticated Booking System

## Features
- User registration and login (JWT auth)
- Protected seat booking (only logged-in users)
- Transactional booking prevents duplicates/overbooking
- Neo-brutalism UI
- PostgreSQL backend

## Setup

### 1. PostgreSQL Database (pgAdmin)
Connect to `localhost:5433`, user `postgres`, password `postgres`, DB `sql_class_2_db`.

Run schema.sql:
```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id to seats (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='seats' AND column_name='user_id'
    ) THEN
        ALTER TABLE seats ADD COLUMN user_id INTEGER REFERENCES users(id);
    END IF;
END $$;

-- Ensure 20 seats (unbooked, no user)
DELETE FROM seats;
INSERT INTO seats (isbooked, name, user_id)
SELECT 0, NULL, NULL FROM generate_series(1, 20);
```

**Note:** Existing seats? This resets to clean state.

### 2. Install Dependencies
```bash
cd book-my-ticket
npm install
```

### 3. Run Server
```bash
npm start
```
Or dev: `npm run dev`

### 4. Access
Open http://localhost:8080

## Endpoints
- `GET /` - Frontend
- `GET /seats` - List seats (public?)
- `POST /register` - {username, password}
- `POST /login` - {username, password} → JWT
- `PUT /:id` - Book seat (auth header: Bearer <token>)

## Flow
1. Register/Login → get JWT
2. Frontend stores token, sends in bookings
3. Booking checks seat available & not booked by you
4. Associated with user_id

## Frontend (Neo-Brutalism)
Bold high-contrast design: black/red/white, sharp edges, pixel fonts optional.

## Testing
- Register new user
- Login, book seat → succeeds
- Try book same seat → fails
- Logout/login other user → can't book taken seats

