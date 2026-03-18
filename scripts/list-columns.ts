
import { prisma } from "../src/lib/prisma";

async function main() {
  const tables = ['obras', 'orcamento'];
  for (const table of tables) {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${table}'
    `);
    console.log(`--- Columns for ${table} ---`);
    console.log(JSON.stringify(columns, null, 2));
  }
}

main().catch(console.error);
