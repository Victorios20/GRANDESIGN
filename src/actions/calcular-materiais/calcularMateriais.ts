/* ────────────────────────────────────────────────────────────────
   Função de cálculo GRANDESIGN  (Next.js + Supabase)
   Retorna lista de materiais: fixos  +  variáveis (madeira, telhas, extras)
───────────────────────────────────────────────────────────────── */
import {
  getReceitasFixas,
  getMateriaisByIds,
  getMateriaisByDescricoes,
  type MaterialRow,
  type TipoMaterial,
} from "./calcularMateriais-db";

/* ============= Tipos de saída ============= */
export interface MaterialCalculado {
  id: number | null;          // null caso não exista no banco
  descricao: string;
  tipo: TipoMaterial | null;  // null caso não exista
  unidade: string | null;     // null caso não exista
  quantidade: number;
  preco_unitario: number;     // 0 caso não exista
  total: number;              // quantidade × preço_unitario
  tamanho?: string
}

// /* ============= Utils ============= */
// const arredondarMeioMetro = (v: number) => Math.ceil(v * 2) / 2;
const ceil = Math.ceil; // atalho

/* ============= MADEIRA ============= */
type MadeiraItem = { descricao: string; quantidade: number };

function calcularMadeira(
  tipoObra: string,
  largura: number,
  comprimento: number,
): MadeiraItem[] {
  /*  === versão condensada da lógica GD (igual ao Apps Script) === */
  const madeira: MadeiraItem[] = [];
  let quantidadeBrabo = comprimento >= 6 ? 3 : 2;

  const caibros = ceil(comprimento / 0.32) + 1;
  const tercas = ceil(largura) + 1;
  // const tamanhoTerça = arredondarMeioMetro(comprimento + 0.5);
  // const tamanhoCaibro = arredondarMeioMetro(largura);

  const espessuraBrabo = largura > 5.5 ? 30 : comprimento >= 6 ? 30 : 25;
  const descricaoBrabo = `Linha ${espessuraBrabo}cm (Pranchão)`;
  // const tamanhoBrabo = arredondarMeioMetro(largura);
  // const tamanhoBeiral = arredondarMeioMetro(largura);
  const descricaoBeiral = tipoObra.includes("11,5")
    ? "Beiral Trab. 11,5cm"
    : "Beiral Trab. 15cm";
  const descricaoPontalete = tipoObra.includes("11,5")
    ? "Linha 11,5cm (Pontalete)"
    : "Linha 15cm (Pontalete)";
  const descricaoTerça = "Linha 11,5cm (Terças)";

  /* --- Coluna 15 / 11,5 --- */
  if (tipoObra === "Coluna 15" || tipoObra === "Coluna 11,5") {
    const esp = tipoObra.endsWith("15") ? "15cm" : "11,5cm";
    madeira.push(
      {
        descricao: `Linha ${esp} (Colunas Traseiras)`,
        quantidade: 4,
      },
      {
        descricao: `Linha ${esp} (Colunas Frontais)`,
        quantidade: comprimento >= 6 ? 8 : 4,
      },
    );
  }

  /* --- Pontalete --- */
  if (tipoObra.startsWith("Pontalete")) {
    const pontaletes = quantidadeBrabo * 2;
    madeira.push({ descricao: descricaoPontalete, quantidade: pontaletes });
  }

  /* --- Linha na Parede --- */
  if (
    tipoObra.toLowerCase() === "linha na parede 15" ||
    tipoObra.toLowerCase() === "linha na parede 11,5"
  ) {
    quantidadeBrabo -= 1;
    madeira.push({
      descricao: "Linha 11,5cm (Parede)",
      quantidade: 1,
    });
  }

  /* --- Linha na Parede + Coluna --- */
  if (tipoObra.startsWith("Linha na Parede + Coluna")) {
    const esp = tipoObra.endsWith("15") ? "15cm" : "11,5cm";
    const qtdLinhasColuna = comprimento >= 6 ? 8 : 4;
    madeira.push(
      { descricao: "Linha 11,5cm (Parede)", quantidade: 1 },
      { descricao: `Linha ${esp} (Coluna)`, quantidade: qtdLinhasColuna },

    );
  }

  /* --- Caramanchão / Pergolado --- */
  if (tipoObra.startsWith("Caramanchão") || tipoObra.startsWith("Pergolado")) {
    const is15 = tipoObra.endsWith("15");
    const esp = is15 ? "15cm" : "11,5cm";
    const baseDesc = `Linha ${esp}`;
    if (tipoObra.startsWith("Caramanchão")) {
      const qtdTravessa = 2;
      const qtdPergola = ceil(comprimento / 0.35) + 1;
      madeira.push(
        { descricao: `${baseDesc} (Colunas Traseiras)`, quantidade: 4 },
        {
          descricao: `${baseDesc} (Colunas Frontais)`,
          quantidade: comprimento > 6 ? 8 : 4,
        },
        { descricao: `${baseDesc} (Travessa)`, quantidade: qtdTravessa },
        { descricao: `${baseDesc} (Pérgola)`, quantidade: qtdPergola },
      );
    } else {
      // Pergolado
      madeira.push(
        {
          descricao: `${baseDesc} (Travessa)`,
          quantidade: 2,
        },
        {
          descricao: `${baseDesc} (Pérgola)`,
          quantidade: ceil(comprimento / 0.35) + 1,
        },
      );
    }
  }

  /* --- Itens comuns (terças, caibros, brabo, beiral) --- */
  madeira.push(
    { descricao: descricaoTerça, quantidade: tercas },
    { descricao: "Caibros", quantidade: caibros },
    { descricao: descricaoBrabo, quantidade: quantidadeBrabo },
    { descricao: descricaoBeiral, quantidade: 1 },
  );

  return madeira;
}

