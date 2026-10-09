const { execSync } = require('child_process');

function execSql(db, sql) {
    const cmd = `npx wrangler d1 execute ${db} --remote --command "${sql.replace(/"/g, '\\"')}" --json`;
    try {
        const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
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
    console.log("Fetching original classes from 2026 DB...");
    const classes = execSql('seekids-db-2026', 'SELECT id, nom, schoolId FROM Classe');

    const progression = {
        '6ème': '5ème',
        '6 ème': '5 ème',
        '6ème A': '5ème A',
        '6 ème A': '5 ème A',
        '6ème B': '5ème B',
        '6 ème B': '5 ème B',
        '5ème': '4ème',
        '5 ème': '4ème',
        '5ème A': '4ème A',
        '5 ème A': '4ème',
        '5ème B': '4ème',
        '5 ème B': '4ème',
        '4ème': '3ème',
        '4ème ': '3ème',
        '4ème A': '3ème A',
        '4ème B': '3ème B',
        '3ème': '2nde',
        '3ème A': '2nde',
        '3ème B': '2nde',
        '3 ème A': '2nde',
        '3eme': '2nde',
        '2nde': '1er L2',
        '2ndeL': '1L2',
        '2ndeS': '1S2',
        '1L2': 'TL2',
        '1S2': 'TS2',
        '1er L2': 'TL2',
        '1er S2': 'TS2'
    };

    // Dictionary of SchoolId -> { ClassName -> ClassId }
    const classesBySchool = {};
    const classIdToNameMap = {};

    for (const c of classes) {
        if (!classesBySchool[c.schoolId]) classesBySchool[c.schoolId] = {};
        classesBySchool[c.schoolId][c.nom.trim()] = c.id;
        classIdToNameMap[c.id] = c.nom.trim();
    }

    console.log("Fetching pristine students from 2025 DB (seekids-db) to ensure correct origin points...");
    // We grab the original untouched students from 2025 to figure out their original classeId
    const originalStudents = execSql('seekids-db', 'SELECT id, nom, prenom, classeId, schoolId FROM Student');

    let updatedCount = 0;
    const batchUpdates = [];

    for (const st of originalStudents) {
        const studentSchoolId = st.schoolId;
        const originalClasseId = st.classeId;
        const originalClassName = classIdToNameMap[originalClasseId];

        if (originalClassName) {
            const nextClassName = progression[originalClassName];
            if (nextClassName) {
                // Find the next class ID specifically within the SAME school!
                const nextClassId = classesBySchool[studentSchoolId]?.[nextClassName];
                if (nextClassId) {
                    batchUpdates.push(`UPDATE Student SET classeId = '${nextClassId}' WHERE id = '${st.id}' AND schoolId = '${studentSchoolId}';`);
                    updatedCount++;
                } else {
                    // Revert to original if next class doesn't exist in THIS school
                    batchUpdates.push(`UPDATE Student SET classeId = '${originalClasseId}' WHERE id = '${st.id}' AND schoolId = '${studentSchoolId}';`);
                }
            } else {
                // Revert to original if there's no logical progression (e.g Terminale)
                batchUpdates.push(`UPDATE Student SET classeId = '${originalClasseId}' WHERE id = '${st.id}' AND schoolId = '${studentSchoolId}';`);
            }
        } else {
            // Revert just in case
            batchUpdates.push(`UPDATE Student SET classeId = '${originalClasseId}' WHERE id = '${st.id}' AND schoolId = '${studentSchoolId}';`);
        }
    }

    console.log(`Generated ${batchUpdates.length} Revert/Upgrade queries. Executing batch...`);

    const chunkSize = 20;
    for (let i = 0; i < batchUpdates.length; i += chunkSize) {
        const chunk = batchUpdates.slice(i, i + chunkSize);
        const batchedSql = chunk.join(' ');
        execSql('seekids-db-2026', batchedSql);
        console.log(`Executed batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(batchUpdates.length / chunkSize)}`);
    }

    console.log("Recovery & Correct Migration complete in seekids-db-2026!");
}

run();
