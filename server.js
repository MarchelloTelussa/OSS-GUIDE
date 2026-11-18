import 'dotenv/config';
import path from 'path';
import express from 'express';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { sessionMiddleware } from './middleware/session.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startHrisSyncScheduler } from './middleware/hrisSync.js';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import basicAuth from 'express-basic-auth';
import { createRequire } from 'module';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//swagger
const require = createRequire(import.meta.url);
const swaggerDocument = require('./swagger-output.json');

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerProtection = basicAuth({
  users: { 
    [process.env.SWAGGER_USER]: process.env.SWAGGER_PASS 
  },
  challenge: true, // Memunculkan popup login di browser
  realm: 'QuantumGuide Protected Documentation'
});
app.use('/api-docs', swaggerProtection, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.set('trust proxy', 1);

const PUBLIC_PATHS = ['/login.html', '/js/login.js', '/api/auth/login', '/api/auth/logout'];

app.use((req, res, next) => {
  if (req.path === '/login.html' && req.user) return res.redirect('/');
  if (PUBLIC_PATHS.includes(req.path)) return next();
  
  if (!req.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });
    return res.redirect('/login.html');
  }

  next();
});

// 4. Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 5. Register Routes API
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  // Mulai sinkronisasi cache user HRIS (sekali saat start bila stale, lalu tiap 1 jam)
  startHrisSyncScheduler();
});