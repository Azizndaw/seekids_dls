import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';

export async function authMiddleware(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Token manquant' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    try {
        const payload = await verifyToken(token);
        c.set('user', payload);
        await next();
    } catch (e) {
        return c.json({ error: 'Token invalide ou expiré' }, 401);
    }
}
