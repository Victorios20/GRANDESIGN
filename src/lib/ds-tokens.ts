/**
 * GRANDESIGN Design System — Tokens TypeScript
 *
 * Use para configurar bibliotecas externas que não leem CSS variables,
 * como Recharts, chart.js, etc.
 *
 * Fonte de verdade: src/app/globals.css + .agent/docs/guia-de-estilo/brand.md
 * NUNCA criar cores fora daqui.
 */

export const DS = {
  colors: {
    brand: {
      primary:   "#2c201b",  // texto forte, títulos
      secondary: "#393316",  // CTA, botão primário
      accent:    "#f5d193",  // destaques suaves
      bg:        "#FAF3E0",  // fundo geral de página
    },
    surface: {
      page:      "#F7F4EE",  // fundo de páginas operacionais
      white:     "#ffffff",  // cards, tabelas
      header:    "#faf8f3",  // cabeçalho de tabela
      subtle:    "#faf8f4",  // hover linha padrão
      selection: "#f6f2e7",  // linha selecionada
      panel:     "#f7f4ed",  // toolbar, painel de seleção
    },
    border: {
      shell:   "#e8e1d6",  // cards, shells
      th:      "#e7e0d4",  // cabeçalho de tabela
      row:     "#efe8dc",  // linhas de tabela
      control: "#d9d3c8",  // inputs, botões outline
      badge:   "#ddd7cc",  // badges, chips
    },
    text: {
      primary:   "#2c201b",  // padrão
      secondary: "#6f6556",  // subtítulos
      muted:     "#7b705f",  // placeholder, ícones
      faint:     "#9a8f7c",  // muito mudo
      date:      "#5b5347",  // datas, entregas
    },
    /** Paleta de gráficos — injetar diretamente nos props do Recharts */
    chart: ["#8B5E3C", "#D9A84E", "#376139", "#3D5A7E", "#8F3F37"] as const,
    /** Cores semânticas de ação/feedback */
    semantic: {
      destructive: "#8F3F37",  // delete, estorno
      positive:    "#2f7a52",  // variação positiva (lucro)
      warning:     "#9b4b1d",  // variação negativa (custo acima)
    },
  },

  /** Tipografia padrão para eixos e rótulos de gráficos */
  chart: {
    tick: {
      fill:     "#7b705f",  // text-muted
      fontSize: 11,
      fontFamily: "var(--font-geist-sans, Inter, sans-serif)",
    },
    grid: {
      stroke:          "#e8e1d6",  // border-shell
      strokeDasharray: "3 3",
    },
    tooltip: {
      contentStyle: {
        background:   "#ffffff",
        border:       "1px solid #e8e1d6",
        borderRadius: "8px",
        boxShadow:    "0 1px 2px rgba(16, 24, 40, 0.04)",
        fontSize:     "12px",
        color:        "#2c201b",
      },
      itemStyle: { color: "#2c201b" },
      labelStyle: {
        fontWeight: 600,
        color:      "#393316",
      },
    },
  },
} as const

export type DSChartColor = typeof DS.colors.chart[number]
export type DSColor = typeof DS.colors
