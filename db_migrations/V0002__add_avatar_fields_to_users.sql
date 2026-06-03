ALTER TABLE t_p93752303_quantum_initiative_7.users
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(100) DEFAULT 'from-purple-500 to-pink-500',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
