const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/user/Desktop/Infra_Seekids/kid-school-link-complete/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);
let replacedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // discipline mappings
    content = content.replace(/([a-zA-Z0-9_]+)\.discipline\.name/g, '($1.discipline?.name || $1.disciplineName)');

    // professeur mappings
    content = content.replace(/([a-zA-Z0-9_]+)\.professeur\.prenom/g, '($1.professeur?.prenom || $1.professeurPrenom || $1.teacherPrenom)');
    content = content.replace(/([a-zA-Z0-9_]+)\.professeur\.nom/g, '($1.professeur?.nom || $1.professeurNom || $1.teacherNom)');
    content = content.replace(/([a-zA-Z0-9_]+)\.professeur\.id/g, '($1.professeur?.id || $1.professeurId || $1.teacherId)');

    // classe mappings
    content = content.replace(/([a-zA-Z0-9_]+)\.classe\.nom/g, '($1.classe?.nom || $1.classeName || $1.className)');
    content = content.replace(/([a-zA-Z0-9_]+)\.classe\.niveau/g, '($1.classe?.niveau || $1.classeNiveau || $1.classNiveau)');
    content = content.replace(/([a-zA-Z0-9_]+)\.classe\.id/g, '($1.classe?.id || $1.classeId)');

    // Optional chaining mappings specifically caught by grep
    content = content.replace(/([a-zA-Z0-9_]+)\.classe\?\.students\?\.length/g, '($1.classe?.students?.length || 0)');

    if (content !== original) {
        fs.writeFileSync(file, content);
        replacedFiles++;
        console.log("Patched: " + file);
    }
});
console.log("Total files patched: " + replacedFiles);
