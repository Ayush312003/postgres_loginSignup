const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');

app.use(bodyParser.json());
app.use(cors());

const { Pool } = require('pg');
require('dotenv').config();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const createUserTable = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
  )
`;

pool.query(createUserTable, (err, result) => {
  if (err) {
    console.error('Error creating user table:', err);
  } else {
    console.log('User table created successfully');
  }
});

const bcrypt = require('bcrypt');
const saltRounds = 10;

// Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const createUserQuery = `
    INSERT INTO users (username, password)
    VALUES ($1, $2)
    RETURNING *
  `;

  const values = [username, hashedPassword];

  pool.query(createUserQuery, values, (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(201).json({ message: 'User registered successfully' });
    }
  });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const getUserQuery = `
    SELECT * FROM users
    WHERE username = $1
  `;

  const userResult = await pool.query(getUserQuery, [username]);

  if (userResult.rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const storedPassword = userResult.rows[0].password;
  const passwordMatch = await bcrypt.compare(password, storedPassword);

  if (passwordMatch) {
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
