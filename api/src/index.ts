import { Hono } from 'hono';
import { cors } from 'hono/cors';

import auth from './routes/auth';
import schools from './routes/schools';
import notes from './routes/notes';
import evaluations from './routes/evaluations';
import cours from './routes/cours';
import emargements from './routes/emargements';
import messages from './routes/messages';
import notifications from './routes/notifications';

import { authMiddleware } from './middleware/auth';

type Env = { Bindings: { DB: D1Database } };
const app = new Hono<Env>();

// --- CORS Configuration ---
// Permettre les requêtes depuis n'importe quel domaine ou depuis le port local
app.use(
    '*',
    cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-School-Name'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    })
);

// Health check root endpoint
app.get('/', (c) => c.text('SeeKids API is running! 🚀'));

// --- Public Routes ---
app.route('/api/auth', auth);

// --- Protected Routes ---
// On applique le middleware d'authentification à toutes les routes ci-dessous
app.use('/api/schools/*', authMiddleware);

app.route('/api/schools/:schoolId', schools);
app.route('/api/schools/:schoolId/notes', notes);
app.route('/api/schools/:schoolId/evaluations', evaluations);
app.route('/api/schools/:schoolId/cours', cours);
app.route('/api/schools/:schoolId/emargements', emargements);
app.route('/api/schools/:schoolId/messages', messages);
app.route('/api/schools/:schoolId/notifications', notifications);

export default app;
