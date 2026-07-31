import React, { useState } from "react"
import "./style.css"
import IconSearch from "./Search.svg"
import IconBell from "./Bell.svg"
import IconHistory from "./History.svg"
import AvatarPlaceholder from "./Avatar.svg"

interface HeaderProps {
  adminName?: string
  adminRole?: string
  onSearch?: (query: string) => void
}

export const Header = ({
  adminName = "Admin",
  adminRole = "головний адмін",
  onSearch,
}: HeaderProps): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    if (onSearch) {
      onSearch(searchQuery.trim())
    } else {
      console.log("Пошук:", searchQuery.trim())
    }
  }

  const handleHistoryClick = () => {
    console.log("TODO: дія кнопки 'History' в хедері ще не визначена")
  }

  return (
    <header className="AdminHeader">
      <form className="HeaderSearchForm" onSubmit={handleSearchSubmit} role="search">
        <div className="HeaderSearchWrap">
          <img className="HeaderSearchIcon" src={IconSearch} />
          <input
            className="HeaderSearchInput"
            type="text"
            placeholder="Пошук об'єктів системи..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      <div className="HeaderRight">
        <div className="HeaderIconGroup">
          <button type="button" className="HeaderIconBtn" aria-label="Сповіщення">
            <img src={IconBell} />
            <span className="HeaderIconBadge" />
          </button>
          <button type="button" className="HeaderIconBtn" aria-label="Дії" onClick={handleHistoryClick}>
            <img src={IconHistory} />
          </button>
        </div>

        <div className="HeaderUser">
          <div className="HeaderUserText">
            <span className="HeaderUserName">{adminName}</span>
            <span className="HeaderUserRole">{adminRole}</span>
          </div>
          <div className="HeaderAvatarBorder">
            <img className="HeaderAvatar" src={AvatarPlaceholder} />
          </div>
        </div>
      </div>
    </header>
  )
}