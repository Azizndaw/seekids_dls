import bcrypt from 'bcryptjs';

async function testAuth() {
    const hash = "$2b$10$brT93TCLa/WD.m.sJAPF.uyneurQoDHeA/uBUCR0ZhhjbOOI3G7Iy";
    const password = "Dls2026";
    const valid = await bcrypt.compare(password, hash);
    console.log("Password valid:", valid);
}
testAuth();
