import { getDB } from '../utils/db';
import { Hono } from 'hono';
type Env = { Bindings: { DB: D1Database } };
const notes = new Hono<Env>();

// GET /api/schools/:schoolId/notes
notes.get('/', async (c) => {
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
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
    const note = await getDB(c).prepare('SELECT * FROM Note WHERE id = ?').bind(noteId).first();
    return note ? c.json(note) : c.json({ error: 'Note non trouvée' }, 404);
});

// GET /api/schools/:schoolId/notes/professors/:professeurId
notes.get('/professors/:professeurId', async (c) => {
    const professeurId = c.req.param('professeurId');
    const { results } = await getDB(c).prepare(
        `SELECT n.*, d.name as disciplineName, s.nom as studentNom, s.prenom as studentPrenom, c.nom as classeName
     FROM Note n
     LEFT JOIN Discipline d ON n.disciplineId = d.id
     LEFT JOIN Student s ON n.studentId = s.id
     LEFT JOIN Classe c ON n.classeId = c.id
     WHERE n.professeurId = ? ORDER BY n.date DESC`
    ).bind(professeurId).all();
    return c.json(results);
});

// GET /api/schools/:schoolId/notes/classes/:classeId
notes.get('/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const schoolId = c.req.param('schoolId');
    const { results } = await getDB(c).prepare(
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
    const { results } = await getDB(c).prepare(
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
    const { results } = await getDB(c).prepare(
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
        await getDB(c).prepare(
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
    await getDB(c).prepare(
        'UPDATE Note SET note = ?, appreciation = ?, coefficient = ?, type = ?, semester = ? WHERE id = ?'
    ).bind(body.note, body.appreciation || null, body.coefficient || 1, body.type || 'NOTE', body.semester || null, noteId).run();
    return c.json({ message: 'Note mise à jour' });
});

// DELETE /api/schools/:schoolId/notes/:noteId
notes.delete('/:noteId', async (c) => {
    const noteId = c.req.param('noteId');
    await getDB(c).prepare('DELETE FROM Note WHERE id = ?').bind(noteId).run();
    return c.json({ message: 'Note supprimée' });
});

// GET /api/schools/:schoolId/notes/averages/classes/:classeId
notes.get('/averages/classes/:classeId', async (c) => {
    const classeId = c.req.param('classeId');
    const db = getDB(c);

    // 1. Get Class Info
    const classeInfo: any = await db.prepare("SELECT nom FROM Classe WHERE id = ?").bind(classeId).first();
    const className = classeInfo?.nom || "Inconnue";

    // 2. Class Stats
    const stats: any = await db.prepare(
        `SELECT COUNT(DISTINCT studentId) as studentCount, ROUND(AVG(note), 2) as average
         FROM Note WHERE classeId = ?`
    ).bind(classeId).first();

    // 3. Students Data
    const { results: studentsRaw } = await db.prepare(
        `SELECT s.id, s.nom, s.prenom, 
            ROUND(SUM(n.note * n.coefficient) / SUM(n.coefficient), 2) as generalAverage
         FROM Student s 
         JOIN Note n ON n.studentId = s.id
         WHERE n.classeId = ? 
         GROUP BY s.id ORDER BY generalAverage DESC`
    ).bind(classeId).all();

    // 4. Get ALL notes for this class to embed in studentsData
    const { results: allNotes } = await db.prepare(
        `SELECT n.id, n.note as grade, n.coefficient, n.type, n.devoir, n.date, n.appreciation, n.semester, n.disciplineId, n.professeurId, n.classeId, n.studentId, d.name as subject
         FROM Note n JOIN Discipline d ON n.disciplineId = d.id
         WHERE n.classeId = ?`
    ).bind(classeId).all();

    // 4b. Get ALL attendances for this class
    const { results: allAttendancesRaw } = await db.prepare(
        `SELECT sa.*, d.name as disciplineName FROM StudentAttendance sa LEFT JOIN Discipline d ON sa.disciplineId = d.id WHERE sa.studentId IN (SELECT id FROM Student WHERE classeId = ?)`
    ).bind(classeId).all();

    // Group attendance by student
    const attendanceByStudent: Record<string, any[]> = {};
    for (const a of allAttendancesRaw) {
        const sId = a.studentId as string;
        if (!attendanceByStudent[sId]) attendanceByStudent[sId] = [];
        attendanceByStudent[sId].push(a);
    }

    // 5. Group notes by student
    const gradesByStudent: Record<string, any[]> = {};
    for (const n of allNotes) {
        const sId = n.studentId as string;
        if (!gradesByStudent[sId]) gradesByStudent[sId] = [];
        gradesByStudent[sId].push({
            id: n.id,
            grade: n.grade,
            coefficient: n.coefficient,
            type: n.type,
            devoir: !!n.devoir,
            date: n.date,
            appreciation: n.appreciation,
            semestre: n.semester,
            disciplineId: n.disciplineId,
            professeurId: n.professeurId,
            classeId: n.classeId,
            subject: n.subject || "Matière Inconnue",
            title: n.type
        });
    }

    const studentsData = studentsRaw.map((s: any) => {
        const studentGrades = gradesByStudent[s.id] || [];

        // Calculate subjectAverages
        const subjTotals: Record<string, { sum: number, weight: number }> = {};
        for (const g of studentGrades) {
            if (!subjTotals[g.subject]) subjTotals[g.subject] = { sum: 0, weight: 0 };
            subjTotals[g.subject].sum += (g.grade * g.coefficient);
            subjTotals[g.subject].weight += g.coefficient;
        }
        const subjectAverages: Record<string, number> = {};
        for (const subj in subjTotals) {
            const m = subjTotals[subj].weight > 0 ? (subjTotals[subj].sum / subjTotals[subj].weight) : 0;
            subjectAverages[subj] = Number(m.toFixed(2));
        }

        return {
            id: s.id,
            firstName: s.prenom,
            lastName: s.nom,
            classe: className,
            generalAverage: s.generalAverage || 0,
            grades: studentGrades,
            attendance: attendanceByStudent[s.id] || [],
            subjectAverages
        };
    });

    return c.json({
        classeId,
        classe: className,
        students: stats?.studentCount || 0,
        average: stats?.average ? String(stats.average) : "0",
        successRate: "0%",
        studentsData,
        subjectReports: []
    });
});

// GET /api/schools/:schoolId/notes/averages/students/:studentId
notes.get('/averages/students/:studentId', async (c) => {
    const studentId = c.req.param('studentId');
    const { results } = await getDB(c).prepare(
        `SELECT d.id as disciplineId, d.name as disciplineName,
            ROUND(AVG(n.note), 2) as moyenne,
            ROUND(SUM(n.note * n.coefficient) / SUM(n.coefficient), 2) as moyennePonderee,
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
    const db = getDB(c);

    // 1. Overall School Average
    const schoolAvgRes: any = await db.prepare(
        `SELECT ROUND(AVG(note), 2) as moyenne FROM Note WHERE schoolId = ?`
    ).bind(schoolId).first();
    const schoolAverage = schoolAvgRes?.moyenne ? String(schoolAvgRes.moyenne) : "0";

    // 2. School Success Rate (% of students with average >= 10)
    const successRes: any = await db.prepare(
        `SELECT 
            COUNT(*) as totalStudents,
            SUM(CASE WHEN studentAverage >= 10 THEN 1 ELSE 0 END) as passedStudents
         FROM (
            SELECT studentId, AVG(note) as studentAverage
            FROM Note WHERE schoolId = ? GROUP BY studentId
         )`
    ).bind(schoolId).first();
    const total = successRes?.totalStudents || 0;
    const passed = successRes?.passedStudents || 0;
    const schoolSuccessRate = total > 0 ? ((passed / total) * 100).toFixed(2) + "%" : "0%";

    // 3. Disciplines Count
    const discRes: any = await db.prepare(
        `SELECT COUNT(DISTINCT disciplineId) as count FROM Note WHERE schoolId = ?`
    ).bind(schoolId).first();
    const disciplinesCount = discRes?.count || 0;

    // 4. Overall Subject Reports
    const { results: subjectRaw } = await db.prepare(
        `SELECT d.name as subject, ROUND(AVG(n.note), 2) as average
         FROM Note n JOIN Discipline d ON n.disciplineId = d.id
         WHERE n.schoolId = ? GROUP BY d.id`
    ).bind(schoolId).all();
    const subjectReports = subjectRaw.map((s: any) => ({
        subject: s.subject,
        average: s.average ? String(s.average) : "0"
    }));

    // 5. Class Averages
    const { results: classesRaw } = await db.prepare(
        `SELECT c.id as classeId, c.nom as classeName, count(DISTINCT n.studentId) as students,
         ROUND(AVG(n.note), 2) as average,
         COUNT(n.id) as totalNotes, SUM(CASE WHEN n.note >= 10 THEN 1 ELSE 0 END) as passedNotes
         FROM Classe c LEFT JOIN Note n ON n.classeId = c.id
         WHERE c.schoolId = ? GROUP BY c.id ORDER BY c.nom`
    ).bind(schoolId).all();

    const classAverages = classesRaw.map((cRaw: any) => ({
        classeId: cRaw.classeId,
        classe: cRaw.classeName,
        students: cRaw.students,
        average: cRaw.average ? String(cRaw.average) : "0",
        successRate: cRaw.totalNotes > 0 ? ((cRaw.passedNotes / cRaw.totalNotes) * 100).toFixed(2) + "%" : "0%",
        subjectReports: []
    }));

    return c.json({
        schoolAverage,
        schoolSuccessRate,
        disciplinesCount,
        classAverages,
        subjectReports
    });
});

export default notes;
