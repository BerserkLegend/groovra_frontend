import React, { useState } from "react"
import { Sidebar, type AdminSectionKey } from "./components/Sidebar"
import { Header } from "./components/Header"
import { DashboardHeader } from "./components/DashboardHeader"
import { StatsOverview } from "./components/StatsOverview"
import { ActivityFeed } from "./components/ActivityFeed"
import { ContentSection } from "./components/ContentSection"
import { UsersSection } from "./components/UsersSection"
import { SecuritySection } from "./components/SecuritySection"
import { RolesSection } from "./components/RolesSection"
import "./admin.css"

export const AdminPage = (): React.JSX.Element => {
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("dashboard")
  const [isRealtime, setIsRealtime] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [roleFilterRequest, setRoleFilterRequest] = useState<{ role: string; nonce: number } | null>(null)

  const handleViewRoleUsers = (roleName: string) => {
    setRoleFilterRequest({ role: roleName, nonce: Date.now() })
    setActiveSection("users")
  }

  const handleExportPdf = () => {
    setIsExporting(true)
    window.setTimeout(() => setIsExporting(false), 1200)
  }

  return (
    <div className="AdminPage">
      <Sidebar activeSection={activeSection} onSelectSection={setActiveSection} />
      <Header />

      <main className="AdminMain">
        <div className="AdminMainInner">
          {activeSection === "dashboard" && (
            <>
              <DashboardHeader
                isExporting={isExporting}
                isRealtime={isRealtime}
                onExportPdf={handleExportPdf}
                onToggleRealtime={() => setIsRealtime((v) => !v)}
              />
              <StatsOverview onViewReportsQueue={() => console.log("TODO: перейти до черги звітів")} />
              <ActivityFeed />
            </>
          )}

          {activeSection === "content" && <ContentSection />}
          {activeSection === "users" && <UsersSection roleFilterRequest={roleFilterRequest} />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "roles" && <RolesSection onViewRoleUsers={handleViewRoleUsers} />}
        </div>
      </main>
    </div>
  )
}