import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Deepan@2005',
  database: 'volunteer_connect'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL Database');
});

const JWT_SECRET = 'your_jwt_secret_key_change_this_in_production';

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  try {
    // Check if user exists
    const [existing] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.promise().query(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, phone]
    );

    // If organization, create organization record
    if (role === 'organization') {
      await db.promise().query(
        'INSERT INTO organizations (user_id, org_name) VALUES (?, ?)',
        [result.insertId, name]
      );
    }

    const token = jwt.sign({ id: result.insertId, email, role }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: result.insertId, 
        name, 
        email, 
        role, 
        phone 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected Routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, name, email, role, phone, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/opportunities', authenticateToken, async (req, res) => {
  try {
    const [opportunities] = await db.promise().query(`
      SELECT o.*, u.name as org_name 
      FROM opportunities o 
      JOIN users u ON o.org_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(opportunities);
  } catch (error) {
    console.error('Opportunities fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const [organizations] = await db.promise().query(`
      SELECT o.*, u.email 
      FROM organizations o 
      JOIN users u ON o.user_id = u.id
    `);
    res.json(organizations);
  } catch (error) {
    console.error('Organizations fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const [events] = await db.promise().query(`
      SELECT e.*, o.title as opportunity_title 
      FROM events e 
      LEFT JOIN opportunities o ON e.opportunity_id = o.id
      ORDER BY e.date ASC
    `);
    res.json(events);
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const [applications] = await db.promise().query(`
      SELECT a.*, u.name as user_name, o.title as opportunity_title 
      FROM applications a 
      JOIN users u ON a.user_id = u.id 
      JOIN opportunities o ON a.opportunity_id = o.id
      ORDER BY a.applied_at DESC
    `);
    res.json(applications);
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create opportunity
app.post('/api/opportunities', authenticateToken, async (req, res) => {
  if (req.user.role !== 'organization') {
    return res.status(403).json({ error: 'Only organizations can create opportunities' });
  }

  const { title, description, type, location, date, duration, volunteers_needed } = req.body;
  
  try {
    const [result] = await db.promise().query(
      'INSERT INTO opportunities (org_id, title, description, type, location, date, duration, volunteers_needed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, type, location, date, duration, volunteers_needed]
    );
    
    res.json({ 
      id: result.insertId, 
      message: 'Opportunity created successfully' 
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply for opportunity
app.post('/api/applications', authenticateToken, async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'Only volunteers can apply for opportunities' });
  }

  const { opportunity_id } = req.body;
  
  try {
    // Check if opportunity exists
    const [opportunities] = await db.promise().query(
      'SELECT * FROM opportunities WHERE id = ?',
      [opportunity_id]
    );
    
    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    // Check if already applied
    const [existing] = await db.promise().query(
      'SELECT * FROM applications WHERE user_id = ? AND opportunity_id = ?',
      [req.user.id, opportunity_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already applied for this opportunity' });
    }

    await db.promise().query(
      'INSERT INTO applications (user_id, opportunity_id) VALUES (?, ?)',
      [req.user.id, opportunity_id]
    );
    
    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Volunteer Connect API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5001; // Changed to 5001
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});