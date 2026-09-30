const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\seed.sql', 'utf8');

const lines = content.split('\n');

let currentChunk = 'PRAGMA defer_foreign_keys = ON;\nPRAGMA foreign_keys = OFF;\n';
let currentStatementCount = 0;
let chunkIndex = 1;
const CHUNK_SIZE = 1000;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('--') || lines[i].trim() === '') {
        if (lines[i].startsWith('-- Table:')) {
            currentChunk += lines[i] + '\n';
        }
        continue;
    }

    currentChunk += lines[i] + '\n';

    if (lines[i].endsWith(');')) {
        currentStatementCount++;
    }

    if (currentStatementCount >= CHUNK_SIZE) {
        fs.writeFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\micro_chunk_' + chunkIndex + '.sql', currentChunk);
        console.log('Saved micro chunk ' + chunkIndex, currentStatementCount + ' statements.');
        chunkIndex++;
        currentChunk = 'PRAGMA defer_foreign_keys = ON;\nPRAGMA foreign_keys = OFF;\n';
        currentStatementCount = 0;
    }
}

if (currentStatementCount > 0) {
    fs.writeFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\micro_chunk_' + chunkIndex + '.sql', currentChunk);
    console.log('Saved micro chunk ' + chunkIndex, currentStatementCount + ' statements.');
}
