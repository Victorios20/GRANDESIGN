
import { prisma } from "../src/lib/prisma";

async function main() {
  const materials = await prisma.materiais.findMany({
    where: {
      descricao: { contains: "Stain", mode: "insensitive" }
    }
  });
  console.log("--- Materials found ---");
  console.log(JSON.stringify(materials, null, 2));

  const target = materials.find(m => m.descricao.toLowerCase().includes("incolor"));
  if (target) {
    console.log(`Renaming ID ${target.id}: "${target.descricao}" -> "Stain Transparente"`);
    await prisma.materiais.update({
      where: { id: target.id },
      data: { descricao: "Stain Transparente" }
    });
    console.log("Rename successful.");
  } else {
    console.log("Target material 'Stain Incolor' not found specifically, checking for similar names...");
    // If not found exactly, but there's only one "Stain" that is not already "Transparente"
    const others = materials.filter(m => !m.descricao.toLowerCase().includes("transparente"));
    if (others.length === 1) {
       console.log(`Renaming single other Stain ID ${others[0].id}: "${others[0].descricao}" -> "Stain Transparente"`);
       await prisma.materiais.update({
         where: { id: others[0].id },
         data: { descricao: "Stain Transparente" }
       });
       console.log("Rename successful.");
    }
  }
}

main().catch(console.error);
