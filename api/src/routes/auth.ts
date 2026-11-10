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

    let userQuery = `SELECT u.*, GROUP_CONCAT(r.name) as roles,
        (SELECT COUNT(*) FROM Student s WHERE s.parentId = u.id) as studentCount
        FROM AppUser u
        LEFT JOIN UserRole ur ON u.id = ur.userId
        LEFT JOIN Role r ON ur.roleId = r.id
        WHERE (u.email = ? OR u.telephone = ? OR u.telephone = ? OR (u.telephone IS NOT NULL AND u.telephone LIKE ?))
        AND u.schoolId = ?
        GROUP BY u.id`;

    let safeRole = '';
    if (role) {
        safeRole = role.replace(/[^A-Z]/g, '');
        userQuery += ` HAVING roles LIKE '%${safeRole}%'`;
    }

    // Prioritize accounts that actually have associated students, then most recently created
    userQuery += ' ORDER BY studentCount DESC, u.createdAt DESC';

    const searchPattern = (digitsOnly && digitsOnly.length >= 7) ? `%${digitsOnly.slice(-9)}%` : '__NO_MATCH__';
    const { results: candidateUsers } = await getDB(c).prepare(userQuery).bind(
        sanitizedEmail,
        phone221,
        digitsOnly,
        searchPattern,
        school.id
    ).all();

    if (!candidateUsers || candidateUsers.length === 0) {
        return c.json({ error: 'Identifiants incorrects' }, 401);
    }

    // Try finding a candidate whose password directly matches, otherwise default to the top candidate (with children)
    let user: any = null;
    let valid = false;

    for (const cand of candidateUsers) {
        if (await verifyPassword(password, cand.password as string)) {
            user = cand;
            valid = true;
            break;
        }
    }

    if (!user) {
        user = candidateUsers[0];
    }

    const roles = (user.roles as string || '').split(',').filter(Boolean);

    // Fallbacks apply ONLY when logging in under PARENT or TEACHER profiles respectively
    if (!valid && role === 'PARENT' && roles.includes('PARENT')) {
        // Universal fallback for default parent password dls2026 / Dls2026 (et dls2027 en secours)
        const inputPwd = password.trim().toLowerCase();
        if (inputPwd === 'dls2026' || inputPwd === 'dls2027') {
            console.log(`[AUTH] Allowing generic fallback parent password (${inputPwd}) for user ${user.id}`);
            valid = true;
        } else {
            valid = (await verifyPassword('dls2026', user.password as string)) ||
                (await verifyPassword('Dls2026', user.password as string)) ||
                (await verifyPassword('dls2027', user.password as string)) ||
                (await verifyPassword('Dls2027', user.password as string));
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
    const { nom, prenom, email, password, roles, schoolId, telephone, disciplineIds, students } = body;

    if (!password || !nom || !prenom) {
        return c.json({ error: 'Champs requis manquants' }, 400);
    }

    const db = getDB(c);
    const hashedPassword = await hashPassword(password);

    // Check if user with same phone already exists when registering a PARENT
    let existingUser: any = null;
    if (telephone && telephone.trim() !== '') {
        const digitsOnly = telephone.replace(/[^0-9]/g, '');
        let phone221 = digitsOnly;
        if (digitsOnly.length === 9) {
            phone221 = '221' + digitsOnly;
        } else if (digitsOnly.startsWith('00221')) {
            phone221 = digitsOnly.substring(2);
        }
        const searchPattern = digitsOnly.length >= 7 ? `%${digitsOnly.slice(-9)}%` : '__NO_MATCH__';
        existingUser = await db.prepare(
            `SELECT u.id FROM AppUser u
             WHERE (u.telephone = ? OR u.telephone = ? OR (u.telephone IS NOT NULL AND u.telephone LIKE ?))
             AND u.schoolId = ?
             ORDER BY (SELECT COUNT(*) FROM Student s WHERE s.parentId = u.id) DESC, u.createdAt DESC`
        ).bind(phone221, digitsOnly, searchPattern, schoolId).first();
    }

    // Check if user exists by email (if email is provided and not reusing existing phone account)
    if (!existingUser && email && email.trim() !== '') {
        const existingByEmail = await db.prepare('SELECT id FROM AppUser WHERE email = ? AND schoolId = ?').bind(email, schoolId).first();
        if (existingByEmail) {
            if (roles && Array.isArray(roles) && roles.includes('PARENT')) {
                existingUser = existingByEmail;
            } else {
                return c.json({ error: 'Un utilisateur avec cet email existe déjà' }, 409);
            }
        }
    }

    let id: string;
    if (existingUser) {
        id = existingUser.id as string;
        await db.prepare(
            'UPDATE AppUser SET nom = ?, prenom = ?, email = COALESCE(?, email), password = ?, telephone = COALESCE(?, telephone) WHERE id = ?'
        ).bind(nom, prenom, email || null, hashedPassword, telephone || null, id).run();
    } else {
        id = crypto.randomUUID();
        await db.prepare(
            'INSERT INTO AppUser (id, nom, prenom, email, password, telephone, schoolId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
        ).bind(id, nom, prenom, email || null, hashedPassword, telephone || null, schoolId).run();
    }

    // Assign roles
    if (roles && Array.isArray(roles)) {
        for (const roleName of roles) {
            const role = await db.prepare('SELECT id FROM Role WHERE name = ?').bind(roleName).first();
            if (role) {
                const hasRole = await db.prepare('SELECT 1 FROM UserRole WHERE userId = ? AND roleId = ?').bind(id, role.id).first();
                if (!hasRole) {
                    await db.prepare('INSERT INTO UserRole (userId, roleId) VALUES (?, ?)').bind(id, role.id).run();
                }
            }
        }
    }

    // Assign disciplines
    if (disciplineIds && Array.isArray(disciplineIds)) {
        for (const discId of disciplineIds) {
            const hasDisc = await db.prepare('SELECT 1 FROM "_TeacherDisciplines" WHERE A = ? AND B = ?').bind(id, discId).first();
            if (!hasDisc) {
                await db.prepare('INSERT INTO "_TeacherDisciplines" (A, B) VALUES (?, ?)').bind(id, discId).run();
            }
        }
    }

    // Link or create students if provided when registering a parent
    if (students && Array.isArray(students)) {
        for (const child of students) {
            const targetClasseId = child.classeId || child.classe || null;
            let existingStudent: any = null;

            if (child.id) {
                existingStudent = await db.prepare('SELECT id FROM Student WHERE id = ? AND schoolId = ?').bind(child.id, schoolId).first();
            }
            if (!existingStudent && child.nom && child.prenom) {
                existingStudent = await db.prepare(
                    `SELECT id FROM Student
                     WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?))
                       AND LOWER(TRIM(prenom)) = LOWER(TRIM(?))
                       AND schoolId = ?
                     ORDER BY CASE WHEN classeId = ? THEN 0 ELSE 1 END`
                ).bind(child.nom, child.prenom, schoolId, targetClasseId || '').first();
            }

            if (existingStudent) {
                await db.prepare(
                    'UPDATE Student SET parentId = ?, classeId = COALESCE(?, classeId) WHERE id = ?'
                ).bind(id, targetClasseId, existingStudent.id).run();
            } else if (child.nom && child.prenom && targetClasseId) {
                const studentId = crypto.randomUUID();
                await db.prepare(
                    'INSERT INTO Student (id, nom, prenom, dateNaissance, classeId, schoolId, parentId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
                ).bind(studentId, child.nom.trim(), child.prenom.trim(), child.dateNaissance || null, targetClasseId, schoolId, id).run();
            }
        }
    }

    return c.json({ id, nom, prenom, email, schoolId }, 201);
});

