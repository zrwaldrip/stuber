import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import pg from 'pg';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Uploads (Railway Volume mounts at /app/uploads)
const uploadsDir = process.env.UPLOADS_DIR || '/app/uploads';
const resolvedUploadsDir = fs.existsSync(uploadsDir) ? uploadsDir : path.join(__dirname, 'uploads');
fs.mkdirSync(resolvedUploadsDir, { recursive: true });
app.use('/uploads', express.static(resolvedUploadsDir, { fallthrough: false }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolvedUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const name = `image_${Date.now()}_${crypto.randomUUID()}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image uploads are allowed'));
  },
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stuber',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Routes

// Auth: login (email or username + password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};

    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      return res.status(400).json({ error: 'Identifier (email or username) is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const ident = identifier.trim().toLowerCase();

    const result = await pool.query(
      `SELECT user_id, first_name, last_name, username, email, phone, profile_photo_path, car_id
       FROM users
       WHERE (LOWER(email) = $1 OR LOWER(username) = $1)
         AND password_hash = crypt($2, password_hash)
       LIMIT 1`,
      [ident, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error logging in:', error);

    const msg = typeof error?.message === 'string' ? error.message : '';
    if (msg.includes('SASL') || msg.includes('password must be a string')) {
      return res.status(500).json({
        error:
          'Database connection failed. Copy backend/.env.example to backend/.env and set DB_PASSWORD to your PostgreSQL user password.',
      });
    }

    if (error.code === '3D000') {
      return res.status(500).json({
        error: 'Database does not exist. Please run the database setup scripts first.',
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({
        error: 'Database authentication failed. Please check your .env file credentials.',
      });
    }
    if (error.code === '42883') {
      return res.status(500).json({
        error: "Password hashing functions not available. Ensure 'pgcrypto' extension is installed (schema.sql).",
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: register (email + password + full name)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body ?? {};

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || typeof password !== 'string' || password === '') {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const emailNorm = email.trim().toLowerCase();

    const dupEmail = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [emailNorm]
    );
    if (dupEmail.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const trimmed = fullName.trim();
    const firstSpace = trimmed.indexOf(' ');
    let first_name;
    let last_name;
    if (firstSpace === -1) {
      first_name = trimmed;
      last_name = trimmed;
    } else {
      first_name = trimmed.slice(0, firstSpace).trim();
      last_name = trimmed.slice(firstSpace + 1).trim() || '-';
    }

    const localPart = emailNorm.split('@')[0] || '';
    let base = localPart.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (!base) base = 'user';
    base = base.slice(0, 100);

    let username = base;
    for (let n = 0; n < 10000; n++) {
      const suffix = n === 0 ? '' : String(n);
      const maxBase = Math.max(0, 100 - suffix.length);
      username = (base.slice(0, maxBase) + suffix).slice(0, 100);
      const taken = await pool.query(
        `SELECT 1 FROM users WHERE LOWER(username) = $1 LIMIT 1`,
        [username.toLowerCase()]
      );
      if (taken.rows.length === 0) break;
      if (n === 9999) {
        return res.status(500).json({ error: 'Could not allocate a unique username' });
      }
    }

    const phone = '';

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, crypt($6, gen_salt('bf')))
       RETURNING user_id, first_name, last_name, username, email, phone, profile_photo_path, car_id`,
      [first_name, last_name, username, emailNorm, phone, password]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error registering:', error);

    const msg = typeof error?.message === 'string' ? error.message : '';
    if (msg.includes('SASL') || msg.includes('password must be a string')) {
      return res.status(500).json({
        error:
          'Database connection failed. Copy backend/.env.example to backend/.env and set DB_PASSWORD to your PostgreSQL user password.',
      });
    }

    if (error.code === '3D000') {
      return res.status(500).json({
        error: 'Database does not exist. Please run the database setup scripts first.',
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({
        error: 'Database authentication failed. Please check your .env file credentials.',
      });
    }
    if (error.code === '42883') {
      return res.status(500).json({
        error: "Password hashing functions not available. Ensure 'pgcrypto' extension is installed (schema.sql).",
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, first_name, last_name, username, email, profile_photo_path FROM users ORDER BY user_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Provide more specific error messages
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Users table does not exist. Please run the schema.sql script.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT user_id, first_name, last_name, username, email, phone, profile_photo_path, car_id FROM users WHERE user_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    
    // Provide more specific error messages
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user details (first name, last name, username, phone)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, username, phone } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         username   = COALESCE($3, username),
         phone      = COALESCE($4, phone)
       WHERE user_id = $5
       RETURNING user_id, first_name, last_name, username, email, phone, profile_photo_path, car_id`,
      [
        firstName ?? null,
        lastName ?? null,
        username ?? null,
        phone ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);

    if (error.code === '3D000') {
      return res.status(500).json({
        error: 'Database does not exist. Please run the database setup scripts first.',
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({
        error: 'Database authentication failed. Please check your .env file credentials.',
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update username (kept for backward compatibility; now updates the username column)
app.put('/api/users/:id/username', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await pool.query(
      `UPDATE users
       SET username = $1
       WHERE user_id = $2
       RETURNING user_id, first_name, last_name, username, email, profile_photo_path`,
      [username.trim(), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating username:', error);
    
    // Provide more specific error messages
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Users table does not exist. Please run the schema.sql script.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile photo
app.put('/api/users/:id/profile-photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrl } = req.body;
    
    
    const result = await pool.query(
      'UPDATE users SET profile_photo_path = $1 WHERE user_id = $2 RETURNING user_id, first_name, last_name, email, profile_photo_path',
      [photoUrl || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile photo:', error);
    
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload user profile photo (multipart/form-data field: file)
app.post('/api/users/:id/profile-photo', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const filename = req.file?.filename;
    if (!filename) return res.status(400).json({ error: 'File is required' });

    const result = await pool.query(
      'UPDATE users SET profile_photo_path = $1 WHERE user_id = $2 RETURNING user_id, first_name, last_name, username, email, phone, profile_photo_path, car_id',
      [filename, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0], filename, url: `${req.protocol}://${req.get('host')}/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get car by ID
app.get('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT car_id, user_id, make, model, color, year, license_plate, car_photo_path FROM car WHERE car_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching car:', error);
    
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update car details (make, model, year, color, license plate)
app.put('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, color, licensePlate } = req.body;

    const result = await pool.query(
      `UPDATE car
       SET
         make          = COALESCE($1, make),
         model         = COALESCE($2, model),
         year          = COALESCE($3, year),
         color         = COALESCE($4, color),
         license_plate = COALESCE($5, license_plate)
       WHERE car_id = $6
       RETURNING car_id, user_id, make, model, color, year, license_plate, car_photo_path`,
      [
        make ?? null,
        model ?? null,
        year ?? null,
        color ?? null,
        licensePlate ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating car:', error);

    if (error.code === '3D000') {
      return res.status(500).json({
        error: 'Database does not exist. Please run the database setup scripts first.',
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({
        error: 'Database authentication failed. Please check your .env file credentials.',
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update car photo
app.put('/api/cars/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrl } = req.body;
    
    
    const result = await pool.query(
      'UPDATE car SET car_photo_path = $1 WHERE car_id = $2 RETURNING car_id, user_id, make, model, color, year, license_plate, car_photo_path',
      [photoUrl || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating car photo:', error);
    
    if (error.code === '3D000') {
      return res.status(500).json({ 
        error: 'Database does not exist. Please run the database setup scripts first.' 
      });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ 
        error: 'Database authentication failed. Please check your .env file credentials.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload car photo (multipart/form-data field: file)
app.post('/api/cars/:id/photo', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const filename = req.file?.filename;
    if (!filename) return res.status(400).json({ error: 'File is required' });

    const result = await pool.query(
      'UPDATE car SET car_photo_path = $1 WHERE car_id = $2 RETURNING car_id, user_id, make, model, color, year, license_plate, car_photo_path',
      [filename, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json({ car: result.rows[0], filename, url: `${req.protocol}://${req.get('host')}/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading car photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
