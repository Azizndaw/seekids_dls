import { getDB } from '../utils/db';
import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const cours = new Hono<Env>();

// GET /api/schools/:schoolId/cours
cours.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT co.*, d.name as disciplineName, c.nom as classeName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Cours co
     LEFT JOIN Discipline d ON co.disciplineId = d.id
     LEFT JOIN Classe c ON co.classeId = c.id
     LEFT JOIN AppUser u ON co.professeurId = u.id
     WHERE co.schoolId = ? ORDER BY co.jour, co.heure`
    ).bind(schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/cours/:coursId
cours.get('/:coursId', async (c) => {
    const coursId = c.req.param('coursId');
    const co = await getDB(c).prepare('SELECT * FROM Cours WHERE id = ?').bind(coursId).first();
    return co ? c.json(co) : c.json({ error: 'Cours non trouvé' }, 404);
});

// GET /api/schools/:schoolId/cours/classe/:classeId
cours.get('/classe/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT co.*, d.name as disciplineName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Cours co
     LEFT JOIN Discipline d ON co.disciplineId = d.id
     LEFT JOIN AppUser u ON co.professeurId = u.id
     WHERE co.classeId = ? AND co.schoolId = ?
     ORDER BY co.jour, co.heure`
    ).bind(classeId, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/cours/day/:day
cours.get('/day/:day', async (c) => {
    const day = c.req.param('day');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT co.*, d.name as disciplineName, c.nom as classeName, u.nom as professeurNom, u.prenom as professeurPrenom
     FROM Cours co
     LEFT JOIN Discipline d ON co.disciplineId = d.id
     LEFT JOIN Classe c ON co.classeId = c.id
     LEFT JOIN AppUser u ON co.professeurId = u.id
     WHERE co.jour = ? AND co.schoolId = ?
     ORDER BY co.heure`
    ).bind(day, schoolId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/cours/professeur/:professeurId
cours.get('/professeur/:professeurId', async (c) => {
    const professeurId = c.req.param('professeurId');
    const schoolId = c.req.param('schoolId');

    // First find teacher name to allow fallback matching by teacher name if ID differs
    const teacherUser = await getDB(c).prepare('SELECT nom, prenom FROM AppUser WHERE id = ?').bind(professeurId).first<{ nom: string; prenom: string }>();

    let query = `SELECT co.*, d.name as disciplineName, c.nom as classeName, c.niveau as classeNiveau
     FROM Cours co
     LEFT JOIN Discipline d ON co.disciplineId = d.id
     LEFT JOIN Classe c ON co.classeId = c.id
     WHERE (co.professeurId = ?`;

    const params: any[] = [professeurId];

    if (teacherUser && (teacherUser.nom || teacherUser.prenom)) {
        query += ` OR co.professeurId IN (SELECT id FROM AppUser WHERE schoolId = ? AND (LOWER(nom) = LOWER(?) OR LOWER(prenom) = LOWER(?)))`;
        params.push(schoolId, teacherUser.nom || '', teacherUser.prenom || '');
    }

    query += `) AND co.schoolId = ? ORDER BY co.jour, co.heure`;
    params.push(schoolId);

    const { results } = await getDB(c).prepare(query).bind(...params).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/cours/professeur/:professeurId/day/:day
cours.get('/professeur/:professeurId/day/:day', async (c) => {
    const { professeurId, day } = c.req.param();
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT co.*, d.name as disciplineName, c.nom as classeName
     FROM Cours co
     LEFT JOIN Discipline d ON co.disciplineId = d.id
     LEFT JOIN Classe c ON co.classeId = c.id
     WHERE co.professeurId = ? AND co.jour = ? AND co.schoolId = ?
     ORDER BY co.heure`
    ).bind(professeurId, day, schoolId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/cours
cours.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        `INSERT INTO Cours (id, jour, heure, disciplineId, classeId, professeurId, schoolId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.jour, body.heure, body.disciplineId, body.classeId, body.professeurId, schoolId).run();
    return c.json({ id, ...body }, 201);
});

// PUT /api/schools/:schoolId/cours/:coursId
cours.put('/:coursId', async (c) => {
    const coursId = c.req.param('coursId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE Cours SET jour = ?, heure = ?, disciplineId = ?, classeId = ?, professeurId = ? WHERE id = ?'
    ).bind(body.jour, body.heure, body.disciplineId, body.classeId, body.professeurId, coursId).run();
    return c.json({ message: 'Cours mis à jour' });
});

// DELETE /api/schools/:schoolId/cours/:coursId
cours.delete('/:coursId', async (c) => {
    const coursId = c.req.param('coursId');
    await getDB(c).prepare('DELETE FROM Cours WHERE id = ?').bind(coursId).run();
    return c.json({ message: 'Cours supprimé' });
});

// POST /api/schools/:schoolId/cours/generate
cours.post('/generate', async (c) => {
    return c.json({ message: 'Génération automatique non implémentée pour le moment' }, 501);
});

// POST /api/schools/:schoolId/cours/generate/classe/:classeId
cours.post('/generate/classe/:classeId', async (c) => {
    return c.json({ message: 'Génération automatique non implémentée pour le moment' }, 501);
});

export default cours;
