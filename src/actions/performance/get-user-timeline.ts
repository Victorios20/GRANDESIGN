"use server"

import { prisma } from "@/lib/prisma"

export type UserTimelineAction = {
  id: string
  date: string
  action: string
  entity: string
  entityId: number | null
  detail: any
}

export async function getUserTimeline(userId: number): Promise<UserTimelineAction[]> {
  const logs = await prisma.auditLog.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 30
  })

  // We map the logs for the frontend
  return logs.map((log) => ({
    id: String(log.id),
    date: log.created_at.toISOString(),
    action: log.action,
    entity: log.entity,
    entityId: log.entity_id,
    detail: log.detail
  }))
}
