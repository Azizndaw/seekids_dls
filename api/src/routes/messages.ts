import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const messages = new Hono<Env>();

// GET /api/schools/:schoolId/messages/:userId
messages.get('/:userId', async (c) => {
    const userId = c.req.param('userId');
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT m.*,
            s.nom as senderNom, s.prenom as senderPrenom,
            r.nom as receiverNom, r.prenom as receiverPrenom
     FROM Message m
     LEFT JOIN AppUser s ON m.senderId = s.id
     LEFT JOIN AppUser r ON m.receiverId = r.id
     WHERE (m.senderId = ? OR m.receiverId = ?) AND m.schoolId = ?
     ORDER BY m.sentAt DESC`
    ).bind(userId, userId, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/messages/conversations/:userId
messages.get('/conversations/:userId', async (c) => {
    const userId = c.req.param('userId');
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT DISTINCT
       CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END as contactId,
       CASE WHEN m.senderId = ? THEN r.nom ELSE s.nom END as contactNom,
       CASE WHEN m.senderId = ? THEN r.prenom ELSE s.prenom END as contactPrenom,
       MAX(m.sentAt) as lastMessageAt
     FROM Message m
     LEFT JOIN AppUser s ON m.senderId = s.id
     LEFT JOIN AppUser r ON m.receiverId = r.id
     WHERE (m.senderId = ? OR m.receiverId = ?) AND m.schoolId = ?
     GROUP BY contactId
     ORDER BY lastMessageAt DESC`
    ).bind(userId, userId, userId, userId, userId, schoolId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/messages
messages.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
        'INSERT INTO Message (id, senderId, receiverId, content, read, schoolId, sentAt) VALUES (?, ?, ?, ?, 0, ?, datetime("now"))'
    ).bind(id, body.senderId, body.receiverId, body.content, schoolId).run();
    return c.json({ id, ...body }, 201);
});

// PUT /api/schools/:schoolId/messages/:messageId/read
messages.put('/:messageId/read', async (c) => {
    const messageId = c.req.param('messageId');
    await c.env.DB.prepare('UPDATE Message SET read = 1 WHERE id = ?').bind(messageId).run();
    return c.json({ message: 'Message marqué comme lu' });
});

export default messages;