/* ============= MATERIAIS VARIÁVEIS (extras) ============= */
function calcularMateriaisVariaveis(
  madeira: MadeiraItem[],
  tipoObra: string,
  largura: number,
): MadeiraItem[] {
  const materiais: MadeiraItem[] = [];

  /* --- identificar colunas --- */
  const linhasColuna = madeira.reduce((acc, item) => {
    const desc = item.descricao.toLowerCase();
    if (desc.includes("linha") && desc.includes("coluna")) {
      return acc + item.quantidade;
    }
    return acc;
  }, 0);
  const temColunas = linhasColuna > 0;
  const qtdColunas = temColunas ? linhasColuna / 2 : 0;

  /* Parafusos Franceses + Cimento/Areia/Brita */
  if (temColunas) {
    materiais.push(
      {
        descricao: "Parafusos Franceses",
        quantidade: qtdColunas * 3 + 3,
      },
      {
        descricao: "Cimento, Areia e Brita",
        quantidade: ceil(qtdColunas / 2),
      },
    );
  }

  /* Parafuso Sextavado */
  let qtdSextavado = 0;
  const pontalete = madeira.find((m) =>
    m.descricao.toLowerCase().includes("pontalete"),
  );
  if (pontalete) qtdSextavado += pontalete.quantidade * 3;

  const linhaParede = madeira.find((m) =>
    m.descricao.toLowerCase().includes("parede"),
  );
  if (linhaParede) qtdSextavado += ceil(largura);

  if (qtdSextavado > 0) {
    qtdSextavado += 2; // extras
    materiais.push({
      descricao: "Parafuso Sextavado",
      quantidade: qtdSextavado,
    });
  }

  /* Rufo + Silicone PU (somente Linha na Parede) */
  if (tipoObra.toLowerCase().startsWith("linha na parede")) {
    materiais.push(
      { descricao: "Rufo", quantidade: ceil(largura) },
      { descricao: "Silicone PU", quantidade: ceil(largura / 2.5) },
    );
  }

  return materiais;
}

