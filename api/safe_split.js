const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\seed.sql', 'utf8');

// Match each INSERT INTO statement exactly. We know each statement in seed.sql starts with INSERT INTO.
const lines = content.split('\n');

let currentChunk = '';
let currentStatementCount = 0;
let chunkIndex = 1;
const MAX_STATEMENTS = 5000;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('--') || lines[i].trim() === '') {
        // If it's a comment or empty line, just add it if we are starting a chunk or append to current statement
        if (lines[i].startsWith('-- Table:')) {
            currentChunk += lines[i] + '\n';
        }
        continue;
    }

    currentChunk += lines[i] + '\n';

    if (lines[i].endsWith(');')) {
        currentStatementCount++;
    }

    if (currentStatementCount >= MAX_STATEMENTS) {
        fs.writeFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\safe_chunk_' + chunkIndex + '.sql', currentChunk);
        console.log('Saved safe chunk ' + chunkIndex, currentStatementCount + ' statements.');
        chunkIndex++;
        currentChunk = '';
        currentStatementCount = 0;
    }
}

if (currentChunk.trim()) {
    fs.writeFileSync('c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\safe_chunk_' + chunkIndex + '.sql', currentChunk);
    console.log('Saved safe chunk ' + chunkIndex, currentStatementCount + ' statements.');
}
