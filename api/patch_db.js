const fs = require('fs');
const path = require('path');

const routesDir = 'c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\src\\routes';

const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('c.env.DB')) {
        content = content.replace(/c\.env\.DB/g, 'getDB(c)');
        if (!content.includes('import { getDB }')) {
            content = "import { getDB } from '../utils/db';\n" + content;
        }
        fs.writeFileSync(filePath, content);
        console.log('Patched ' + file);
    }
}

// update index.ts as well
const indexPath = 'c:\\Users\\user\\Desktop\\Infra_Seekids\\kid-school-link-complete\\api\\src\\index.ts';
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('DB_2026:')) {
    indexContent = indexContent.replace('DB: D1Database;', 'DB: D1Database;\n  DB_2026: D1Database;');
    fs.writeFileSync(indexPath, indexContent);
    console.log('Patched index.ts');
}
