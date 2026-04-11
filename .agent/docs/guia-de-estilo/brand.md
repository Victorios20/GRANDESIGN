# Guia de Estilo – Grandesign

> Referência viva do design system. Atualizado com base no módulo de Pedidos de Compra (aprovado).

---

## 1. Tipografia

| Uso              | Fonte  | Peso            | Notas                               |
| ---------------- | ------ | --------------- | ----------------------------------- |
| Títulos (h1)     | Inter  | Bold (700)      | `text-xl md:text-2xl tracking-tight` |
| Títulos (h2–h3)  | Inter  | SemiBold (600)  |                                     |
| Corpo / labels   | Inter  | Regular (400)   | Base: 14px (`text-sm`)              |
| Cabeçalhos tabela| Inter  | SemiBold (600)  | `text-[11px] uppercase tracking-[0.08em]` |
| Código / IDs     | Mono   | SemiBold (600)  | Ex: número do pedido (`font-mono text-sm`) |

---

## 2. Paleta de Cores (ÚNICA — proibido criar fora daqui)

### Núcleo

| Token              | Hex        | Uso                                              |
| ------------------ | ---------- | ------------------------------------------------ |
| `--brand-primary`  | `#2c201b`  | Texto forte, títulos, ícones, checkboxes         |
| `--brand-secondary`| `#393316`  | Botão primário, heading principal, sombra de fundo |
| `--brand-accent`   | `#f5d193`  | Destaques, badges, alertas suaves                |
| `--brand-bg`       | `#FAF3E0`  | Fundo geral de páginas e contexto                |

### Superfícies e bordas (derivadas — sem inventar outros hex)

| Uso                                   | Valor                    |
| ------------------------------------- | ------------------------ |
| Superfície branca (cards, tabelas)    | `#ffffff`                |
| Fundo de cabeçalho de tabela          | `#faf8f3`                |
| Fundo de painel/seleção sutil         | `#f7f4ed`                |
| Fundo de linha selecionada            | `#f6f2e7`                |
| Hover de linha selecionada            | `#f3ecdc`                |
| Hover de linha padrão                 | `#faf8f4`                |
| Toolbar / painel de seleção           | `#f7f4ed`                |
| Borda geral (cards, shells)           | `#e8e1d6`                |
| Borda de cabeçalho de tabela          | `#e7e0d4`                |
| Borda de linha de tabela              | `#efe8dc`                |
| Borda de controles / inputs           | `#d9d3c8`                |
| Borda de badges / sutis               | `#ddd7cc`                |

### Texto

| Uso                             | Valor                                             |
| ------------------------------- | ------------------------------------------------- |
| Texto primário                  | `#2c201b`                                         |
| Texto secundário / subtítulos   | `#6f6556`                                         |
| Texto mudo / placeholder        | `#7b705f`                                         |
| Texto muito mudo / ícones       | `#9a8f7c`                                         |
| Texto de data / entrega         | `#5b5347`                                         |
| Opacidade sobre `primary`       | `rgba(44, 32, 27, X)` — nunca inventar hex novo   |

### Semântica (status / feedback)

| Estado            | Uso                         | Referência Tailwind          |
| ----------------- | --------------------------- | ----------------------------|
| Rascunho          | Pedidos em draft            | `stone-100/700/300`         |
| Aprovado          | Pedidos aprovados           | `sky-50/700/200`            |
| Em Compra         | Em processo de compra       | `amber-50/700/200`          |
| Aguardando Pagto  | Pagamento pendente          | `orange-50/700/200`         |
| Aguardando Entrega| Entrega pendente            | `yellow-50/700/200`         |
| Entregue          | Concluído                   | `emerald-50/700/200`        |
| Cancelado         | Cancelado                   | `red-100/800/300`           |
| Variação positiva (acima do orçado) | `#9b4b1d` (terroso laranja) |                |
| Variação negativa (abaixo)          | `#2f7a52` (verde escuro)    |                |
| Ação destrutiva (delete)            | `#8f3f37` (vermelho muted)  |                |

### Categorias de pedido

| Categoria  | Badge                                    |
| ---------- | ---------------------------------------- |
| Telha      | `bg-red-100 text-red-800 border-red-200` |
| Madeira    | `bg-amber-100 text-amber-900 border-amber-200` |
| Andaime    | `bg-gray-200 text-gray-800 border-gray-300` |
| Materiais  | `bg-blue-100 text-blue-800 border-blue-200` |

---

## 3. Espaçamento e Grid

- **Base**: múltiplos de 4px / 8px (8-point grid)
- **Gap padrão entre seções**: `gap-3` (12px) ou `gap-4` (16px)
- **Padding de células de tabela**: `px-3 py-3.5`
- **Padding de toolbars**: `px-4 py-3`
- **Largura de leitura**: máx. 340px para células descritivas

---

## 4. Bordas e Raios

| Elemento                        | Border-radius                    |
| ------------------------------- | -------------------------------- |
| Cards / shells principais       | `rounded-2xl` (16px)            |
| Toolbars, painéis secundários   | `rounded-xl` (12px)             |
| Botões, inputs, badges          | `rounded-lg` (8px)              |
| Badges pequenos (categorias)    | `rounded-md` (6px)              |
| Toggle group (view mode)        | `rounded-lg` externo, `rounded-md` interno |

---

## 5. Sombras

| Tipo                          | Valor                                        |
| ----------------------------- | -------------------------------------------- |
| Shell / card padrão           | `shadow-[0_1px_2px_rgba(16,24,40,0.04)]`    |
| Sombra máxima permitida       | `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`    |
| Sem sombra (ghost buttons)    | `shadow-none`                                |

---

## 6. Botões

