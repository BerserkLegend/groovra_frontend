import React from "react"
import "./style.css"
import IconDashboard from "./Dashboard.svg"
import IconContent from "./Content.svg"
import IconUsers from "./Users.svg"
import IconSecurity from "./Security.svg"
import IconRoles from "./Roles.svg"
import IconSettings from "./Settings.svg"
import IconSupport from "./Support.svg"

export type AdminSectionKey = "dashboard" | "content" | "users" | "security" | "roles"

interface NavItemData {
  key: AdminSectionKey
  label: string
  iconSrc: string
}

const NAV_ITEMS: NavItemData[] = [
  { key: "dashboard", label: "Інформаційна панель", iconSrc: IconDashboard },
  { key: "content", label: "Контент", iconSrc: IconContent },
  { key: "users", label: "Користувачі", iconSrc: IconUsers },
  { key: "security", label: "Безпека", iconSrc: IconSecurity },
  { key: "roles", label: "Ролі", iconSrc: IconRoles },
]

interface SidebarProps {
  activeSection: AdminSectionKey
  onSelectSection: (key: AdminSectionKey) => void
}

export const Sidebar = ({ activeSection, onSelectSection }: SidebarProps): React.JSX.Element => {
  return (
    <aside className="AdminSidebar">
      <div className="SidebarTop">
        <div className="SidebarLogoBlock">
          <span className="SidebarLogoText">GROOVRA</span>
          <span className="SidebarLogoSub">Консоль адміністратора</span>
        </div>

        <nav className="SidebarNav" aria-label="Основна навігація">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`SidebarNavLink${activeSection === item.key ? " SidebarNavLinkActive" : ""}`}
              onClick={() => onSelectSection(item.key)}
              aria-current={activeSection === item.key ? "page" : undefined}
            >
              <img className="SidebarNavIcon" src={item.iconSrc} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="SidebarBottom">
        <div className="SidebarStatusBox">
          <span className="SidebarStatusTitle">Стан системи</span>
          <div className="SidebarStatusRow">
            <span className="SidebarStatusDot" />
            <span className="SidebarStatusText">Гарний стан всіх систем</span>
          </div>
        </div>

        <button type="button" className="SidebarNavLink">
          <img className="SidebarNavIcon" src={IconSettings} />
          <span>Налаштування</span>
        </button>
        <button type="button" className="SidebarNavLink">
          <img className="SidebarNavIcon" src={IconSupport} />
          <span>Підтримка</span>
        </button>
      </div>
    </aside>
  )
}