const { execSync } = require('child_process');

function execSql(db, sql) {
    const cmd = `npx wrangler d1 execute ${db} --remote --command "${sql.replace(/"/g, '\\"')}" --json`;
    try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        // Clean out wrangler header if any
        const match = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
            return JSON.parse(match[0])[0].results || [];
        }
        return [];
    } catch (e) {
        console.error("SQL Error:", e.stderr || e.message);
        throw e;
    }
}

async function run() {
    console.log("Fetching classes from 2026 DB...");
    const classes = execSql('seekids-db-2026', 'SELECT id, nom FROM Classe');

    // Create a normalized mapping of class progression
    const progression = {
        '6ème': '5ème',
        '6ème A': '5ème A',
        '6ème B': '5ème B',
        '5ème': '4ème',
        '5ème A': '4ème A',
        '5ème B': '4ème B',
        '4ème': '3ème',
        '4ème ': '3ème', // handling typo from DB list
        '4ème A': '3ème A',
        '4ème B': '3ème B',
        '3ème': '2ndeL', // default 3eme goes to 2ndeL in this list
        '3ème A': '2ndeL',
        '3ème B': '2ndeL',
        '2ndeL': '1L2',
        '2ndeS': '1S2',
        '1L2': 'TL2',
        '1S2': 'TS2'
    };

    // Build the ID mapping map
    const classIdByName = {};
    for (const c of classes) {
        classIdByName[c.nom.trim()] = c.id;
    }

    const upgradeMap = {}; // CurrentClassId -> NextClassId
    for (const c of classes) {
        const nextName = progression[c.nom.trim()];
        if (nextName && classIdByName[nextName]) {
            upgradeMap[c.id] = classIdByName[nextName];
        } else {
            console.warn(`No upgrade path defined for: ${c.nom}`);
        }
    }

    console.log("Fetching students...");
    const students = execSql('seekids-db-2026', 'SELECT id, nom, prenom, classeId FROM Student');
    console.log(`Found ${students.length} students to process.`);

    let updatedCount = 0;
    const batchUpdates = [];

    for (const student of students) {
        const nextClassId = upgradeMap[student.classeId];
        if (nextClassId) {
            batchUpdates.push(`UPDATE Student SET classeId = '${nextClassId}' WHERE id = '${student.id}';`);
            updatedCount++;
        } else {
            // For Terminale students or unmapped
            console.log(`Leaping: ${student.nom} ${student.prenom} (no next class available)`);
        }
    }

    console.log(`Generated ${updatedCount} UPDATE queries. Executing batch...`);

    // Execute in small batches to avoid CLI limits
    const chunkSize = 20;
    for (let i = 0; i < batchUpdates.length; i += chunkSize) {
        const chunk = batchUpdates.slice(i, i + chunkSize);
        const batchedSql = chunk.join(' ');
        execSql('seekids-db-2026', batchedSql);
        console.log(`Executed batch ${i / chunkSize + 1}`);
    }

    console.log("Migration complete in seekids-db-2026!");
}

run();
