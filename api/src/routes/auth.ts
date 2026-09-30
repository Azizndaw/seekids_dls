import { Hono } from 'hono';
import { signToken, hashPassword, verifyPassword, type JWTPayload } from '../utils/jwt';

type Env = { Bindings: { DB: D1Database } };
const auth = new Hono<Env>();

// POST /api/auth/login
auth.post('/login', async (c) => {
    const { email, password, schoolName } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email et mot de passe requis' }, 400);

    // Find school
    const school = await c.env.DB.prepare('SELECT id, name FROM School WHERE name = ?').bind(schoolName).first();
    if (!school) return c.json({ error: 'École non trouvée' }, 404);

    // Find user
    const user = await c.env.DB.prepare(
        'SELECT u.*, GROUP_CONCAT(r.name) as roles FROM AppUser u LEFT JOIN UserRole ur ON u.id = ur.userId LEFT JOIN Role r ON ur.roleId = r.id WHERE u.email = ? AND u.schoolId = ? GROUP BY u.id'
    ).bind(email, school.id).first();

    if (!user) return c.json({ error: 'Identifiants incorrects' }, 401);

    // Verify password
    const valid = await verifyPassword(password, user.password as string);
    if (!valid) return c.json({ error: 'Identifiants incorrects' }, 401);

    const roles = (user.roles as string || '').split(',').filter(Boolean);

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

    if (!email || !password || !nom || !prenom) {
        return c.json({ error: 'Champs requis manquants' }, 400);
    }

    // Check if user exists
    const existing = await c.env.DB.prepare('SELECT id FROM AppUser WHERE email = ? AND schoolId = ?').bind(email, schoolId).first();
    if (existing) return c.json({ error: 'Un utilisateur avec cet email existe déjà' }, 409);

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await c.env.DB.prepare(
        'INSERT INTO AppUser (id, nom, prenom, email, password, telephone, schoolId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(id, nom, prenom, email, hashedPassword, telephone || null, schoolId).run();

    // Assign roles
    if (roles && Array.isArray(roles)) {
        for (const roleName of roles) {
            const role = await c.env.DB.prepare('SELECT id FROM Role WHERE name = ?').bind(roleName).first();
            if (role) {
                await c.env.DB.prepare('INSERT INTO UserRole (userId, roleId) VALUES (?, ?)').bind(id, role.id).run();
            }
        }
    }

    // Assign disciplines
    if (disciplineIds && Array.isArray(disciplineIds)) {
        for (const discId of disciplineIds) {
            await c.env.DB.prepare('INSERT INTO "_TeacherDisciplines" (A, B) VALUES (?, ?)').bind(id, discId).run();
        }
    }

    return c.json({ id, nom, prenom, email, schoolId }, 201);
});

// PUT /api/auth/reset-password
auth.put('/reset-password', async (c) => {
    const { email, oldPassword, newPassword, schoolId } = await c.req.json();

    const user = await c.env.DB.prepare('SELECT id, password FROM AppUser WHERE email = ? AND schoolId = ?').bind(email, schoolId).first();
    if (!user) return c.json({ error: 'Utilisateur non trouvé' }, 404);

    const valid = await verifyPassword(oldPassword, user.password as string);
    if (!valid) return c.json({ error: 'Ancien mot de passe incorrect' }, 401);

    const hashedNew = await hashPassword(newPassword);
    await c.env.DB.prepare('UPDATE AppUser SET password = ? WHERE id = ?').bind(hashedNew, user.id).run();

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

    const fullUser = await c.env.DB.prepare(
        `SELECT u.*, GROUP_CONCAT(d.name) as disciplineNames, GROUP_CONCAT(d.id) as disciplineIds
     FROM AppUser u
     LEFT JOIN "_TeacherDisciplines" td ON u.id = td.A
     LEFT JOIN Discipline d ON td.B = d.id
     WHERE u.id = ?
     GROUP BY u.id`
    ).bind(user.userId).first();

    if (!fullUser) return c.json({ error: 'Utilisateur non trouvé' }, 404);

    return c.json({
        ...fullUser,
        disciplines: fullUser.disciplineNames
            ? (fullUser.disciplineNames as string).split(',').map((name, i) => ({
                id: (fullUser.disciplineIds as string).split(',')[i],
                name
            }))
            : []
    });
});

// DELETE /api/auth/users/:id
auth.delete('/users/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM UserRole WHERE userId = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM "_TeacherDisciplines" WHERE A = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM AppUser WHERE id = ?').bind(id).run();
    return c.json({ message: 'Utilisateur supprimé' });
});

export default auth;
