// src/actions/equipes-db/equipes-db.ts
"use server";

import { prisma } from "@/lib/prisma";

export type Equipe = { id: number; nome: string };

type ListarArgs = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function listarEquipes(args: ListarArgs = {}): Promise<Equipe[]> {
  const page = Math.max(1, Number(args.page ?? 1));
  const pageSize = Math.max(1, Math.min(500, Number(args.pageSize ?? 50)));

  const where = args.search
    ? { nome: { contains: String(args.search).trim(), mode: "insensitive" as const } }
    : {};

  const rows = await prisma.equipes.findMany({
    where,
    orderBy: { nome: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, nome: true },
  });

  return rows as Equipe[];
}

export async function obterEquipe(id: number): Promise<Equipe | null> {
  if (!Number.isFinite(id)) return null;
  const row = await prisma.equipes.findUnique({
    where: { id: Number(id) },
    select: { id: true, nome: true },
  });
  return row as Equipe | null;
}
