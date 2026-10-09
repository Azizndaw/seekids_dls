import { getDB } from '../utils/db';
import { Hono } from 'hono';

type Env = { Bindings: { DB: D1Database } };
const schools = new Hono<Env>();

// GET /api/schools/:schoolId
schools.get('/:schoolId', async (c) => {
    const schoolId = c.req.param('schoolId');
    const school: any = await getDB(c).prepare('SELECT * FROM School WHERE id = ?').bind(schoolId).first();
    if (!school) return c.json({ error: 'École non trouvée' }, 404);

    // Polyfill the Prisma _count object
    const studentCount = await getDB(c).prepare('SELECT COUNT(*) as c FROM Student WHERE schoolId = ?').bind(schoolId).first();
    const classCount = await getDB(c).prepare('SELECT COUNT(*) as c FROM Classe WHERE schoolId = ?').bind(schoolId).first();
    const teacherCount = await getDB(c).prepare(
        'SELECT COUNT(DISTINCT u.id) as c FROM AppUser u INNER JOIN UserRole ur ON u.id = ur.userId INNER JOIN Role r ON ur.roleId = r.id WHERE u.schoolId = ? AND r.name = "TEACHER"'
    ).bind(schoolId).first();

    school._count = {
        students: (studentCount as any).c || 0,
        classes: (classCount as any).c || 0,
        teachers: (teacherCount as any).c || 0,
    };
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

// PUT /api/schools/:schoolId/assign-disciplines
schools.put('/:schoolId/assign-disciplines', async (c) => {
    const body = await c.req.json();
    const { teacherId, disciplineIds } = body;

    // Clear old mappings
    await getDB(c).prepare('DELETE FROM "_TeacherDisciplines" WHERE A = ?').bind(teacherId).run();

    // Insert new mappings
    for (const disciplineId of disciplineIds) {
        await getDB(c).prepare('INSERT INTO "_TeacherDisciplines" (A, B) VALUES (?, ?)').bind(teacherId, disciplineId).run();
    }
    return c.json({ message: 'Disciplines assignées avec succès' });
});

// PUT /api/schools/:schoolId/teachers/:teacherId
schools.put('/:schoolId/teachers/:teacherId', async (c) => {
    const teacherId = c.req.param('teacherId');
    const body = await c.req.json();
    const { nom, prenom, email, telephone, biographie, adresse, classes } = body;
    await getDB(c).prepare(
        'UPDATE AppUser SET nom = ?, prenom = ?, email = ?, telephone = ?, biographie = ?, adresse = ? WHERE id = ?'
    ).bind(nom, prenom, email, telephone || '', biographie || '', adresse || '', teacherId).run();

    if (classes && Array.isArray(classes)) {
        await getDB(c).prepare('DELETE FROM ClasseProfesseur WHERE professeurId = ?').bind(teacherId).run();
        for (const classeId of classes) {
            await getDB(c).prepare('INSERT INTO ClasseProfesseur (classeId, professeurId) VALUES (?, ?)').bind(classeId, teacherId).run();
        }
    }

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
    const lieuNaissance = body.lieu_naissance || body.lieuOfBirth || 'Dakar';
    await getDB(c).prepare(
        'INSERT INTO Student (id, nom, prenom, dateOfBirth, lieu_naissance, schoolId, classeId, parentId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(id, body.nom, body.prenom, body.dateOfBirth, lieuNaissance, schoolId, body.classe || body.classeId, body.parentId || null).run();
    return c.json({ id, ...body, lieu_naissance: lieuNaissance, schoolId }, 201);
});

// PUT /api/schools/:schoolId/students/:studentId
schools.put('/:schoolId/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    const body = await c.req.json();
    const lieuNaissance = body.lieu_naissance || body.lieuOfBirth || 'Dakar';
    await getDB(c).prepare(
        'UPDATE Student SET nom = ?, prenom = ?, dateOfBirth = COALESCE(?, dateOfBirth), lieu_naissance = COALESCE(?, lieu_naissance), classeId = COALESCE(?, classeId), parentId = COALESCE(?, parentId) WHERE id = ?'
    ).bind(body.nom, body.prenom, body.dateOfBirth || null, lieuNaissance, body.classeId || body.classe || null, body.parentId || null, studentId).run();
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
            `SELECT s.*,
             (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('ABSCENCE', 'ABSENCE', 'absent')) as abscence,
             (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('RETARD', 'late')) as retards,
             (SELECT ROUND(SUM(n.note * n.coefficient) / NULLIF(SUM(n.coefficient), 0), 2) FROM Note n WHERE n.studentId = s.id) as moyenne
             FROM Student s WHERE classeId = ? ORDER BY nom`
        ).bind(cls.id).all();
        cls.students = students;

        const { results: teachers } = await getDB(c).prepare(
            `SELECT u.id, u.nom, u.prenom, u.email FROM AppUser u
       INNER JOIN ClasseProfesseur cp ON u.id = cp.professeurId AND cp.classeId = ?
       WHERE u.schoolId = ?
       GROUP BY u.id`
        ).bind(cls.id, schoolId).all();
        cls.teachers = teachers;
        cls.professeurs = teachers.map((t: any) => ({
            professeurId: t.id,
            professeur: {
                id: t.id,
                nom: t.nom,
                prenom: t.prenom,
                email: t.email
            }
        }));
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
    const schoolId = c.req.param('schoolId');
    const body = await c.req.json();
    const records = Array.isArray(body) ? body : [body];
    const db = getDB(c);

    // Extract authenticated user to satisfy Notification senderId NOT NULL constraint
    let senderId: string | undefined;
    try {
        const payload: any = c.get('user' as never);
        senderId = payload?.userId;
    } catch (e) { }

    // Failsafe: if context is lost, assign the first admin as the notification sender
    if (!senderId) {
        const fallback: any = await db.prepare("SELECT id FROM AppUser WHERE role = 'ADMIN' LIMIT 1").first();
        senderId = fallback?.id;
    }

    // If absolutely no sender can be assigned, gracefully skip notifications rather than crashing 500
    const canNotify = !!senderId;

    for (const record of records) {
        const id = crypto.randomUUID();
        await db.prepare(
            'INSERT INTO StudentAttendance (id, studentId, disciplineId, type, date, reason) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, record.studentId, record.disciplineId, record.type, record.date, record.reason || null).run();

        // --- NOTIFICATION BROADCAST LOGIC ---
        const studentInfo: any = await db.prepare(
            `SELECT s.parentId, s.nom, s.prenom, c.nom as className, c.niveau as classNiveau FROM Student s LEFT JOIN Classe c ON s.classeId = c.id WHERE s.id = ?`
        ).bind(record.studentId).first();

        if (studentInfo && canNotify) {
            const dateStr = record.date ? new Date(record.date).toLocaleDateString('fr-FR') : 'Aujourd\'hui';
            const actionStr = record.type === 'ABSCENCE' || record.type === 'ABSENCE' ? 'marqué(e) absent(e)' : 'marqué(e) en retard';
            const content = `Votre enfant ${studentInfo.prenom} ${studentInfo.nom} a été ${actionStr} le ${dateStr}.`;
            const adminContent = `L'élève ${studentInfo.prenom} ${studentInfo.nom} (${studentInfo.classNiveau} ${studentInfo.className}) a été ${actionStr} le ${dateStr}.`;

            // Notify Parent
            if (studentInfo.parentId) {
                await db.prepare(
                    `INSERT INTO Notification (id, senderId, receiverId, receiverType, type, urgent, content, schoolId, opened, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime("now"))`
                ).bind(crypto.randomUUID(), senderId, studentInfo.parentId, 'PARENT', 'ATTENDANCE', record.type.includes('ABSCENCE') ? 1 : 0, content, schoolId).run();
            }

            // Notify Admins
            const admins = await db.prepare(`SELECT id FROM AppUser WHERE role = 'ADMIN' AND schoolId = ?`).bind(schoolId).all();
            for (const admin of admins.results) {
                await db.prepare(
                    `INSERT INTO Notification (id, senderId, receiverId, receiverType, type, urgent, content, schoolId, opened, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime("now"))`
                ).bind(crypto.randomUUID(), senderId, (admin as any).id, 'ADMIN', 'ATTENDANCE', record.type.includes('ABSCENCE') ? 1 : 0, adminContent, schoolId).run();
            }
        }
    }
    return c.json({ message: 'Présences enregistrées et notifications envoyées' }, 201);
});

// PUT /api/schools/:schoolId/attendance/:attendanceId
schools.put('/:schoolId/attendance/:attendanceId', async (c) => {
    const attendanceId = c.req.param('attendanceId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE StudentAttendance SET type = COALESCE(?, type), date = COALESCE(?, date), reason = COALESCE(?, reason) WHERE id = ?'
    ).bind(body.type || null, body.date || null, body.reason || null, attendanceId).run();
    return c.json({ message: 'Présence mise à jour' });
});

// PATCH /api/schools/:schoolId/attendance/:attendanceId
schools.patch('/:schoolId/attendance/:attendanceId', async (c) => {
    const attendanceId = c.req.param('attendanceId');
    const body = await c.req.json();
    await getDB(c).prepare(
        'UPDATE StudentAttendance SET reason = ? WHERE id = ?'
    ).bind(body.reason || null, attendanceId).run();
    return c.json({ message: 'Présence justifiée' });
});

// DELETE /api/schools/:schoolId/attendance/:attendanceId
schools.delete('/:schoolId/attendance/:attendanceId', async (c) => {
    const attendanceId = c.req.param('attendanceId');
    await getDB(c).prepare('DELETE FROM StudentAttendance WHERE id = ?').bind(attendanceId).run();
    return c.json({ message: 'Présence supprimée' });
});

export default schools;
