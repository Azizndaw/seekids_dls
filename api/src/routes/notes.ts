import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const notes = new Hono<Env>();

// GET /api/schools/:schoolId/notes
notes.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT n.*, d.name as disciplineName, s.nom as studentNom, s.prenom as studentPrenom, c.nom as classeName
     FROM Note n
     LEFT JOIN Discipline d ON n.disciplineId = d.id
     LEFT JOIN Student s ON n.studentId = s.id
     LEFT JOIN Classe c ON n.classeId = c.id
     WHERE n.schoolId = ? ORDER BY n.date DESC LIMIT 500`
    ).bind(schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/:noteId
notes.get('/:noteId', async (c) => {
    const noteId = c.req.param('noteId');
    const note = await c.env.DB.prepare('SELECT * FROM Note WHERE id = ?').bind(noteId).first();
    return note ? c.json(note) : c.json({ error: 'Note non trouvée' }, 404);
});

// GET /api/schools/:schoolId/notes/classes/:classeId
notes.get('/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT n.*, d.name as disciplineName, s.nom as studentNom, s.prenom as studentPrenom
     FROM Note n
     LEFT JOIN Discipline d ON n.disciplineId = d.id
     LEFT JOIN Student s ON n.studentId = s.id
     WHERE n.classeId = ? AND n.schoolId = ?
     ORDER BY n.date DESC`
    ).bind(classeId, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/students/:studentId
notes.get('/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    const { results } = await c.env.DB.prepare(
        `SELECT n.*, d.name as disciplineName FROM Note n
     LEFT JOIN Discipline d ON n.disciplineId = d.id
     WHERE n.studentId = ? ORDER BY n.date DESC`
    ).bind(studentId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/disciplines/:disciplineId/classes/:classeId
notes.get('/disciplines/:disciplineId/classes/:classeId', async (c) => {
    const { disciplineId, classeId } = c.req.param();
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT n.*, s.nom as studentNom, s.prenom as studentPrenom FROM Note n
     LEFT JOIN Student s ON n.studentId = s.id
     WHERE n.disciplineId = ? AND n.classeId = ? AND n.schoolId = ?
     ORDER BY s.nom`
    ).bind(disciplineId, classeId, schoolId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/notes
notes.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const records = Array.isArray(body) ? body : [body];
    const inserted = [];
    for (const n of records) {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(
            `INSERT INTO Note (id, classeId, type, devoir, note, date, appreciation, coefficient, disciplineId, studentId, professeurId, schoolId, semester, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`
        ).bind(id, n.classeId, n.type || 'NOTE', n.devoir ? 1 : 0, n.note, n.date, n.appreciation || null, n.coefficient || 1, n.disciplineId, n.studentId, n.professeurId, schoolId, n.semester || null).run();
        inserted.push({ id, ...n });
    }
    return c.json(inserted, 201);
});

// PUT /api/schools/:schoolId/notes/:noteId
notes.put('/:noteId', async (c) => {
    const noteId = c.req.param('noteId');
    const body = await c.req.json();
    await c.env.DB.prepare(
        'UPDATE Note SET note = ?, appreciation = ?, coefficient = ?, type = ?, semester = ? WHERE id = ?'
    ).bind(body.note, body.appreciation || null, body.coefficient || 1, body.type || 'NOTE', body.semester || null, noteId).run();
    return c.json({ message: 'Note mise à jour' });
});

// DELETE /api/schools/:schoolId/notes/:noteId
notes.delete('/:noteId', async (c) => {
    const noteId = c.req.param('noteId');
    await c.env.DB.prepare('DELETE FROM Note WHERE id = ?').bind(noteId).run();
    return c.json({ message: 'Note supprimée' });
});

// GET /api/schools/:schoolId/notes/averages/classes/:classeId
notes.get('/averages/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const { results } = await c.env.DB.prepare(
        `SELECT s.id as studentId, s.nom, s.prenom,
            ROUND(SUM(n.note * n.coefficient) / SUM(n.coefficient), 2) as moyenne
     FROM Note n
     INNER JOIN Student s ON n.studentId = s.id
     WHERE n.classeId = ?
     GROUP BY s.id ORDER BY moyenne DESC`
    ).bind(classeId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/averages/students/:studentId
notes.get('/averages/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    const { results } = await c.env.DB.prepare(
        `SELECT d.id as disciplineId, d.name as disciplineName,
            ROUND(SUM(n.note * n.coefficient) / SUM(n.coefficient), 2) as moyenne,
            COUNT(n.id) as nbNotes
     FROM Note n
     INNER JOIN Discipline d ON n.disciplineId = d.id
     WHERE n.studentId = ?
     GROUP BY d.id ORDER BY d.name`
    ).bind(studentId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/averages/schools
notes.get('/averages/schools', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await c.env.DB.prepare(
        `SELECT c.id as classeId, c.nom as classeName,
            ROUND(AVG(n.note), 2) as moyenne, COUNT(DISTINCT n.studentId) as nbEleves
     FROM Note n
     INNER JOIN Classe c ON n.classeId = c.id
     WHERE n.schoolId = ?
     GROUP BY c.id ORDER BY c.nom`
    ).bind(schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/averages/disciplines/:disciplineId/classes/:classeId
notes.get('/averages/disciplines/:disciplineId/classes/:classeId', async (c) => {
    const { disciplineId, classeId } = c.req.param();
    const { results } = await c.env.DB.prepare(
        `SELECT s.id as studentId, s.nom, s.prenom,
            ROUND(SUM(n.note * n.coefficient) / SUM(n.coefficient), 2) as moyenne
     FROM Note n
     INNER JOIN Student s ON n.studentId = s.id
     WHERE n.disciplineId = ? AND n.classeId = ?
     GROUP BY s.id ORDER BY moyenne DESC`
    ).bind(disciplineId, classeId).all();
    return c.json(results);
});

export default notes;
