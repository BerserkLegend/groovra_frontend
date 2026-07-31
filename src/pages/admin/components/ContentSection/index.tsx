import React, { useMemo, useState, useEffect } from "react"
import "./style.css"
import IconFilter from "./Filter.svg"
import IconTrash from "./Trash.svg"
import IconCheck from "./Check.svg"
import IconDownload from "./Download.svg"
import IconChevronDown from "./ChevronDown.svg"
import IconGrid from "./Grid.svg"
import IconList from "./List.svg"
import IconReset from "./Reset.svg"
import IconAi from "./Ai.svg"
import IconFlag from "./Flag.svg"
import IconMore from "./More.svg"
import IconChevronLeft from "./ChevronLeft.svg"
import IconChevronRight from "./ChevronRight.svg"
import {
  useGetTracksQuery,
  useGetGenresQuery,
  useUpdateTrackStatusMutation,
  useBulkDeleteTracksMutation,
  type GetTracksParams,
  type AdminTrack,
} from "../../../../store/api/contentApi"

const STATUS_OPTIONS = [
  { value: "all", label: "Активні та позначені" },
  { value: "active", label: "Тільки активні" },
  { value: "flagged", label: "Тільки позначені" },
]

const SORT_OPTIONS = [
  { value: "plays_desc", label: "Найбільше відтворень" },
  { value: "plays_asc", label: "Найменше відтворень" },
  { value: "title_asc", label: "Назва (А–Я)" },
]

const PER_PAGE_OPTIONS = [
  { value: "25", label: "25 на сторінку" },
  { value: "50", label: "50 на сторінку" },
  { value: "100", label: "100 на сторінку" },
]

