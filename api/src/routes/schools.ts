import { getDB } from '../utils/db';
import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const schools = new Hono<Env>();

// GET /api/schools/:schoolId
schools.get('/:schoolId', async (c) => {
    const schoolId = c.req.param('schoolId');
    const school = await getDB(c).prepare('SELECT * FROM School WHERE id = ?').bind(schoolId).first();
    if (!school) return c.json({ error: 'École non trouvée' }, 404);
    return c.json(school);
});

// PUT /api/schools/:schoolId
schools.put('/:schoolId', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const { name, adresse, email, telephone, siteWeb } = body;
    await getDB(c).prepare(
        'UPDATE School SET name = ?, adresse = ?, email = ?, telephone = ?, siteWeb = ? WHERE id = ?'
    ).bind(name, adresse, email, telephone, siteWeb, schoolId).run();
    return c.json({ message: 'École mise à jour' });
});

// GET /api/schools/:schoolId/teachers
schools.get('/:schoolId/teachers', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.schoolId, u.createdAt as created_at,
            u.biographie, u.adresse,
            GROUP_CONCAT(DISTINCT r.name) as role,
            GROUP_CONCAT(DISTINCT d.id) as disciplineIds,
            GROUP_CONCAT(DISTINCT d.name) as disciplineNames
     FROM AppUser u
     LEFT JOIN UserRole ur ON u.id = ur.userId
     LEFT JOIN Role r ON ur.roleId = r.id
     LEFT JOIN "_TeacherDisciplines" td ON u.id = td.A
     LEFT JOIN Discipline d ON td.B = d.id
     WHERE u.schoolId = ?
     GROUP BY u.id
     ORDER BY u.nom`
    ).bind(schoolId).all();

    const teachers = results.map((t: any) => ({
        ...t,
        disciplines: t.disciplineNames
            ? t.disciplineNames.split(',').map((name: string, i: number) => ({
                id: t.disciplineIds.split(',')[i],
                name
            }))
            : []
    }));

    return c.json(teachers);
});

// PUT /api/schools/:schoolId/teachers/:teacherId
schools.put('/:schoolId/teachers/:teacherId', async (c) => {
    const teacherId = c.req.param('teacherId');
    const body = await c.req.json();
    const { nom, prenom, email, telephone, biographie, adresse } = body;
    await getDB(c).prepare(
        'UPDATE AppUser SET nom = ?, prenom = ?, email = ?, telephone = ?, biographie = ?, adresse = ? WHERE id = ?'
    ).bind(nom, prenom, email, telephone, biographie || null, adresse || null, teacherId).run();
    return c.json({ message: 'Professeur mis à jour' });
});

// --- Students ---
// GET /api/schools/:schoolId/students
schools.get('/:schoolId/students', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT s.*, c.nom as classeName FROM Student s
     LEFT JOIN Classe c ON s.classeId = c.id
     WHERE s.schoolId = ?
     ORDER BY s.nom`
    ).bind(schoolId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/students
schools.post('/:schoolId/students', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        'INSERT INTO Student (id, nom, prenom, dateOfBirth, schoolId, classeId, parentId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(id, body.nom, body.prenom, body.dateOfBirth, schoolId, body.classe, body.parentId || null).run();
    return c.json({ id, ...body, schoolId }, 201);
});

// PUT /api/schools/:schoolId/students/:studentId
schools.put('/:schoolId/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE Student SET nom = ?, prenom = ?, dateOfBirth = ?, classeId = ?, parentId = ? WHERE id = ?'
    ).bind(body.nom, body.prenom, body.dateOfBirth || null, body.classeId || body.classe, body.parentId || null, studentId).run();
    return c.json({ message: 'Élève mis à jour' });
});

// DELETE /api/schools/:schoolId/students/:studentId
schools.delete('/:schoolId/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    await getDB(c).prepare('DELETE FROM Student WHERE id = ?').bind(studentId).run();
    return c.json({ message: 'Élève supprimé' });
});

// --- Classes ---
// GET /api/schools/:schoolId/classes
schools.get('/:schoolId/classes', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results: classes } = await getDB(c).prepare(
        'SELECT * FROM Classe WHERE schoolId = ? ORDER BY nom'
    ).bind(schoolId).all();

    // Attach students and teachers to each class
    for (const cls of classes as any[]) {
        const { results: students } = await getDB(c).prepare(
            'SELECT * FROM Student WHERE classeId = ? ORDER BY nom'
        ).bind(cls.id).all();
        cls.students = students;

        const { results: teachers } = await getDB(c).prepare(
            `SELECT u.id, u.nom, u.prenom, u.email FROM AppUser u
       INNER JOIN Cours co ON u.id = co.professeurId AND co.classeId = ?
       WHERE u.schoolId = ?
       GROUP BY u.id`
        ).bind(cls.id, schoolId).all();
        cls.teachers = teachers;
    }

    return c.json(classes);
});

