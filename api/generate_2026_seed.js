const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\seed.sql', 'utf8');

const allowedTables = ['Role', 'School', 'AppUser', 'UserRole', 'Classe', 'Student', 'Discipline', '_TeacherDisciplines'];
const lines = content.split('\n');

let newSeed = 'PRAGMA defer_foreign_keys = ON;\nPRAGMA foreign_keys = OFF;\n';
let currentTable = null;
let keep = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('-- ') && line.includes(' (')) {
        currentTable = line.replace('-- ', '').split(' (')[0].trim();
        keep = allowedTables.includes(currentTable);
        if (keep) newSeed += line + '\n';
        continue;
    }

    if (keep && line !== '') {
        newSeed += lines[i] + '\n';
    }
}

fs.writeFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\seed_2026.sql', newSeed);
console.log('Finished writing seed_2026.sql');
