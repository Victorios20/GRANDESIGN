import { expect, test } from "vitest"
import { calcularValorFinalProposta, formatPropostaNumero } from "@/lib/proposta-utils"

test("soma mão de obra + materiais + frete + lucro", () => {
  expect(calcularValorFinalProposta({ maoObra: 1000, materiais: 2000, frete: 300, lucro: 700 })).toBe(4000)
})

test("arredonda para 2 casas", () => {
  expect(calcularValorFinalProposta({ maoObra: 10.115, materiais: 0, frete: 0, lucro: 0 })).toBe(10.12)
})

test("formata número da proposta com zero-padding", () => {
  expect(formatPropostaNumero(7)).toBe("0007")
  expect(formatPropostaNumero(1234)).toBe("1234")
})