export const ContentSection = (): React.JSX.Element => {
  const [showFilters, setShowFilters] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [sortOption, setSortOption] = useState(SORT_OPTIONS[0].value)
  const [genreFilter, setGenreFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0].value)
  const [perPage, setPerPage] = useState("50")

  const [searchText, setSearchText] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const [updateStatus] = useUpdateTrackStatusMutation()
  const [bulkDelete] = useBulkDeleteTracksMutation()

  // Get genres for filter
  const { data: genres = [] } = useGetGenresQuery()

  const genreOptions = useMemo(() => {
    // Ensure "all" is always at the start
    const uniqueGenres = (genres as string[]).filter((g) => g !== "all")
    return ["all", ...uniqueGenres]
  }, [genres])

  // Build API params
  const pageSize = parseInt(perPage, 10)

  const apiParams: GetTracksParams = useMemo(() => {
    const params: GetTracksParams = {
      pageNumber: currentPage,
      pageSize,
    }
    if (debouncedSearch) params.search = debouncedSearch
    if (genreFilter !== "all") params.genre = genreFilter
    if (statusFilter !== "all") params.status = statusFilter as 'active' | 'flagged'
    return params
  }, [currentPage, pageSize, debouncedSearch, genreFilter, statusFilter])

  // Fetch tracks from API
  const { data: tracksData, isLoading, error, refetch } = useGetTracksQuery(apiParams, {
    refetchOnMountOrArgChange: true,
  })

  const tracks = useMemo<AdminTrack[]>(() => {
    return tracksData?.items ?? []
  }, [tracksData])

  const totalCount = tracksData?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => clearTimeout(timer)
  }, [searchText])

  // When page/filter changes, reset selection
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set())
  }, [apiParams])

  const visibleTracks = useMemo(() => {
    const result = [...tracks]

    if (sortOption === "plays_desc") result.sort((a: AdminTrack, b: AdminTrack) => b.playsValue - a.playsValue)
    else if (sortOption === "plays_asc") result.sort((a: AdminTrack, b: AdminTrack) => a.playsValue - b.playsValue)
    else if (sortOption === "title_asc") result.sort((a: AdminTrack, b: AdminTrack) => a.title.localeCompare(b.title, "uk"))

    return result
  }, [tracks, sortOption])

  const allVisibleSelected = visibleTracks.length > 0 && visibleTracks.every((t: AdminTrack) => selectedIds.has(t.id))

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set()
      const next = new Set(prev)
      visibleTracks.forEach((t: AdminTrack) => next.add(t.id))
      return next
    })
  }

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      await bulkDelete([...selectedIds]).unwrap()
      setSelectedIds(new Set())
      refetch()
    } catch {
      // Error shown by RTK Query
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    try {
      await Promise.all(
        [...selectedIds].map((id) => updateStatus({ trackId: id, status: "active" }).unwrap())
      )
      setSelectedIds(new Set())
      refetch()
    } catch {
      // Error shown by RTK Query
    }
  }

  const handleExportSelected = () => {
    const rows = selectedIds.size > 0 ? visibleTracks.filter((t: AdminTrack) => selectedIds.has(t.id)) : visibleTracks
    if (rows.length === 0) return

    const header = "ID,Назва,Виконавець,Жанр,Прослуховування,Статус"
    const csvLines = rows.map((t: AdminTrack) =>
      [t.id, t.title, t.artist, t.genre, t.plays, t.status === "active" ? "Активний" : "Позначено"].join(",")
    )
    const csv = [header, ...csvLines].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "groovra-tracks.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleResolveModeration = async (id: string) => {
    try {
      await updateStatus({ trackId: id, status: "active" }).unwrap()
      refetch()
    } catch {
      // Error shown by RTK Query
    }
  }

  const handleResetFilters = () => {
    setGenreFilter("all")
    setStatusFilter(STATUS_OPTIONS[0].value)
    setPerPage("50")
    setCurrentPage(1)
    setSearchText("")
  }

  const flaggedCount = tracks.filter((t: AdminTrack) => t.status === "flagged").length

  if (isLoading) {
    return (
      <div className="AdminContSection">
        <div className="ContLoading">Завантаження контенту...</div>
      </div>
    )
  }

  return (
    <div className="AdminContSection">
      <span className="ContGlow ContGlowTop" />
      <span className="ContGlow ContGlowBottom" />

      {/* Page Header & Stats */}
      <div className="ContPageHeader">
        <div className="ContHeaderText">
          <h1 className="ContTitle">Управління треками</h1>
          <div className="ContStatsRow">
            <span className="ContStat">
              <span className="ContStatDot" />
              {totalCount.toLocaleString("uk-UA")} треків загалом
            </span>
            <span className="ContStatSep" />
            <span className="ContStat">
              <span className="ContStatDot" />
              {flaggedCount} Позначений контент
            </span>
          </div>
        </div>

        <div className="ContHeaderActions">
          <button
            type="button"
            className={`ContBtnOutline${showFilters ? " ContBtnOutlineActive" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
            aria-pressed={showFilters}
          >
            <img src={IconFilter} />
            Розширені фільтри
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="ContSearchRow">
        <input
          type="text"
          className="ContSearchInput"
          placeholder="Пошук за назвою або виконавцем..."
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1) }}
          aria-label="Пошук треків"
        />
        {isLoading && <span className="ContSearchSpinner" />}
      </div>

      {/* Bulk Action Toolbar */}
      <div className="ContToolbar">
        <div className="ContToolbarLeft">
          <div className="ContSelectAllBox">
            <input
              type="checkbox"
              className="ContCheckbox"
              checked={allVisibleSelected}
              onChange={handleToggleSelectAll}
              aria-label="Вибрати всі треки на сторінці"
            />
            <span className="ContSelectAllLabel">{selectedIds.size} ВИБРАНІ</span>
          </div>

          <span className="ContDivider" />

          <div className="ContBulkActions">
            <button type="button" className="ContToolbarBtn" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
              <img src={IconTrash} />
              ВИДАЛИТИ
            </button>
            <button type="button" className="ContToolbarBtn" onClick={handleBulkApprove} disabled={selectedIds.size === 0}>
              <img src={IconCheck} />
              ЗАТВЕРДЖЕНО
            </button>
            <button type="button" className="ContToolbarBtn" onClick={handleExportSelected}>
              <img src={IconDownload} />
              ЕКСПОРТ
            </button>
          </div>
        </div>

        <div className="ContToolbarRight">
          <div className="ContSortBox">
            <select
              className="ContSortSelect"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Сортування треків"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {`Сортувати: ${opt.label}`}
                </option>
              ))}
            </select>
            <img className="ContSelectCaret" src={IconChevronDown} />
          </div>

          <div className="ContViewToggle">
            <button
              type="button"
              className={`ContViewBtn${viewMode === "grid" ? " ContViewBtnActive" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Сітка"
            >
              <img src={IconGrid} />
            </button>
            <button
              type="button"
              className={`ContViewBtn${viewMode === "list" ? " ContViewBtnActive" : ""}`}
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="Список"
            >
              <img src={IconList} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="ContFilters">
          <label className="ContFilterBox">
            <span className="ContFilterLabel">ЖАНР</span>
            <span className="ContFilterValueRow">
              <select className="ContFilterSelect" value={genreFilter} onChange={(e) => { setGenreFilter(e.target.value); setCurrentPage(1) }}>
                {genreOptions.map((g) => (
                  <option key={g} value={g}>
                    {g === "all" ? "Усі жанри" : g}
                  </option>
                ))}
              </select>
              <img className="ContSelectCaret" src={IconChevronDown} />
            </span>
          </label>

          <label className="ContFilterBox">
            <span className="ContFilterLabel">СТАТУС</span>
            <span className="ContFilterValueRow">
              <select className="ContFilterSelect" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <img className="ContSelectCaret" src={IconChevronDown} />
            </span>
          </label>

          <label className="ContFilterBox">
            <span className="ContFilterLabel">НА СТОРІНЦІ</span>
            <span className="ContFilterValueRow">
              <select className="ContFilterSelect" value={perPage} onChange={(e) => { setPerPage(e.target.value); setCurrentPage(1) }}>
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <img className="ContSelectCaret" src={IconChevronDown} />
            </span>
          </label>

          <button type="button" className="ContFilterReset" onClick={handleResetFilters}>
            <img src={IconReset} />
            СКИДАННЯ ФІЛЬТРІВ
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="ContErrorRow">
          Помилка завантаження даних. Спробуйте оновити сторінку.
          <button type="button" className="ContRetryBtn" onClick={() => refetch()}>Оновити</button>
        </div>
      )}

      {/* Tracks Table / Grid */}
      {viewMode === "list" ? (
        <div className="ContTableCard">
          <div className="ContTableScroll">
            <div className="ContTableHeaderRow">
              <div className="ContCell ContCellCheckbox">
                <input
                  type="checkbox"
                  className="ContCheckbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Вибрати всі треки"
                />
              </div>
              <div className="ContCell ContCellDetails">ДЕТАЛІ ТРЕКИ</div>
              <div className="ContCell ContCellArtist">МИТЦІ</div>
              <div className="ContCell ContCellGenre">ЖАНР</div>
              <div className="ContCell ContCellEngagement">ЗАЛУЧЕННЯ</div>
              <div className="ContCell ContCellStatus">СТАТУС</div>
              <div className="ContCell ContCellActions ContCellRight">ДІЇ</div>
            </div>

            <div className="ContTableBody">
              {visibleTracks.map((track: AdminTrack) => (
                <div key={track.id} className={`ContRow${track.status === "flagged" ? " ContRowFlagged" : ""}`}>
                  <div className="ContCell ContCellCheckbox">
                    <input
                      type="checkbox"
                      className="ContCheckbox"
                      checked={selectedIds.has(track.id)}
                      onChange={() => handleToggleSelectRow(track.id)}
                      aria-label={`Вибрати трек ${track.title}`}
                    />
                  </div>

                  <div className="ContCell ContCellDetails">
                    <span className="ContTrackCover" aria-hidden="true" />
                    <div className="ContTrackInfo">
                      <span className="ContTrackTitle">{track.title}</span>
                      <div className="ContTrackMeta">
                        {track.aiGen && (
                          <span className="ContAiTag">
                            <img src={IconAi} />
                            AI GEN
                          </span>
                        )}
                        <span className="ContTrackId">ID: {track.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ContCell ContCellArtist">{track.artist}</div>

                  <div className="ContCell ContCellGenre">
                    <span className="ContGenrePill">{track.genre}</span>
                  </div>

                  <div className="ContCell ContCellEngagement">
                    <span className="ContPlaysValue">{track.plays}</span>
                    <span className="ContPlaysCaption">Прослуховування</span>
                  </div>

                  <div className="ContCell ContCellStatus">
                    {track.status === "active" ? (
                      <span className="ContStatus ContStatusActive">
                        <span className="ContStatusDot ContStatusDotActive" />
                        Активний
                      </span>
                    ) : (
                      <span className="ContStatus ContStatusFlagged">
                        <span className="ContStatusDot ContStatusDotFlagged" />
                        Позначено
                      </span>
                    )}
                  </div>

                  <div className="ContCell ContCellActions ContCellRight">
                    {track.status === "flagged" ? (
                      <button type="button" className="ContModerateBtn" onClick={() => handleResolveModeration(track.id)}>
                        <img src={IconFlag} />
                        Модерація
                      </button>
                    ) : (
                      <button type="button" className="ContRowMenuBtn" aria-label="Додаткові дії">
                        <img src={IconMore} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {visibleTracks.length === 0 && !isLoading && (
                <div className="ContEmptyRow">Немає треків, що відповідають вибраним фільтрам.</div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="ContPagination">
            <div className="ContPaginationLeft">
              <span className="ContPaginationSummary">
                Показано 1-{visibleTracks.length} із {totalCount.toLocaleString("uk-UA")} треків
              </span>
            </div>

            <div className="ContPaginationRight">
              <button
                type="button"
                className="ContPageArrow"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Попередня сторінка"
              >
                <img src={IconChevronLeft} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) pageNum = i + 1
                else if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`ContPageBtn${pageNum === currentPage ? " ContPageBtnActive" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {totalPages > 5 && <span className="ContPageEllipsis">...</span>}
              {totalPages > 5 && (
                <button
                  type="button"
                  className="ContPageBtn"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              )}

              <button
                type="button"
                className="ContPageArrow"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Наступна сторінка"
              >
                <img src={IconChevronRight} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ContGrid">
          {visibleTracks.map((track: AdminTrack) => (
            <div key={track.id} className={`ContGridCard${track.status === "flagged" ? " ContRowFlagged" : ""}`}>
              <div className="ContGridCardTop">
                <span className="ContTrackCover ContTrackCoverGrid" aria-hidden="true" />
                <input
                  type="checkbox"
                  className="ContCheckbox"
                  checked={selectedIds.has(track.id)}
                  onChange={() => handleToggleSelectRow(track.id)}
                  aria-label={`Вибрати трек ${track.title}`}
                />
              </div>
              <span className="ContTrackTitle">{track.title}</span>
              <span className="ContTrackId">{track.artist} • {track.code}</span>
              <span className="ContGenrePill">{track.genre}</span>
              <div className="ContGridCardBottom">
                <div>
                  <span className="ContPlaysValue">{track.plays}</span>
                  <span className="ContPlaysCaption"> Прослуховувань</span>
                </div>
                {track.status === "active" ? (
                  <span className="ContStatus ContStatusActive">
                    <span className="ContStatusDot ContStatusDotActive" />
                    Активний
                  </span>
                ) : (
                  <button type="button" className="ContModerateBtn" onClick={() => handleResolveModeration(track.id)}>
                    <img src={IconFlag} />
                    Модерація
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trends Card */}
      <div className="ContTrendCard">
        <div className="ContTrendHeader">
          <h2 className="ContTrendTitle">Тенденції контенту</h2>
          <p className="ContTrendText">
            Щотижневий аналіз контенту, створеного штучним інтелектом, у порівнянні з оригінальними треками
            користувачів. Значне зростання жанрів нейронного синтезу.
          </p>
        </div>
        <div className="ContTrendChart">
          {[48, 96, 72, 108, 57.59, 115.19, 86.39].map((h, i) => (
            <div
              key={i}
              className={`ContTrendBar${i % 2 === 0 ? " ContTrendBarCyan" : " ContTrendBarPurple"}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
