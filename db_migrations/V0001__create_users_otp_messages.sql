
CREATE TABLE IF NOT EXISTS t_p93752303_quantum_initiative_7.users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  avatar_letter VARCHAR(1),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p93752303_quantum_initiative_7.otp_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS t_p93752303_quantum_initiative_7.messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p93752303_quantum_initiative_7.users(id),
  channel VARCHAR(50) DEFAULT 'general',
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
