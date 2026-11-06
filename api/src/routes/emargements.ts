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

    const NDAW_ID = 'd8a08b24-1da8-4583-847b-547588c3c1ed';
    const isNdaw = body.professeurId === NDAW_ID;

    // Empêcher le double émargement d'un même professeur sur le même créneau horaire (classes réunies)
    if (body.professeurId && body.debut && body.fin && !isNdaw) {
        const datePrefix = String(body.debut).split('T')[0];
        const existing = await db.prepare(
            `SELECT id, classeId FROM Emargement
             WHERE schoolId = ?
               AND professeurId = ?
               AND substr(debut, 1, 10) = ?
               AND debut < ?
               AND fin > ?
             LIMIT 1`
        ).bind(schoolId, body.professeurId, datePrefix, body.fin, body.debut).first<{ id: string; classeId: string }>();

        if (existing) {
            for (const cid of requestedClassIds) {
                await db.prepare('INSERT OR IGNORE INTO EmargementClasse (emargementId, classeId) VALUES (?, ?)')
                    .bind(existing.id, cid).run();
            }
            return c.json({
                reason: 'Ce créneau horaire a déjà été émargé (les classes réunies sur un même créneau comptent pour un seul émargement).',
                existingId: existing.id,
            }, 409);
        }
    }

    // Si créneau commun entre classes jumelées (6eA/6eB, 1er L2/1er S2, TL2/TS2), rattacher l'émargement principal à la classe principale
    const PRIMARY_CLASS_PAIRS: Record<string, string> = {
        '6eb00000-656b-4c14-829f-24dd2b7449b5': '9013291a-656b-4c14-829f-24dd2b7449b5', // 6eB -> 6eA
        'b24987ca-ccc1-428f-bc1e-f91199f70d6e': '578bfef5-8692-4986-8bed-0576be151625', // 1er S2 -> 1er L2
        'b22d366d-78c1-4bba-b591-f08c34ad48ce': 'd581327b-6148-4aa0-8ec5-be5aac783ac0', // TS2 -> TL2
    };

    let primaryClasseId = body.classeId;
    const pairedPrimary = PRIMARY_CLASS_PAIRS[body.classeId];
    if (pairedPrimary && !isNdaw && requestedClassIds.includes(pairedPrimary)) {
        primaryClasseId = pairedPrimary;
    }

    const id = crypto.randomUUID();
    await db.prepare(
        `INSERT INTO Emargement (id, classeId, disciplineId, professeurId, debut, fin, seanceCounter, content, additionalInfo, schoolId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`
    ).bind(id, primaryClasseId, body.disciplineId, body.professeurId, body.debut, body.fin, body.seanceCounter || 1, body.content || '', body.additionalInfo || null, schoolId).run();

    for (const classeId of requestedClassIds) {
        await db.prepare('INSERT OR IGNORE INTO EmargementClasse (emargementId, classeId) VALUES (?, ?)')
            .bind(id, classeId).run();
    }
    return c.json({ id, ...body, classeId: primaryClasseId, classes: requestedClassIds }, 201);
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
