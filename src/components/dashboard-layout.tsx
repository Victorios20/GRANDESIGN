"use client"

import React from "react"

import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  showNewButton?: boolean
  onNewClick?: () => void
  newButtonLabel?: string
}

export function DashboardLayout({ 
  children, 
  title,
  showNewButton = true,
  onNewClick,
  newButtonLabel
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-64">
        <DashboardTopbar 
          title={title} 
          showNewButton={showNewButton}
          onNewClick={onNewClick}
          newButtonLabel={newButtonLabel}
        />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
