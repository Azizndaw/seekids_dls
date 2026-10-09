import { getDB } from '../utils/db';
import { Hono } from 'hono';
import { signToken, hashPassword, verifyPassword, type JWTPayload } from '../utils/jwt';

type Env = { Bindings: { DB: D1Database } };
const auth = new Hono<Env>();

// POST /api/auth/login
auth.post('/login', async (c) => {
    const { email, password, schoolName, role } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400);

    const school = await getDB(c).prepare('SELECT id, name FROM School WHERE name = ?').bind(schoolName).first();
    if (!school) return c.json({ error: 'École non trouvée' }, 404);

    // Find user
    const sanitizedEmail = email ? email.replace(/\s+/g, '') : '';
    const digitsOnly = sanitizedEmail.replace(/[^0-9]/g, ''); // Extract digits only

    // Normalize phone number to 221XXXXXXXXX if 9 digits
    let phone221 = digitsOnly;
    if (digitsOnly.length === 9) {
        phone221 = '221' + digitsOnly;
    } else if (digitsOnly.startsWith('00221')) {
        phone221 = digitsOnly.substring(2);
    }

    let userQuery = 'SELECT u.*, GROUP_CONCAT(r.name) as roles FROM AppUser u LEFT JOIN UserRole ur ON u.id = ur.userId LEFT JOIN Role r ON ur.roleId = r.id WHERE (u.email = ? OR u.telephone = ? OR u.telephone = ? OR (u.telephone IS NOT NULL AND u.telephone LIKE ?)) AND u.schoolId = ? GROUP BY u.id';

    let safeRole = '';
    if (role) {
        safeRole = role.replace(/[^A-Z]/g, '');
        userQuery += ` HAVING roles LIKE '%${safeRole}%'`;
    }

    const searchPattern = (digitsOnly && digitsOnly.length >= 7) ? `%${digitsOnly.slice(-9)}%` : '__NO_MATCH__';
    const user = await getDB(c).prepare(userQuery).bind(
        sanitizedEmail,
        phone221,
        digitsOnly,
        searchPattern,
        school.id
    ).first();

    if (!user) return c.json({ error: 'Identifiants incorrects' }, 401);

    const roles = (user.roles as string || '').split(',').filter(Boolean);

    // Verify password
    let valid = await verifyPassword(password, user.password as string);

    // Fallbacks apply ONLY when logging in under PARENT or TEACHER profiles respectively
    if (!valid && role === 'PARENT' && roles.includes('PARENT')) {
        // Universal fallback for default parent password Dls2026
        if (password.trim().toLowerCase() === 'dls2026') {
            valid = true;
        } else {
            valid = await verifyPassword('Dls2026', user.password as string);
        }
    } else if (!valid && role === 'TEACHER' && roles.includes('TEACHER')) {
        // Universal fallback for default teacher password Seekids2027
        if (password.trim().toLowerCase() === 'seekids2027') {
            valid = true;
        } else {
            valid = await verifyPassword('Seekids2027', user.password as string);
        }
    }

    if (!valid) return c.json({ error: 'Identifiants incorrects' }, 401);

    const payload: JWTPayload = {
        userId: user.id as string,
        email: user.email as string,
        nom: user.nom as string,
        prenom: user.prenom as string,
        role: roles,
        schoolId: user.schoolId as string,
        telephone: user.telephone as string || undefined,
        est_approuve: true,
        created_at: user.createdAt as string,
    };

    const token = await signToken(payload);
    return c.json({ token, user: payload });
});

