import { getDB } from '../utils/db';
import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const notifications = new Hono<Env>();

// GET /api/schools/:schoolId/notifications/:userId
notifications.get('/:userId', async (c) => {
    const userId = c.req.param('userId');
    const { results } = await getDB(c).prepare(
        `SELECT n.*, s.nom as senderNom, s.prenom as senderPrenom
     FROM Notification n
     LEFT JOIN AppUser s ON n.senderId = s.id
     WHERE n.receiverId = ?
     ORDER BY n.time DESC LIMIT 100`
    ).bind(userId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/notifications
notifications.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        `INSERT INTO Notification (id, senderId, receiverId, receiverType, type, urgent, content, schoolId, opened, time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime("now"))`
    ).bind(id, body.senderId, body.receiverId, body.receiverType || 'USER', body.type || 'INFO', body.urgent ? 1 : 0, body.content, schoolId).run();
    return c.json({ id, ...body }, 201);
});

// PUT /api/schools/:schoolId/notifications/:notifId/read
notifications.put('/:notifId/read', async (c) => {
    const notifId = c.req.param('notifId');
    await getDB(c).prepare('UPDATE Notification SET opened = 1 WHERE id = ?').bind(notifId).run();
    return c.json({ message: 'Notification lue' });
});

// PUT /api/schools/:schoolId/notifications/read-all/:userId
notifications.put('/read-all/:userId', async (c) => {
    const userId = c.req.param('userId');
    await getDB(c).prepare('UPDATE Notification SET opened = 1 WHERE receiverId = ?').bind(userId).run();
    return c.json({ message: 'Toutes les notifications marquées comme lues' });
});

export default notifications;