// POST /api/schools/:schoolId/classes
schools.post('/:schoolId/classes', async (c) => {
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await getDB(c).prepare(
        'INSERT INTO Classe (id, nom, niveau, schoolId) VALUES (?, ?, ?, ?)'
    ).bind(id, body.nom, body.niveau || '', schoolId).run();
    return c.json({ id, nom: body.nom, niveau: body.niveau, schoolId }, 201);
});

// PUT /api/schools/:schoolId/classes/:classeId
schools.put('/:schoolId/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const body = await c.req.json();
    await getDB(c).prepare('UPDATE Classe SET nom = ?, niveau = ? WHERE id = ?').bind(body.nom, body.niveau || '', classeId).run();
    return c.json({ message: 'Classe mise à jour' });
});

// DELETE /api/schools/:schoolId/classes/:classeId
schools.delete('/:schoolId/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    await getDB(c).prepare('DELETE FROM Classe WHERE id = ?').bind(classeId).run();
    return c.json({ message: 'Classe supprimée' });
});

// PUT /api/schools/:schoolId/classes/:classeId/assignTeacher
schools.put('/:schoolId/classes/:classeId/assignTeacher', async (c) => {
    const classeId = c.req.param('classeId');
    const { professeurId } = await c.req.json();
    // Add assignment logic (via Cours or a join table)
    return c.json({ message: 'Professeur assigné' });
});

// PUT /api/schools/:schoolId/classes/:classeId/revokeTeacher
schools.put('/:schoolId/classes/:classeId/revokeTeacher', async (c) => {
    const classeId = c.req.param('classeId');
    const { professeurId } = await c.req.json();
    return c.json({ message: 'Professeur retiré' });
});

// --- Parents ---
// GET /api/schools/:schoolId/parents
schools.get('/:schoolId/parents', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
        `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.schoolId, u.createdAt as created_at,
            u.profession, u.adresse
     FROM AppUser u
     INNER JOIN UserRole ur ON u.id = ur.userId
     INNER JOIN Role r ON ur.roleId = r.id
     WHERE u.schoolId = ? AND r.name = 'PARENT'
     ORDER BY u.nom`
    ).bind(schoolId).all();
    return c.json(results);
});

// PUT /api/schools/:schoolId/parents/:parentId
schools.put('/:schoolId/parents/:parentId', async (c) => {
    const parentId = c.req.param('parentId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE AppUser SET nom = ?, prenom = ?, email = ?, telephone = ?, profession = ?, adresse = ? WHERE id = ?'
    ).bind(body.nom, body.prenom, body.email, body.telephone || null, body.profession || null, body.adresse || null, parentId).run();
    return c.json({ message: 'Parent mis à jour' });
});

// --- Disciplines ---
// GET /api/schools/:schoolId/disciplines
schools.get('/:schoolId/disciplines', async (c) => {
    const { results } = await getDB(c).prepare('SELECT * FROM Discipline ORDER BY name').all();
    return c.json(results);
});

// --- Student Attendance ---
// GET /api/schools/:schoolId/students/:studentId/attendance
schools.get('/:schoolId/students/:studentId/attendance', async (c) => {
    const studentId = c.req.param('studentId');
    const { results } = await getDB(c).prepare(
        `SELECT sa.*, d.name as disciplineName FROM StudentAttendance sa
     LEFT JOIN Discipline d ON sa.disciplineId = d.id
     WHERE sa.studentId = ?
     ORDER BY sa.date DESC`
    ).bind(studentId).all();
    return c.json(results);
});

// POST /api/schools/:schoolId/attendance
schools.post('/:schoolId/attendance', async (c) => {
    const body = await c.req.json();
    const records = Array.isArray(body) ? body : [body];
    for (const record of records) {
        const id = crypto.randomUUID();
        await getDB(c).prepare(
            'INSERT INTO StudentAttendance (id, studentId, disciplineId, type, date, reason) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, record.studentId, record.disciplineId, record.type, record.date, record.reason || null).run();
    }
    return c.json({ message: 'Présences enregistrées' }, 201);
});

export default schools;
