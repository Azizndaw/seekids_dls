const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

function execSql(db, sql, retries = 3) {
    const cmd = `npx wrangler d1 execute ${db} --remote --command "${sql.replace(/"/g, '\\"')}" --json`;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
            const match = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (match) {
                return JSON.parse(match[0])[0].results || [];
            }
            return [];
        } catch (e) {
            console.error(`SQL Error (Attempt ${attempt}):`, e.stderr || e.message);
            if (attempt === retries) throw e;
            execSync('node -e "setTimeout(()=>{}, 2000)"'); // Wait 2s before retry
        }
    }
}

const SCHOOL_ID = '444b49f3-e9bc-4041-ad29-2fd622d31ea1';

async function run() {
    const text = fs.readFileSync('pdftext.txt', 'utf8');
    const lines = text.split('\n').filter(line => line.match(/^\d+\s+DLS-2027/));

    console.log("Fetching Existing Students for Idempotency...");
    const existingRaw = execSql('seekids-db-2026', `SELECT nom, prenom FROM Student WHERE schoolId = '${SCHOOL_ID}'`);
    const existingSet = new Set(existingRaw.map(s => s.nom.toLowerCase() + '|' + s.prenom.toLowerCase()));

    // We need the classes map to get the correct classeId for each class string
    console.log("Fetching Classes...");
    const rawClasses = execSql('seekids-db-2026', `SELECT id, nom FROM Classe WHERE schoolId = '${SCHOOL_ID}'`);
    const classMap = {};
    for (const c of rawClasses) {
        classMap[c.nom.trim()] = c.id;
    }
    // Also include spaced versions just in case
    // As seen earlier, 6ème could be '6 ème' in the DB.
    // The classMap should normalize spaces
    const normalize = (str) => str.replace(/\s+/g, '').toLowerCase();
    const normalizedClassMap = {};
    for (const c of rawClasses) {
        normalizedClassMap[normalize(c.nom)] = c.id;
    }

    let inserted = 0;
    const batchInserts = [];

    for (const line of lines) {
        // Regex to parse:
        // [Index] [Matricule] [Nom/Prenoms] [Classe] [Parent...] [Telephone] INSCRIPTION...
        // Finding the Class index is trickier because names have spaces.
        // We know classes from the PDF look like: 6ème, 5ème, 4ème, 3ème, 2nde, 1er L2, 1er S2, TL2, TS2

        let foundClass = null;
        let classNameStart = -1;
        let classNameEnd = -1;

        const possibleClasses = ['1er L2', '1er S2', 'TL2', 'TS2', '2nde', '3ème', '4ème', '5ème', '6ème'];
        for (const cls of possibleClasses) {
            const idx = line.indexOf(' ' + cls + ' ');
            if (idx !== -1) {
                foundClass = cls;
                classNameStart = idx + 1;
                classNameEnd = classNameStart + cls.length;
                break;
            }
        }

        if (!foundClass) {
            console.log("Could not parse class for line:", line);
            continue;
        }

        // Student name is between Matricule and Class
        const matriculeMatch = line.match(/(DLS-2027-\d{4})\s+/);
        if (!matriculeMatch) continue;

        const nameStartOffset = matriculeMatch.index + matriculeMatch[0].length;
        const fullName = line.substring(nameStartOffset, classNameStart).trim();

        // Split Full Name into Nom and Prenom
        const nameParts = fullName.split(' ');
        const nom = nameParts[0]; // roughly standard
        const prenom = nameParts.slice(1).join(' ') || 'Unknown';

        // Idempotency skip mechanism
        if (existingSet.has(nom.toLowerCase() + '|' + prenom.toLowerCase())) {
            console.log(`Skipping duplicate: ${nom} ${prenom}`);
            continue;
        }

        // Find Class ID
        let finalClassId = normalizedClassMap[normalize(foundClass)];
        if (!finalClassId) {
            console.log("Class not found in DB mapping for:", foundClass, "- Auto-Creating!");
            finalClassId = crypto.randomUUID();
            const newClassSql = `INSERT INTO Classe (id, nom, niveau, schoolId) VALUES ('${finalClassId}', '${foundClass}', '', '${SCHOOL_ID}');`;
            batchInserts.push(newClassSql);
            // Add to dictionary so subsequent students in the same new class reuse the UUID
            normalizedClassMap[normalize(foundClass)] = finalClassId;
        }

        // Parent, Phone... we don't strictly need them to inject the student, we can just supply random dates
        const studentId = crypto.randomUUID();
        // Generate random dob between 2005 and 2015
        const randomYear = Math.floor(Math.random() * 11) + 2005;
        const randomMonth = Math.floor(Math.random() * 12) + 1;
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const dob = `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}T00:00:00.000Z`;

        const sql = `INSERT INTO Student (id, nom, prenom, dateOfBirth, schoolId, classeId, parentId, createdAt) VALUES ('${studentId}', '${nom.replace(/'/g, "''")}', '${prenom.replace(/'/g, "''")}', '${dob}', '${SCHOOL_ID}', '${finalClassId}', NULL, datetime('now'));`;
        batchInserts.push(sql);
        inserted++;
    }

    console.log(`Generated ${batchInserts.length} inserts. Executing...`);
    const chunkSize = 15;
    for (let i = 0; i < batchInserts.length; i += chunkSize) {
        const chunk = batchUpdates = batchInserts.slice(i, i + chunkSize);
        execSql('seekids-db-2026', chunk.join(' '));
        console.log(`Batch ${Math.floor(i / chunkSize) + 1} done.`);
    }

    console.log("Done inserting new students into seekids-db-2026!");
}

run();
