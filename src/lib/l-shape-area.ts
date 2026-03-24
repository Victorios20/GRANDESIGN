export type LShapeDimensionsInput = {
  larguraMaior?: number | null
  larguraMenor?: number | null
  comprimentoMaior?: number | null
  comprimentoMenor?: number | null
}

function toValidDimension(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null
}

export function calculateLShapeArea({
  larguraMaior,
  larguraMenor,
  comprimentoMaior,
  comprimentoMenor,
}: LShapeDimensionsInput): number {
  const lMaior = toValidDimension(larguraMaior)
  const lMenor = toValidDimension(larguraMenor)
  const cMaior = toValidDimension(comprimentoMaior)
  const cMenor = toValidDimension(comprimentoMenor)

  if (lMaior == null || lMenor == null || cMaior == null || cMenor == null) return 0

  const area = cMenor * lMaior + (cMaior - cMenor) * lMenor
  return Number.isFinite(area) && area > 0 ? area : 0
}
