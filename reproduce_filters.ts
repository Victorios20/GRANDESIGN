
import { listarClientes } from "./src/actions/clientes-db/clientes-db";
import * as fs from 'fs';

const LOG_FILE = 'reproduce_output.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function main() {
    fs.writeFileSync(LOG_FILE, ''); // clear file
    log("--- Testing Client Filters ---");

    // 1. List all (first 5)
    log("\n1. Listing all clients (limit 5)...");
    const all = await listarClientes({ page: 1, perPage: 5 });
    log(`Total: ${all.total}`);
    all.dados.forEach(c =>
        log(`- ${c.nome} (Obras: ${c._count.obras}, Orcs: ${c._count.orcamentos})`)
    );

    // 2. Filter temObras
    log("\n2. Filtering temObras=true...");
    const withObras = await listarClientes({ page: 1, perPage: 5, temObras: true });
    log(`Total: ${withObras.total}`);
    withObras.dados.forEach(c =>
        log(`- ${c.nome} (Obras: ${c._count.obras})`)
    );

    // 3. Filter temOrcamentos
    log("\n3. Filtering temOrcamentos=true...");
    const withOrcs = await listarClientes({ page: 1, perPage: 5, temOrcamentos: true });
    log(`Total: ${withOrcs.total}`);
    withOrcs.dados.forEach(c =>
        log(`- ${c.nome} (Orcs: ${c._count.orcamentos})`)
    );
}

main().catch(console.error);
