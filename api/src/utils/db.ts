import { Context } from 'hono';

export function getDB(c: Context): D1Database {
    const year = c.req.header('X-Academic-Year');
    if (year === '2026-2027' && c.env.DB_2026) {
        return c.env.DB_2026;
    }
    return c.env.DB;
}
