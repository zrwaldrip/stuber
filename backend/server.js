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

const ensureImagePathColumns = async () => {
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'profile_photo_url'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'profile_photo_path'
        ) THEN
          ALTER TABLE public.users RENAME COLUMN profile_photo_url TO profile_photo_path;
        END IF;
      END
      $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'car'
            AND column_name = 'car_photo_url'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'car'
            AND column_name = 'car_photo_path'
        ) THEN
          ALTER TABLE public.car RENAME COLUMN car_photo_url TO car_photo_path;
        END IF;
      END
      $$;
    `);
  } catch (error) {
    console.error('Error ensuring image path columns:', error);
  }
};

void ensureImagePathColumns();

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

    if (!/^[^\s@]+@byu\.edu$/.test(emailNorm)) {
      return res.status(400).json({ error: 'Sign up requires a @byu.edu email address.' });
    }

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

// Get locations (used for ride posting dropdowns)
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT location_id, name, location_type FROM location ORDER BY location_id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Location table does not exist. Please run schema.sql.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a one-time ride offer
app.post('/api/rides', async (req, res) => {
  try {
    const { userId, fromLocationId, toLocationId, fromLocation, toLocation, departureTime, availableSeats, notes } =
      req.body ?? {};

    const parsedUserId = Number(userId);
    const parsedSeats = Number(availableSeats);
    let fromId = fromLocationId != null ? Number(fromLocationId) : null;
    let toId = toLocationId != null ? Number(toLocationId) : null;
    const fromName = typeof fromLocation === 'string' ? fromLocation.trim() : '';
    const toName = typeof toLocation === 'string' ? toLocation.trim() : '';
    const departRaw = typeof departureTime === 'string' ? departureTime.trim() : '';

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }
    // IDs are preferred. Names are accepted only for legacy clients.
    if ((!Number.isInteger(fromId) || fromId <= 0) && !fromName) {
      return res.status(400).json({ error: 'From location is required' });
    }
    if ((!Number.isInteger(toId) || toId <= 0) && !toName) {
      return res.status(400).json({ error: 'To location is required' });
    }
    if (!departRaw) {
      return res.status(400).json({ error: 'Departure time is required' });
    }
    if (!Number.isInteger(parsedSeats) || parsedSeats <= 0) {
      return res.status(400).json({ error: 'availableSeats must be a positive integer' });
    }

    const departureDate = new Date(departRaw);
    if (Number.isNaN(departureDate.getTime())) {
      return res.status(400).json({ error: 'departureTime must be a valid datetime string' });
    }
    const departureSql = departureDate.toISOString().slice(0, 19).replace('T', ' ');

    const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [parsedUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resolveExistingLocationId = async (idValue, nameValue) => {
      if (Number.isInteger(idValue) && idValue > 0) return idValue;
      if (!nameValue) return null;
      const existing = await pool.query(
        'SELECT location_id FROM location WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [nameValue]
      );
      if (existing.rows.length === 0) return null;
      return existing.rows[0].location_id;
    };

    fromId = await resolveExistingLocationId(fromId, fromName);
    toId = await resolveExistingLocationId(toId, toName);

    if (!Number.isInteger(fromId) || fromId <= 0) {
      return res.status(400).json({ error: 'From location must exist in the database' });
    }
    if (!Number.isInteger(toId) || toId <= 0) {
      return res.status(400).json({ error: 'To location must exist in the database' });
    }

    const rideResult = await pool.query(
      `INSERT INTO ride_offer
        (user_id, from_location_id, to_location_id, departure_time, available_seats, notes, status)
       VALUES ($1, $2, $3, $4::timestamp, $5, $6, 'active')
       RETURNING offer_id, user_id, from_location_id, to_location_id, departure_time, available_seats, notes, status, created_at`,
      [parsedUserId, fromId, toId, departureSql, parsedSeats, notes ?? null]
    );

    res.status(201).json(rideResult.rows[0]);
  } catch (error) {
    console.error('Error creating ride:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Ride/location tables do not exist. Please run schema.sql.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active ride offers with related user/location/car data
app.get('/api/rides', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        ro.offer_id,
        ro.departure_time,
        ro.available_seats,
        ro.status,
        ro.notes,
        ro.from_location_id,
        ro.to_location_id,
        lf.name AS from_location_name,
        lt.name AS to_location_name,
        u.user_id AS driver_user_id,
        u.first_name AS driver_first_name,
        u.last_name AS driver_last_name,
        u.username AS driver_username,
        u.profile_photo_path AS driver_profile_photo_path,
        c.year AS car_year,
        c.make AS car_make,
        c.model AS car_model,
        c.color AS car_color,
        c.license_plate AS car_license_plate,
        c.car_photo_path AS car_photo_path
      FROM ride_offer ro
      JOIN users u ON u.user_id = ro.user_id
      JOIN location lf ON lf.location_id = ro.from_location_id
      JOIN location lt ON lt.location_id = ro.to_location_id
      LEFT JOIN car c ON c.user_id = u.user_id
      WHERE ro.status = 'active'
        AND ro.available_seats > 0
        AND ro.departure_time >= NOW()
      ORDER BY ro.departure_time ASC, ro.offer_id ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rides:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Ride tables do not exist. Please run schema.sql.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book a ride offer (one seat)
app.post('/api/rides/:offerId/book', async (req, res) => {
  const client = await pool.connect();
  try {
    const parsedOfferId = Number(req.params.offerId);
    const parsedUserId = Number(req.body?.userId);

    if (!Number.isInteger(parsedOfferId) || parsedOfferId <= 0) {
      return res.status(400).json({ error: 'Valid offerId is required' });
    }
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    await client.query('BEGIN');

    const offerResult = await client.query(
      `SELECT offer_id, user_id, from_location_id, to_location_id, departure_time, available_seats, status
       FROM ride_offer
       WHERE offer_id = $1
       FOR UPDATE`,
      [parsedOfferId]
    );
    if (offerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ride offer not found' });
    }

    const offer = offerResult.rows[0];
    if ((offer.status || '').toLowerCase() !== 'active') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ride is not active' });
    }
    if (new Date(offer.departure_time).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ride has already departed' });
    }
    if (Number(offer.user_id) === parsedUserId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You cannot book your own ride' });
    }
    if (Number(offer.available_seats) <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ride is full' });
    }

    const existingBooking = await client.query(
      `SELECT t.trip_id
       FROM trip t
       JOIN ride_request rr ON rr.request_id = t.request_id
       WHERE t.offer_id = $1
         AND rr.user_id = $2
         AND t.status IN ('pending', 'confirmed', 'active')
       LIMIT 1`,
      [parsedOfferId, parsedUserId]
    );
    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already booked this ride' });
    }

    const requestResult = await client.query(
      `INSERT INTO ride_request
        (user_id, from_location_id, to_location_id, earliest_departure, latest_departure, seats_needed, notes, status)
       VALUES ($1, $2, $3, $4, $4, 1, $5, 'active')
       RETURNING request_id`,
      [parsedUserId, offer.from_location_id, offer.to_location_id, offer.departure_time, 'Booked from app']
    );
    const requestId = requestResult.rows[0].request_id;

    const tripResult = await client.query(
      `INSERT INTO trip
        (offer_id, request_id, confirmed_time, seats_confirmed, status)
       VALUES ($1, $2, NOW(), 1, 'confirmed')
       RETURNING trip_id, offer_id, request_id, seats_confirmed, status`,
      [parsedOfferId, requestId]
    );

    await client.query(
      `UPDATE ride_offer
       SET available_seats = available_seats - 1
       WHERE offer_id = $1`,
      [parsedOfferId]
    );

    await client.query('COMMIT');
    res.status(201).json(tripResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error booking ride:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Ride/trip tables do not exist. Please run schema.sql.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Cancel the current user's booking for a ride offer
app.delete('/api/rides/:offerId/book', async (req, res) => {
  const client = await pool.connect();
  try {
    const parsedOfferId = Number(req.params.offerId);
    const parsedUserId = Number(req.query.userId);

    if (!Number.isInteger(parsedOfferId) || parsedOfferId <= 0) {
      return res.status(400).json({ error: 'Valid offerId is required' });
    }
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    await client.query('BEGIN');

    const offerResult = await client.query(
      `SELECT offer_id, departure_time
       FROM ride_offer
       WHERE offer_id = $1
       FOR UPDATE`,
      [parsedOfferId]
    );
    if (offerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ride offer not found' });
    }
    if (new Date(offerResult.rows[0].departure_time).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ride has already departed' });
    }

    const bookingResult = await client.query(
      `SELECT t.trip_id, t.request_id, t.seats_confirmed
       FROM trip t
       JOIN ride_request rr ON rr.request_id = t.request_id
       WHERE t.offer_id = $1
         AND rr.user_id = $2
         AND t.status IN ('pending', 'confirmed', 'active')
       ORDER BY t.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [parsedOfferId, parsedUserId]
    );
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active booking found for this ride' });
    }

    const booking = bookingResult.rows[0];
    const seatCount = Math.max(1, Number(booking.seats_confirmed || 1));

    await client.query(
      `UPDATE trip
       SET status = 'cancelled'
       WHERE trip_id = $1`,
      [booking.trip_id]
    );
    await client.query(
      `UPDATE ride_request
       SET status = 'cancelled'
       WHERE request_id = $1`,
      [booking.request_id]
    );
    await client.query(
      `UPDATE ride_offer
       SET available_seats = available_seats + $2
       WHERE offer_id = $1`,
      [parsedOfferId, seatCount]
    );

    await client.query('COMMIT');
    res.json({ success: true, trip_id: booking.trip_id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling booking:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Ride/trip tables do not exist. Please run schema.sql.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get rides for a specific user (booked + offered)
app.get('/api/my-rides', async (req, res) => {
  try {
    const parsedUserId = Number(req.query.userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ error: 'Valid userId query param is required' });
    }

    const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [parsedUserId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [bookedResult, offeredResult] = await Promise.all([
      pool.query(
        `SELECT
          t.trip_id,
          t.status AS booking_status,
          t.seats_confirmed,
          t.created_at AS booked_at,
          ro.offer_id,
          ro.departure_time,
          ro.available_seats,
          ro.status AS offer_status,
          lf.name AS from_location_name,
          lt.name AS to_location_name,
          u.user_id AS driver_user_id,
          u.first_name AS driver_first_name,
          u.last_name AS driver_last_name,
          u.username AS driver_username,
          u.profile_photo_path AS driver_profile_photo_path,
          c.year AS car_year,
          c.make AS car_make,
          c.model AS car_model,
          c.color AS car_color,
          c.license_plate AS car_license_plate,
          c.car_photo_path AS car_photo_path
        FROM trip t
        JOIN ride_request rr ON rr.request_id = t.request_id
        JOIN ride_offer ro ON ro.offer_id = t.offer_id
        JOIN users u ON u.user_id = ro.user_id
        JOIN location lf ON lf.location_id = ro.from_location_id
        JOIN location lt ON lt.location_id = ro.to_location_id
        LEFT JOIN car c ON c.user_id = u.user_id
        WHERE rr.user_id = $1
          AND t.status IN ('pending', 'confirmed', 'active')
          AND ro.departure_time >= NOW()
        ORDER BY ro.departure_time ASC, t.trip_id ASC`,
        [parsedUserId]
      ),
      pool.query(
        `SELECT
          ro.offer_id,
          ro.departure_time,
          ro.available_seats,
          ro.status,
          ro.notes,
          lf.name AS from_location_name,
          lt.name AS to_location_name,
          COALESCE(
            SUM(CASE WHEN t.status IN ('pending', 'confirmed', 'active') THEN t.seats_confirmed ELSE 0 END),
            0
          )::int AS seats_booked,
          COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'confirmed', 'active') THEN t.trip_id END)::int AS rider_count,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'user_id', rider.user_id,
                'first_name', rider.first_name,
                'last_name', rider.last_name,
                'username', rider.username,
                'email', rider.email,
                'phone', rider.phone,
                'profile_photo_path', rider.profile_photo_path,
                'car_year', rc.year,
                'car_make', rc.make,
                'car_model', rc.model,
                'car_color', rc.color,
                'car_license_plate', rc.license_plate,
                'car_photo_path', rc.car_photo_path
              )
            ) FILTER (WHERE t.status IN ('pending', 'confirmed', 'active') AND rider.user_id IS NOT NULL),
            '[]'::json
          ) AS riders
        FROM ride_offer ro
        JOIN location lf ON lf.location_id = ro.from_location_id
        JOIN location lt ON lt.location_id = ro.to_location_id
        LEFT JOIN trip t ON t.offer_id = ro.offer_id
        LEFT JOIN ride_request rr ON rr.request_id = t.request_id
        LEFT JOIN users rider ON rider.user_id = rr.user_id
        LEFT JOIN car rc ON rc.user_id = rider.user_id
        WHERE ro.user_id = $1
          AND ro.departure_time >= NOW()
        GROUP BY ro.offer_id, ro.departure_time, ro.available_seats, ro.status, ro.notes, lf.name, lt.name
        ORDER BY ro.departure_time ASC, ro.offer_id ASC`,
        [parsedUserId]
      ),
    ]);

    res.json({
      bookedRides: bookedResult.rows,
      offeredRides: offeredResult.rows,
    });
  } catch (error) {
    console.error('Error fetching my rides:', error);
    if (error.code === '3D000') {
      return res.status(500).json({ error: 'Database does not exist. Please run the database setup scripts first.' });
    }
    if (error.code === '28P01') {
      return res.status(500).json({ error: 'Database authentication failed. Please check your .env file credentials.' });
    }
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Ride/trip tables do not exist. Please run schema.sql.' });
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