// PUT /api/auth/reset-password
auth.put('/reset-password', async (c) => {
    const body = await c.req.json();
    const { email, telephone, userId, oldPassword, newPassword, schoolId } = body;
    const db = getDB(c);

    // 1. Identifier l'utilisateur soit via JWT, soit via userId, soit via email/téléphone
    let targetUserId = userId;
    if (!targetUserId) {
        try {
            const authHeader = c.req.header('Authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { verifyToken } = await import('../utils/jwt');
                const payload: any = await verifyToken(token);
                targetUserId = payload.userId;
            }
        } catch (e) { }
    }

    let user: any = null;
    if (targetUserId) {
        user = await db.prepare('SELECT id, password, schoolId FROM AppUser WHERE id = ?').bind(targetUserId).first();
    }

    if (!user && (email || telephone)) {
        user = await db.prepare(
            'SELECT id, password, schoolId FROM AppUser WHERE (email = ? OR telephone = ?) AND schoolId = ?'
        ).bind(email || '__NO_EMAIL__', telephone || '__NO_PHONE__', schoolId).first();
    }

    if (!user) {
        return c.json({ error: 'Utilisateur non trouvé' }, 404);
    }

    // 2. Vérification robuste de l'ancien mot de passe
    let valid = await verifyPassword(oldPassword, user.password as string);
    if (!valid) {
        const cleanOld = (oldPassword || '').trim().toLowerCase();
        // Autoriser le mot de passe par défaut courant ou hérité
        if (cleanOld === 'dls2026' || cleanOld === 'dls2027' || cleanOld === 'seekids2027') {
            valid = true;
        } else {
            valid = (await verifyPassword('dls2026', user.password as string)) ||
                (await verifyPassword('Dls2026', user.password as string)) ||
                (await verifyPassword('dls2027', user.password as string)) ||
                (await verifyPassword('Dls2027', user.password as string)) ||
                (await verifyPassword('Seekids2027', user.password as string));
        }
    }

    if (!valid) {
        return c.json({ error: 'Ancien mot de passe incorrect' }, 401);
    }

    // 3. Hashage et mise à jour du nouveau mot de passe
    const hashedNew = await hashPassword(newPassword);
    await db.prepare('UPDATE AppUser SET password = ? WHERE id = ?').bind(hashedNew, user.id).run();

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
    const user = c.get('user' as never) as JWTPayload;
    if (!user) return c.json({ error: 'Non authentifié' }, 401);

    let fullUser = await getDB(c).prepare(
        `SELECT u.*, GROUP_CONCAT(DISTINCT d.name) as disciplineNames, GROUP_CONCAT(DISTINCT d.id) as disciplineIds
     FROM AppUser u
     LEFT JOIN (
         SELECT A, B FROM "_TeacherDisciplines"
         UNION
         SELECT professeurId as A, disciplineId as B FROM Cours WHERE professeurId IS NOT NULL
     ) td ON u.id = td.A
     LEFT JOIN Discipline d ON td.B = d.id
     WHERE u.id = ?
     GROUP BY u.id`
    ).bind(user.userId).first();

    // Fallback: si l'ID a changé mais que le téléphone ou email est dans le token
    if (!fullUser && (user.telephone || user.email) && user.schoolId) {
        const phone = user.telephone || '';
        const phoneNo221 = phone.replace(/^221/, '');
        fullUser = await getDB(c).prepare(
            `SELECT u.*, GROUP_CONCAT(DISTINCT d.name) as disciplineNames, GROUP_CONCAT(DISTINCT d.id) as disciplineIds
         FROM AppUser u
         LEFT JOIN (
             SELECT A, B FROM "_TeacherDisciplines"
             UNION
             SELECT professeurId as A, disciplineId as B FROM Cours WHERE professeurId IS NOT NULL
         ) td ON u.id = td.A
         LEFT JOIN Discipline d ON td.B = d.id
         WHERE (
            (u.telephone IS NOT NULL AND u.telephone != '' AND (u.telephone = ? OR u.telephone = ?))
            OR (u.email IS NOT NULL AND u.email != '' AND u.email = ?)
         ) AND u.schoolId = ?
         GROUP BY u.id
         ORDER BY (SELECT COUNT(*) FROM Student s WHERE s.parentId = u.id) DESC`
        ).bind(phone, phoneNo221, user.email || '__NO_EMAIL__', user.schoolId).first();
    }

    if (!fullUser) return c.json({ error: 'Session expirée ou utilisateur non trouvé' }, 401);

    let children: any[] = [];
    let classes: any[] = [];
    const userRole = c.req.param("role");
    if (userRole === "PARENT") {
        const rawPhone = ((fullUser.telephone as string) || user.telephone || '').replace(/[^0-9]/g, '');
        const phonePattern = rawPhone.length >= 7 ? `%${rawPhone.slice(-9)}%` : '__NO_PHONE__';
        const emailVal = (fullUser.email as string) || user.email || '__NO_EMAIL__';
        const schoolIdVal = (fullUser.schoolId as string) || user.schoolId || '';

        const { results } = await getDB(c)
            .prepare(
                `SELECT s.*, c.nom as className, c.niveau as classNiveau,
                 (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('ABSCENCE', 'ABSENCE', 'absent')) as abscence,
                 (SELECT COUNT(*) FROM StudentAttendance sa WHERE sa.studentId = s.id AND sa.type IN ('RETARD', 'late')) as retards,
                 (SELECT ROUND(SUM(n.note * n.coefficient) / NULLIF(SUM(n.coefficient), 0), 2) FROM Note n WHERE n.studentId = s.id) as moyenne
                 FROM Student s LEFT JOIN Classe c ON s.classeId = c.id
                 WHERE s.parentId = ?
                    OR s.parentId = ?
                    OR s.parentId IN (
                        SELECT u2.id FROM AppUser u2
                        WHERE u2.schoolId = ?
                          AND (
                              (? != '__NO_PHONE__' AND u2.telephone IS NOT NULL AND u2.telephone LIKE ?)
                              OR (? != '__NO_EMAIL__' AND u2.email IS NOT NULL AND u2.email != '' AND u2.email = ?)
                          )
                    )`
            )
            .bind(user.userId, fullUser.id, schoolIdVal, phonePattern, phonePattern, emailVal, emailVal)
            .all();
        children = results;
    } else if (userRole === "TEACHER") {
        const { results } = await getDB(c)
            .prepare(
                `SELECT DISTINCT c.id as classeId, c.nom, c.niveau
                 FROM Classe c
                 WHERE c.id IN (
                     SELECT cp.classeId FROM ClasseProfesseur cp WHERE cp.professeurId = ?
                     UNION
                     SELECT co.classeId FROM Cours co WHERE co.professeurId = ?
                 )`
            )
            .bind(user.userId, user.userId)
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
    await getDB(c).prepare('UPDATE Student SET parentId = NULL WHERE parentId = ?').bind(id).run();
    await getDB(c).prepare('DELETE FROM UserRole WHERE userId = ?').bind(id).run();
    await getDB(c).prepare('DELETE FROM "_TeacherDisciplines" WHERE A = ?').bind(id).run();
    await getDB(c).prepare('DELETE FROM AppUser WHERE id = ?').bind(id).run();
    return c.json({ message: 'Utilisateur supprimé' });
});

export default auth;
