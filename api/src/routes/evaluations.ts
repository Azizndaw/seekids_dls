import { getDB } from '../utils/db';
import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const evaluations = new Hono<Env>();

// GET /api/schools/:schoolId/evaluations
evaluations.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName, c.nom as classeName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Evaluation e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     LEFT JOIN Classe c ON e.classeId = c.id
     LEFT JOIN AppUser u ON e.professeurId = u.id
     WHERE e.schoolId = ? ORDER BY e.date DESC`
    ).bind(schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/evaluations/:evalId
evaluations.get('/:evalId', async (c) => {
    const evalId = c.req.param('evalId');
    const ev = await getDB(c).prepare('SELECT * FROM Evaluation WHERE id = ?').bind(evalId).first();
    return ev ? c.json(ev) : c.json({ error: 'Évaluation non trouvée' }, 404);
});

// GET /api/schools/:schoolId/evaluations/classe/:classeId
evaluations.get('/classe/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName FROM Evaluation e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     WHERE e.classeId = ? AND e.schoolId = ? ORDER BY e.date DESC`
    ).bind(classeId, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/evaluations/professeur/:professeurId
evaluations.get('/professeur/:professeurId', async (c) => {
    const professeurId = c.req.param('professeurId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName, c.nom as classeName FROM Evaluation e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     LEFT JOIN Classe c ON e.classeId = c.id
     WHERE e.professeurId = ? ORDER BY e.date DESC`
    ).bind(professeurId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/evaluations
evaluations.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        `INSERT INTO Evaluation (id, title, date, description, type, professeurId, disciplineId, classeId, schoolId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`
    ).bind(id, body.title, body.date, body.description || '', body.type || 'EVALUATION', body.professeurId, body.disciplineId, body.classeId, schoolId).run();
    return c.json({ id, ...body }, 201);
});

// PUT /api/schools/:schoolId/evaluations/:evalId
evaluations.put('/:evalId', async (c) => {
    const evalId = c.req.param('evalId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE Evaluation SET title = ?, date = ?, description = ?, type = ? WHERE id = ?'
    ).bind(body.title, body.date, body.description || '', body.type || 'EVALUATION', evalId).run();
    return c.json({ message: 'Évaluation mise à jour' });
});

// DELETE /api/schools/:schoolId/evaluations/:evalId
evaluations.delete('/:evalId', async (c) => {
    const evalId = c.req.param('evalId');
    await getDB(c).prepare('DELETE FROM Evaluation WHERE id = ?').bind(evalId).run();
    return c.json({ message: 'Évaluation supprimée' });
});

export default evaluations;
