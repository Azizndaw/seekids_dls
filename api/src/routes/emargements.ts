import { getDB } from '../utils/db';
import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const emargements = new Hono<Env>();

// GET /api/schools/:schoolId/emargements
emargements.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName, c.nom as classeName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Emargement e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     LEFT JOIN Classe c ON e.classeId = c.id
     LEFT JOIN AppUser u ON e.professeurId = u.id
     WHERE e.schoolId = ? ORDER BY e.debut DESC LIMIT 200`
    ).bind(schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/emargements/professeur/:professeurId
emargements.get('/professeur/:professeurId', async (c) => {
    const professeurId = c.req.param('professeurId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName, c.nom as classeName
     FROM Emargement e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     LEFT JOIN Classe c ON e.classeId = c.id
     WHERE e.professeurId = ? AND e.schoolId = ?
     ORDER BY e.debut DESC`
    ).bind(professeurId, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/emargements/classe/:classeId
emargements.get('/classe/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT e.*, d.name as disciplineName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Emargement e
     LEFT JOIN Discipline d ON e.disciplineId = d.id
     LEFT JOIN AppUser u ON e.professeurId = u.id
     WHERE e.classeId = ? AND e.schoolId = ?
     ORDER BY e.debut DESC`
    ).bind(classeId, schoolId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/emargements
emargements.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        `INSERT INTO Emargement (id, classeId, disciplineId, professeurId, debut, fin, seanceCounter, content, additionalInfo, schoolId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`
    ).bind(id, body.classeId, body.disciplineId, body.professeurId, body.debut, body.fin, body.seanceCounter || 1, body.content || '', body.additionalInfo || null, schoolId).run();
    return c.json({ id, ...body }, 201);
});

// PUT /api/schools/:schoolId/emargements/:emargementId
emargements.put('/:emargementId', async (c) => {
    const emargementId = c.req.param('emargementId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE Emargement SET debut = ?, fin = ?, content = ?, additionalInfo = ? WHERE id = ?'
    ).bind(body.debut, body.fin, body.content || '', body.additionalInfo || null, emargementId).run();
    return c.json({ message: 'Émargement mis à jour' });
});

// DELETE /api/schools/:schoolId/emargements/:emargementId
emargements.delete('/:emargementId', async (c) => {
    const emargementId = c.req.param('emargementId');
    await getDB(c).prepare('DELETE FROM Emargement WHERE id = ?').bind(emargementId).run();
    return c.json({ message: 'Émargement supprimé' });
});

export default emargements;
