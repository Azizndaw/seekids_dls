import bcrypt from 'bcryptjs';

async function generate() {
    const hash = await bcrypt.hash('Dls2026', 10);
    console.log(hash);
}

generate();
