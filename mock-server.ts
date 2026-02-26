import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database
const users = [
  {
    id: '1',
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const tokens: Record<string, string> = {};

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({
      success: false,
      error: { code: 'USER_EXISTS', message: 'User already exists' },
    });
  }

  const newUser = {
    id: Math.random().toString(),
    email,
    password,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);

  const accessToken = `access_${Math.random()}`;
  const refreshToken = `refresh_${Math.random()}`;
  tokens[refreshToken] = accessToken;

  res.json({
    success: true,
    data: {
      user: { ...newUser, password: undefined },
      accessToken,
      refreshToken,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const accessToken = `access_${Math.random()}`;
  const refreshToken = `refresh_${Math.random()}`;
  tokens[refreshToken] = accessToken;

  res.json({
    success: true,
    data: {
      user: { ...user, password: undefined },
      accessToken,
      refreshToken,
    },
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!tokens[refreshToken]) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
    });
  }

  const newAccessToken = `access_${Math.random()}`;
  const newRefreshToken = `refresh_${Math.random()}`;
  delete tokens[refreshToken];
  tokens[newRefreshToken] = newAccessToken;

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
    });
  }

  // For demo, just return the first user
  const user = users[0];
  res.json({
    success: true,
    data: { user: { ...user, password: undefined } },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
