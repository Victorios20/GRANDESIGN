# Guia de Estilo – Grandesign

## Fontes

| Uso     | Fonte        | Peso    |
| ------- | ------------ | ------- |
| Títulos | Inter        | Bold    |
| Texto   | Inter        | Regular |

## Paleta de Cores (ÚNICA — proibido criar outras)

| Token     | Hex       | Uso                            |
| --------- | --------- | ------------------------------ |
| accent    | `#f5d193` | Destaques, badges, alertas     |
| primary   | `#2c201b` | Texto, títulos, ícones, botões |
| background| `#FAF3E0` | Fundo geral de páginas         |
| secondary | `#393316` | Texto secundário escuro        |

## Regras Obrigatórias

1. **Proibido** usar cores fora da paleta acima.
2. **Proibido** usar gradiente.
3. **Proibido** usar sombra pesada (max: `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`).
4. **Título** sempre em `#2c201b`.
5. **Texto padrão** em `#2c201b`. Variações de opacidade somente via `rgba(44, 32, 27, X)` — nunca inventar hex novo.

## Botões

### Primário
- Fundo: `#2c201b`
- Texto: `#FAF3E0`
- Hover: escurecer levemente (`#231a15`)

### Secundário
- Fundo: `transparent`
- Borda: `1px solid #2c201b`
- Texto: `#2c201b`
- Hover: `rgba(44, 32, 27, 0.05)` de fundo

## Fundo Geral
- Background padrão de página: `#FAF3E0`
