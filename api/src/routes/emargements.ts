import { getDB } from '../utils/db';
import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const emargements = new Hono<Env>();

const attendanceSelect = `SELECT e.*, d.name as disciplineName, c.nom as classeName, c.niveau as classeNiveau,
    u.nom as professeurNom, u.prenom as professeurPrenom,
    (SELECT json_group_array(json_object('id', linkedClass.id, 'nom', linkedClass.nom, 'niveau', linkedClass.niveau))
     FROM EmargementClasse ec
     JOIN Classe linkedClass ON linkedClass.id = ec.classeId
     WHERE ec.emargementId = e.id) as classesJson
    FROM Emargement e
    LEFT JOIN Discipline d ON e.disciplineId = d.id
    LEFT JOIN Classe c ON e.classeId = c.id
    LEFT JOIN AppUser u ON e.professeurId = u.id`;

const parseClasses = (row: any) => ({
    ...row,
    classes: row.classesJson ? JSON.parse(row.classesJson) : [{
        id: row.classeId,
        nom: row.classeName,
        niveau: row.classeNiveau || '',
    }],
});

// GET /api/schools/:schoolId/emargements
emargements.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `${attendanceSelect} WHERE e.schoolId = ? ORDER BY e.debut DESC`
    ).bind(schoolId).all();
    return c.json(results.map(parseClasses));
});

// GET /api/schools/:schoolId/emargements/professeur/:professeurId
emargements.get('/professeur/:professeurId', async (c) => {
    const professeurId = c.req.param('professeurId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `${attendanceSelect} WHERE e.professeurId = ? AND e.schoolId = ? ORDER BY e.debut DESC`
    ).bind(professeurId, schoolId).all();
    return c.json(results.map(parseClasses));
});

// GET /api/schools/:schoolId/emargements/classe/:classeId
emargements.get('/classe/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `${attendanceSelect}
         WHERE e.schoolId = ? AND EXISTS (
             SELECT 1 FROM EmargementClasse ec WHERE ec.emargementId = e.id AND ec.classeId = ?
         )
         ORDER BY e.debut DESC`
    ).bind(schoolId, classeId).all();
    return c.json(results.map(parseClasses));
});

// POST /api/schools/:schoolId/emargements
emargements.post('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    let requestedClassIds = Array.isArray(body.classeIds) ? [...new Set(body.classeIds)] : [body.classeId];
    const db = getDB(c);

    if (!body.classeId || !requestedClassIds.includes(body.classeId)) {
        return c.json({ reason: 'Classe invalide ou non spécifiée.' }, 400);
    }

    const id = crypto.randomUUID();
    await db.prepare(
        `INSERT INTO Emargement (id, classeId, disciplineId, professeurId, debut, fin, seanceCounter, content, additionalInfo, schoolId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`
    ).bind(id, body.classeId, body.disciplineId, body.professeurId, body.debut, body.fin, body.seanceCounter || 1, body.content || '', body.additionalInfo || null, schoolId).run();

    for (const classeId of requestedClassIds) {
        await db.prepare('INSERT OR IGNORE INTO EmargementClasse (emargementId, classeId) VALUES (?, ?)')
            .bind(id, classeId).run();
    }
    return c.json({ id, ...body, classes: requestedClassIds }, 201);
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
