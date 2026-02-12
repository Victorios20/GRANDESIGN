import { z } from "zod"
import { TipoCategoria } from "@prisma/client"

export const createCategorySchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório").max(100),
    tipo: z.nativeEnum(TipoCategoria),
    cor: z.string().max(7).optional(),
    icone: z.string().max(50).optional(),
    categoria_pai_id: z.number().optional(),
})

export const updateCategorySchema = z.object({
    id: z.number(),
    nome: z.string().min(1).max(100).optional(),
    cor: z.string().max(7).optional(),
    icone: z.string().max(50).optional(),
    ativo: z.boolean().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