// POST /api/auth/register
auth.post('/register', async (c) => {
    const body = await c.req.json();
    const { nom, prenom, email, password, roles, schoolId, telephone, disciplineIds } = body;

    if (!password || !nom || !prenom) {
        return c.json({ error: 'Champs requis manquants' }, 400);
    }

    // Check if user exists (if email is provided)
    if (email && email.trim() !== '') {
        const existing = await getDB(c).prepare('SELECT id FROM AppUser WHERE email = ? AND schoolId = ?').bind(email, schoolId).first();
        if (existing) return c.json({ error: 'Un utilisateur avec cet email existe déjà' }, 409);
    }

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await getDB(c).prepare(
        'INSERT INTO AppUser (id, nom, prenom, email, password, telephone, schoolId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(id, nom, prenom, email || null, hashedPassword, telephone || null, schoolId).run();

    // Assign roles
    if (roles && Array.isArray(roles)) {
        for (const roleName of roles) {
            const role = await getDB(c).prepare('SELECT id FROM Role WHERE name = ?').bind(roleName).first();
            if (role) {
                await getDB(c).prepare('INSERT INTO UserRole (userId, roleId) VALUES (?, ?)').bind(id, role.id).run();
            }
        }
    }

    // Assign disciplines
    if (disciplineIds && Array.isArray(disciplineIds)) {
        for (const discId of disciplineIds) {
            await getDB(c).prepare('INSERT INTO "_TeacherDisciplines" (A, B) VALUES (?, ?)').bind(id, discId).run();
        }
    }

    return c.json({ id, nom, prenom, email, schoolId }, 201);
});

// PUT /api/auth/reset-password
auth.put('/reset-password', async (c) => {
    const { email, oldPassword, newPassword, schoolId } = await c.req.json();

    const user = await getDB(c).prepare('SELECT id, password FROM AppUser WHERE email = ? AND schoolId = ?').bind(email, schoolId).first();
    if (!user) return c.json({ error: 'Utilisateur non trouvé' }, 404);

    const valid = await verifyPassword(oldPassword, user.password as string);
    if (!valid) return c.json({ error: 'Ancien mot de passe incorrect' }, 401);

    const hashedNew = await hashPassword(newPassword);
    await getDB(c).prepare('UPDATE AppUser SET password = ? WHERE id = ?').bind(hashedNew, user.id).run();

    return c.json({ message: 'Mot de passe modifié avec succès' });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
    // For now, just re-sign from the existing token
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Token manquant' }, 401);
    const token = authHeader.replace('Bearer ', '');
    try {
        const { verifyToken } = await import('../utils/jwt');
        const payload = await verifyToken(token);
        const newToken = await signToken(payload);
        return c.json({ accessToken: newToken });
    } catch {
        return c.json({ error: 'Token invalide' }, 401);
    }
});

// GET /api/auth/me/role/:role
auth.get('/me/role/:role', async (c) => {
    const user = c.get('user') as JWTPayload;
    if (!user) return c.json({ error: 'Non authentifié' }, 401);

    const fullUser = await getDB(c).prepare(
        `SELECT u.*, GROUP_CONCAT(d.name) as disciplineNames, GROUP_CONCAT(d.id) as disciplineIds
     FROM AppUser u
     LEFT JOIN "_TeacherDisciplines" td ON u.id = td.A
     LEFT JOIN Discipline d ON td.B = d.id
     WHERE u.id = ?
     GROUP BY u.id`
    ).bind(user.userId).first();

    if (!fullUser) return c.json({ error: 'Utilisateur non trouvé' }, 404);

    let children: any[] = [];
    let classes: any[] = [];
    const userRole = c.req.param("role");
    if (userRole === "PARENT") {
        const { results } = await getDB(c)
            .prepare(
                `SELECT s.*, c.nom as className, c.niveau as classNiveau,
                 (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('ABSCENCE', 'ABSENCE', 'absent')) as abscence,
                 (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('RETARD', 'late')) as retards,
                 (SELECT ROUND(SUM(n.note * n.coefficient) / NULLIF(SUM(n.coefficient), 0), 2) FROM Note n WHERE n.studentId = s.id) as moyenne
                 FROM Student s LEFT JOIN Classe c ON s.classeId = c.id WHERE s.parentId = ?`
            )
            .bind(user.userId)
            .all();
        children = results;
    } else if (userRole === "TEACHER") {
        const { results } = await getDB(c)
            .prepare(
                "SELECT cp.classeId, c.nom, c.niveau FROM ClasseProfesseur cp JOIN Classe c ON cp.classeId = c.id WHERE cp.professeurId = ?"
            )
            .bind(user.userId)
            .all();
        classes = [];
        for (const r of results) {
            const { results: classStudents } = await getDB(c)
                .prepare(`SELECT s.*,
                  (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('ABSCENCE', 'ABSENCE', 'absent')) as abscence,
                  (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('RETARD', 'late')) as retards,
                  (SELECT ROUND(SUM(n.note * n.coefficient) / NULLIF(SUM(n.coefficient), 0), 2) FROM Note n WHERE n.studentId = s.id) as moyenne
                  FROM Student s WHERE classeId = ?`)
                .bind(r.classeId)
                .all();

            classes.push({
                classeId: r.classeId,
                classe: {
                    nom: r.nom,
                    niveau: r.niveau,
                    students: classStudents
                }
            });
        }
    }

    return c.json({
        ...fullUser,
        disciplines: fullUser.disciplineNames
            ? (fullUser.disciplineNames as string).split(",").map((name, i) => ({
                id: (fullUser.disciplineIds as string).split(",")[i],
                name,
            }))
            : [],
        children: children,
        classes: classes,
    });
});

// DELETE /api/auth/users/:id
auth.delete('/users/:id', async (c) => {
    const id = c.req.param('id');
    await getDB(c).prepare('DELETE FROM UserRole WHERE userId = ?').bind(id).run();
    await getDB(c).prepare('DELETE FROM "_TeacherDisciplines" WHERE A = ?').bind(id).run();
    await getDB(c).prepare('DELETE FROM AppUser WHERE id = ?').bind(id).run();
    return c.json({ message: 'Utilisateur supprimé' });
});

export default auth;
