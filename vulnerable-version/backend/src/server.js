require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const ConnectPgSimple = require('connect-pg-simple')(session);

const pool = require('./db/pool');
const authRoutes = require('./routes/auth.routes');
const catalogRoutes = require('./routes/catalog.routes');
const customersRoutes = require('./routes/customers.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const isProd = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '64kb' }));

if (!process.env.SESSION_SECRET) {
  console.warn('[warn] SESSION_SECRET is not set. Sessions will not be cryptographically strong.');
}
if (!process.env.PEPPER) {
  console.warn('[warn] PEPPER is not set. Password hashing will fail until configured.');
}

app.use(session({
  store: new ConnectPgSimple({
    pool,
    tableName: 'session',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/customers', customersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Comunication_LTD backend listening on port ${PORT}`);
});
