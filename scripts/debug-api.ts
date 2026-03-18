
// scripts/debug-api.ts
import { listarObrasTableDB } from "../src/actions/obras/listar-obras-table-db";
import { listarOrcamentosTableSearch } from "../src/actions/orcamentos-table-search/orcamentos-table-search";

async function main() {
  console.log("--- Testing Obras ---");
  try {
    const res = await listarObrasTableDB({ page: 1, perPage: 20 });
    console.log("Obras Success, count:", res.total);
  } catch (e: any) {
    console.error("Obras Error:", e);
  }

  console.log("\n--- Testing Orçamentos ---");
  try {
    const res = await listarOrcamentosTableSearch({ page: 1, perPage: 20 });
    console.log("Orçamentos Success, count:", res.total);
  } catch (e: any) {
    console.error("Orçamentos Error:", e);
  }
}

main();