/* ============= TELHAS ============= */
function calcularTelhas(
  tipoObra: string,
  largura: number,
  comprimento: number,
): MadeiraItem[] {
  /* não calcula telhas para Pergolado / Caramanchão */
  if (tipoObra.startsWith("Pergolado") || tipoObra.startsWith("Caramanchão"))
    return [];

  const area = largura * comprimento;
  const formulas: Record<
    string,
    { factor: number; offset: number }
  > = {
    Romana: { factor: 17, offset: 40 },
    Americana: { factor: 12, offset: 40 },
    Colonial: { factor: 33, offset: 50 },
  };

  return Object.entries(formulas).map(([descricao, { factor, offset }]) => ({
    descricao: `Telha ${descricao}`,
    quantidade: ceil(area * factor + offset),
  }));
}

/* ============= MAIN ============= */
export async function calcularMateriais(
  tipoObra: string,
  largura: number,
  comprimento: number,
): Promise<MaterialCalculado[]> {
  /* 1. Madeira */
  const madeira = calcularMadeira(tipoObra, largura, comprimento);

  /* 2. Materiais variáveis extras */
  const extras = calcularMateriaisVariaveis(madeira, tipoObra, largura);

  /* 3. Telhas */
  const telhas = calcularTelhas(tipoObra, largura, comprimento);

  /* 4. Fixos (receitas_fixas) */
  const fixosDB = await getReceitasFixas(tipoObra);

  /* 5. Build dicionário de quantidades (descrição ou id) */
  const mapQtd = new Map<string | number, number>();

  // helper
  const addQtd = (key: string | number, qtd: number) =>
    mapQtd.set(key, (mapQtd.get(key) ?? 0) + qtd);

  madeira.forEach((m) => addQtd(m.descricao, m.quantidade));
  extras.forEach((m) => addQtd(m.descricao, m.quantidade));
  telhas.forEach((m) => addQtd(m.descricao, m.quantidade));
  fixosDB.forEach((f) => addQtd(f.material_id, f.quantidade));

  /* 6. Buscar info dos materiais no banco */
  const ids = fixosDB.map((f) => f.material_id);
  const descricoes = [...mapQtd.keys()]
    .filter((k) => typeof k === "string") as string[];

  const [infoIds, infoDesc] = await Promise.all([
    getMateriaisByIds(ids),
    getMateriaisByDescricoes(descricoes),
  ]);

  const infoAll: MaterialRow[] = [...infoIds, ...infoDesc];
  const infoById = new Map<number, MaterialRow>(
    infoAll.map((m) => [m.id, m]),
  );
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");
  const infoBySlug = new Map<string, MaterialRow>(
    infoAll.map((m) => [m.slug, m]),
  );

  /* 7. Montar lista final */
  const resultado: MaterialCalculado[] = [];

  for (const [key, quantidade] of mapQtd) {
    let row: MaterialRow | undefined;

    if (typeof key === "number") {
      // veio de receitas_fixas
      row = infoById.get(key);
    } else {
      // descrição
      row = infoBySlug.get(slugify(key));
    }

    if (row) {
      const total = Number(row.preco_unitario) * quantidade;
      resultado.push({
        id: row.id,
        descricao: row.descricao,
        tipo: row.tipo,
        unidade: row.unidade,
        quantidade,
        preco_unitario: Number(row.preco_unitario),
        total,
      });
    } else {
      /* não cadastrado no banco – devolve com id null / preço 0 */
      resultado.push({
        id: null,
        descricao: key.toString(),
        tipo: null,
        unidade: null,
        quantidade,
        preco_unitario: 0,
        total: 0,
      });
    }
  }

  /* 8. Ordenação opcional (alfabética) */
  resultado.sort((a, b) => a.descricao.localeCompare(b.descricao));

  return resultado;
}
