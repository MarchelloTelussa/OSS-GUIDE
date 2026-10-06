import 'dotenv/config';
import path from 'path';
import express from 'express';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { sessionMiddleware } from './lib/session.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

// Semua halaman dan API wajib login, kecuali halaman login itu sendiri
const PUBLIC_PATHS = ['/login.html', '/js/login.js', '/api/auth/login', '/api/auth/logout'];
app.use((req, res, next) => {
  if (req.path === '/login.html' && req.user) return res.redirect('/');
  if (PUBLIC_PATHS.includes(req.path)) return next();
  if (!req.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });
    return res.redirect('/login.html');
  }
  if (req.path === '/add-guide.html' && req.user.role !== 'ITAdmin') return res.redirect('/');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});