### Primário
- Fundo: `#393316` (`--brand-secondary`)
- Texto: `#faf3e0` (`--brand-bg`)
- Hover: `#2f2a13`
- Focus ring: `#393316/20`
- Tamanho padrão: `h-10 rounded-lg px-4 text-sm`

### Secundário / Sutil
- Fundo: `#f7f4ec`
- Borda: `border border-[#ddd7cc]`
- Texto: `#393316`
- Hover: `#f1ecdf`
- Tamanho: `h-9 rounded-lg`

### Ghost / texto
- Fundo: `transparent`
- Texto: `#6f6556`
- Hover bg: `#f3efe6`
- Hover texto: `#2c201b`
- Tamanho: `h-9 rounded-lg px-3`

### Ghost muted (ícone de contexto)
- Fundo/borda: `transparent`
- Texto: `#7b705f`
- Hover: borda `#ddd7cc`, fundo `#f4efe4`, texto `#2c201b`
- Tamanho: `h-8 w-8 rounded-lg`

### Toggle group (Lista / Kanban)
- Container: `bg-[#ebefe8] border-[primary/0.12]`
- Ativo: `bg-white text-[#2c201b] shadow-sm`
- Inativo: `text-[#5f655a] hover:bg-white/70`

---

## 7. Inputs e Controles

- Altura padrão: `h-9`
- Border-radius: `rounded-lg`
- Borda: `border-[#d9d3c8]`
- Fundo: `bg-white`
- Texto: `#2c201b`
- Focus ring: `ring-[#393316]/15`

---

## 8. Componentes de Badge / Chip

### Categoria / status
```
rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-[0.01em]
```

### Integração (texto muito sutil)
```
rounded-md border border-[#ebe5da] bg-[#faf8f4] px-2 py-0.5 text-[11px] font-medium text-[#8a7f70]
```

---

## 9. Regras Invioláveis

1. **Proibido** usar cores fora da paleta e superfícies definidas acima.
2. **Proibido** usar gradiente de qualquer tipo.
3. **Proibido** usar sombra pesada — max: `0 1px 2px rgba(16,24,40,0.04)`.
4. **Proibido** cores vibrantes sólidas (azul elétrico, verde neon, roxo) — use apenas as semânticas de status.
5. **Texto primário** sempre `#2c201b`. Variações de opacidade via `rgba(44, 32, 27, X)`.
6. **Título de página (h1)** sempre `#393316`, `font-bold tracking-tight`.
7. **Fundo de página**: `#FAF3E0`.
8. **Fontes**: Inter para tudo; `font-mono` apenas para IDs e números de referência.

---

## 10. Referência Rápida (Tokens CSS)

```css
:root {
  --brand-primary:   #2c201b;  /* texto forte */
  --brand-secondary: #393316;  /* CTA, heading */
  --brand-accent:    #f5d193;  /* destaque suave */
  --brand-bg:        #FAF3E0;  /* fundo página */

  /* superfícies */
  --surface-white:       #ffffff;
  --surface-header:      #faf8f3;
  --surface-subtle:      #faf8f4;
  --surface-selection:   #f6f2e7;
  --surface-hover-sel:   #f3ecdc;
  --surface-panel:       #f7f4ed;

  /* bordas */
  --border-shell:    #e8e1d6;
  --border-row:      #efe8dc;
  --border-control:  #d9d3c8;
  --border-badge:    #ddd7cc;

  /* texto */
  --text-primary:    #2c201b;
  --text-secondary:  #6f6556;
  --text-muted:      #7b705f;
  --text-faint:      #9a8f7c;
}
```

---

## 11. Operational List Recipe

Telas operacionais nao devem ser montadas apenas "com base na paleta". O baseline aprovado para esse tipo de interface e o recipe visual de `Contas a Pagar` e `Pedidos de Compra`.

### Quando usar

- Listagens com filtros, selecao em lote, tabela e paginacao
- Telas de trabalho continuo, consulta, conciliacao e acompanhamento
- Interfaces em que a tabela e a area principal e o topo nao deve parecer dashboard

### Recipe obrigatorio

- **Page background:** `#F7F4EE`
- **Shell principal:** `rounded-2xl border border-[#e8e1d6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]`
- **Toolbar / filtros:** `rounded-xl border border-[#e8e1d6] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]`
- **Subtle panel:** `rounded-xl border border-[#ece6db] bg-[#faf8f3]`
- **Selection toolbar:** `rounded-xl border border-[#ddd6c9] bg-[#f7f4ed] px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]`
- **Controles:** `h-9 rounded-lg border-[#d9d3c8] bg-white text-[#2c201b]`
- **Busca:** `h-10`, placeholder `#9a8f7c`, sem fundo destacado
- **Chips ativos:** `rounded-md border border-[#ddd7cc] bg-[#f6f4ef] text-[#5f584c]`
- **Tabela header:** `bg-[#faf8f3]` com borda `#e7e0d4`
- **Tabela body:** linhas `bg-white`, borda `#efe8dc`, hover `#faf8f4`
- **Linha selecionada:** `#f6f2e7`, hover `#f3ecdc`
- **Footer / paginacao:** mesma linguagem de toolbar, com texto `#7b705f`, botoes brancos com borda `#ddd7cc` e pagina ativa `#393316 / #faf3e0`

### Regra de composicao

- Nao inventar uma nova pele para cada modulo operacional.
- Se a tela for lista operacional, copiar o recipe aprovado primeiro.
- Tokens de cor continuam sendo a base, mas a combinacao de shell, borda, hover, chips, toolbar e footer deve seguir esse recipe.
- Quando `Contas a Pagar` e outro modulo divergirem, `Contas a Pagar` vence como referencia para telas financeiras operacionais.
