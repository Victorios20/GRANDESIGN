const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = 'leivarenata2008@gmail.com';
    const hashedPassword = '$2b$10$SmTYTfngQY13gg9ffatwPOhB7kOLbEQqprr1uA9QIGmdhUJef75JKG';

    console.log(`Connecting to DB at ${process.env.DATABASE_URL?.split('@')[1] || 'unknown'}...`);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password_hash: hashedPassword },
        });
        console.log(`SUCCESS: Password updated for ${user.email}`);
    } catch (e) {
        console.error('FAILURE:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
