import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock users database
const users = new Map([
  ['test@example.com', {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123', // In real app, this would be hashed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }]
]);

const tokens = new Map(); // For token storage

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (users.has(email)) {
    return res.status(400).json({
      error: { code: 'USER_EXISTS', message: 'User already exists' }
    });
  }

  const user = {
    id: Date.now().toString(),
    email,
    name,
    password, // In real app, hash this
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.set(email, user);

  const accessToken = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');
  const refreshToken = Buffer.from(JSON.stringify({ userId: user.id, type: 'refresh' })).toString('base64');

  res.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt },
      accessToken,
      refreshToken,
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  const accessToken = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');
  const refreshToken = Buffer.from(JSON.stringify({ userId: user.id, type: 'refresh' })).toString('base64');

  res.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt },
      accessToken,
      refreshToken,
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No authorization token' }
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    const user = users.get(payload.email);
    
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt },
        isAuthenticated: true,
      }
    });
  } catch (error) {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    const payload = JSON.parse(Buffer.from(refreshToken, 'base64').toString());
    const user = Array.from(users.values()).find(u => u.id === payload.userId);
    
    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' }
      });
    }

    const newAccessToken = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString('base64');
    const newRefreshToken = Buffer.from(JSON.stringify({ userId: user.id, type: 'refresh' })).toString('base64');

    res.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }
    });
  } catch (error) {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' }
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`✅ Mock API server running on http://localhost:${PORT}`);
  console.log(`\nTest credentials:`);
  console.log(`Email: test@example.com`);
  console.log(`Password: password123`);
});
