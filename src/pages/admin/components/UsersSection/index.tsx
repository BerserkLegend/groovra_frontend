import React, { useEffect, useState } from "react"
import "./style.css"
import { getAdminErrorMessage } from "../../adminError"
import IconUserPlus from "./UserPlus.svg"
import IconChevronLeft from "./ChevronLeft.svg"
import IconChevronRight from "./ChevronRight.svg"
import IconEdit from "./Edit.svg"
import IconMessage from "./Message.svg"
import IconEye from "./Eye.svg"
import IconApprove from "./Approve.svg"
import IconReject from "./Reject.svg"
import IconLayers from "./Layers.svg"

import {
  useGetAdminUsersQuery,
  useGetArtistApplicationsQuery,
  useApproveArtistApplicationMutation,
  useRejectArtistApplicationMutation,
  useToggleSuspendUserMutation,
  useResetUserPasswordMutation,
  useForceLogoutUserMutation,
  useCreateUserMutation,
  useBulkApproveApplicationsMutation,
  useBulkRejectApplicationsMutation,
  type AdminArtistApplication,
} from "../../../../store/api/adminApi"

const ROLES = ["Listener", "Artist", "Admin"]

const CreateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("Listener")
  const [createUser] = useCreateUserMutation()
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    try {
      await createUser({ username, email, password, role }).unwrap()
      onClose()
    } catch (err: unknown) {
      setError(getAdminErrorMessage(err))
    }
  }

  return (
    <div className="UsrModalOverlay" onClick={onClose}>
      <div className="UsrModal" onClick={(e) => e.stopPropagation()}>
        <div className="UsrModalHeader">
          <h2 className="UsrModalTitle">Створити нового користувача</h2>
          <button className="UsrModalClose" onClick={onClose}>✕</button>
        </div>
        {error && <div className="UsrErrorNote">{error}</div>}
        <div className="UsrModalBody">
          <div className="UsrFormField">
            <label className="UsrFormLabel">Ім'я користувача *</label>
            <input className="UsrFormInput" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </div>
          <div className="UsrFormField">
            <label className="UsrFormLabel">Email *</label>
            <input className="UsrFormInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="UsrFormField">
            <label className="UsrFormLabel">Пароль *</label>
            <input className="UsrFormInput" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="UsrFormField">
            <label className="UsrFormLabel">Роль</label>
            <select className="UsrFormSelect" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="UsrModalFooter">
          <button className="UsrLinkBtn" onClick={onClose}>Скасувати</button>
          <button className="UsrLinkBtn" onClick={handleSubmit}>Створити</button>
        </div>
      </div>
    </div>
  )
}

const ACTIVE_TAB_LABELS = {
  catalog: "Каталог користувачів",
  queue: "Черга перевірки виконавця",
} as const

type ActiveTab = keyof typeof ACTIVE_TAB_LABELS

const APPLICATION_STATUS_OPTIONS = [
  { value: "Pending", label: "Очікують" },
  { value: "Approved", label: "Схвалені" },
  { value: "Rejected", label: "Відхилені" },
]

const PAGE_SIZE = 12

function formatJoinedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(date)
}

function formatSubmittedDate(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" }
  return {
    date: new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(date) + " UTC",
  }
}

interface UsersSectionProps {
  roleFilterRequest?: { role: string; nonce: number } | null
}

export const UsersSection = ({ roleFilterRequest }: UsersSectionProps = {}): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedQueueUsers, setSelectedQueueUsers] = useState<Set<string>>(new Set())

  // ---- Каталог користувачів ----
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [pageNumber, setPageNumber] = useState(1)

  // Реакция на «показать пользователей роли» из RolesSection: приходит извне через
  // roleFilterRequest.nonce, поэтому синхронный setState здесь осознанный.
  useEffect(() => {
    if (!roleFilterRequest) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoleFilter(roleFilterRequest.role)
    setPageNumber(1)
    setActiveTab("catalog")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilterRequest?.nonce])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPageNumber(1)
    }, 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const {
    data: usersData,
    isFetching: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetAdminUsersQuery({
    search: search || undefined,
    role: roleFilter || undefined,
    pageNumber,
    pageSize: PAGE_SIZE,
  })

  const totalPages = usersData ? Math.max(1, Math.ceil(usersData.totalCount / usersData.pageSize)) : 1

  const handleClearFilters = () => {
    setSearchInput("")
    setSearch("")
    setRoleFilter("")
    setPageNumber(1)
  }

  // ---- Дії над користувачем у каталозі ----
  const [toggleSuspendUser] = useToggleSuspendUserMutation()
  const [resetUserPassword] = useResetUserPasswordMutation()
  const [forceLogoutUser] = useForceLogoutUserMutation()
  const [userActionState, setUserActionState] = useState<{
    id: string
    kind: "suspend" | "reset" | "logout"
    status: "loading" | "error" | "success"
    message?: string
  } | null>(null)

  const handleToggleSuspend = async (userId: string, name: string, isCurrentlySuspended: boolean) => {
    const confirmMsg = isCurrentlySuspended
      ? `Реактивувати користувача ${name}?`
      : `Призупинити користувача ${name}? Він втратить доступ до системи.`
    if (!window.confirm(confirmMsg)) return

    setUserActionState({ id: userId, kind: "suspend", status: "loading" })
    try {
      await toggleSuspendUser(userId).unwrap()
      setUserActionState(null)
    } catch (err: unknown) {
      setUserActionState({
        id: userId,
        kind: "suspend",
        status: "error",
        message: getAdminErrorMessage(err, "Не вдалося змінити статус користувача."),
      })
    }
  }

  const handleResetPassword = async (userId: string, name: string) => {
    if (!window.confirm(`Надіслати ${name} лист для скидання пароля?`)) return

    setUserActionState({ id: userId, kind: "reset", status: "loading" })
    try {
      await resetUserPassword(userId).unwrap()
      setUserActionState({ id: userId, kind: "reset", status: "success", message: "Лист надіслано." })
      window.setTimeout(() => setUserActionState((s) => (s?.id === userId ? null : s)), 3000)
    } catch (err: unknown) {
      setUserActionState({
        id: userId,
        kind: "reset",
        status: "error",
        message: getAdminErrorMessage(err, "Не вдалося надіслати лист."),
      })
    }
  }

  const handleForceLogout = async (userId: string, name: string) => {
    if (!window.confirm(`Завершити всі активні сесії користувача ${name}?`)) return

    setUserActionState({ id: userId, kind: "logout", status: "loading" })
    try {
      await forceLogoutUser(userId).unwrap()
      setUserActionState({ id: userId, kind: "logout", status: "success", message: "Сесії завершено." })
      window.setTimeout(() => setUserActionState((s) => (s?.id === userId ? null : s)), 3000)
    } catch (err: unknown) {
      setUserActionState({
        id: userId,
        kind: "logout",
        status: "error",
        message: getAdminErrorMessage(err, "Не вдалося завершити сесії."),
      })
    }
  }

  // ---- Черга перевірки виконавця ----
  const [statusFilter, setStatusFilter] = useState("Pending")
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const {
    data: queue = [],
    isFetching: queueLoading,
    isError: queueError,
    refetch: refetchQueue,
  } = useGetArtistApplicationsQuery(statusFilter)

  const [approveApplication, { isLoading: isApproving }] = useApproveArtistApplicationMutation()
  const [rejectApplication, { isLoading: isRejecting }] = useRejectArtistApplicationMutation()

  const [bulkApprove] = useBulkApproveApplicationsMutation()
  const [bulkReject] = useBulkRejectApplicationsMutation()

  const [actionErrorFor, setActionErrorFor] = useState<{ id: string; message: string } | null>(null)

  const handleApprove = async (row: AdminArtistApplication) => {
    setActionErrorFor(null)
    try {
      await approveApplication(row.userId).unwrap()
    } catch (err: unknown) {
      setActionErrorFor({ id: row.userId, message: getAdminErrorMessage(err, "Не вдалося схвалити заявку.") })
    }
  }

  const handleReject = async (row: AdminArtistApplication) => {
    setActionErrorFor(null)
    try {
      await rejectApplication(row.userId).unwrap()
    } catch (err: unknown) {
      setActionErrorFor({ id: row.userId, message: getAdminErrorMessage(err, "Не вдалося відхилити заявку.") })
    }
  }

  const handleBulkApprove = async (userIds: string[]) => {
    try {
      await bulkApprove({ userIds }).unwrap()
    } catch { /* handled by RTK Query */ }
  }

  const handleBulkReject = async (userIds: string[]) => {
    try {
      await bulkReject({ userIds }).unwrap()
    } catch { /* handled by RTK Query */ }
  }

  const toggleQueueSelection = (userId: string) => {
    setSelectedQueueUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const totalUsersLabel = usersData ? `${usersData.totalCount.toLocaleString("uk-UA")} загалом` : "—"

  return (
    <div className="AdminUsrSection">
      <span className="UsrGlow UsrGlowTop" />
      <span className="UsrGlow UsrGlowBottom" />

      <div className="UsrPageHeader">
        <div className="UsrHeaderText">
          <h1 className="UsrTitle">Керування каталогом</h1>
          <div className="UsrStatsRow">
            <span className="UsrSubtitle">Глобальні користувачі та підписки</span>
            <span className="UsrTotalBadge">{totalUsersLabel}</span>
          </div>
        </div>

        <div className="UsrTabSwitcher">
          {(Object.keys(ACTIVE_TAB_LABELS) as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`UsrTabBtn${activeTab === tab ? " UsrTabBtnActive" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {ACTIVE_TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "queue" && (
        <div className="UsrQueueHeader">
          <div className="UsrQueueHeaderText">
            <nav className="UsrBreadcrumb">
              <span className="UsrBreadcrumbItem UsrBreadcrumbItemActive">Користувачі</span>
              <span className="UsrBreadcrumbSep" />
              <span className="UsrBreadcrumbItem UsrBreadcrumbItemMuted">Підтвердження виконавця</span>
            </nav>
            <h2 className="UsrQueueTitle">Черга перевірки виконавця</h2>
            <p className="UsrQueueDesc">
              Керуйте перевіркою особи виконавця. Перегляньте дані заявки, щоб надати статус
              перевіреного значка.
            </p>
          </div>

          <div className="UsrQueueStatsCard">
            {selectedQueueUsers.size > 0 && (
              <div className="UsrBulkActionNote">
                Вибрано: {selectedQueueUsers.size}
                <button className="UsrBulkApproveBtn" onClick={() => {
                  handleBulkApprove([...selectedQueueUsers])
                  setSelectedQueueUsers(new Set())
                }}>✅ Затвердити</button>
                <button className="UsrBulkRejectBtn" onClick={() => {
                  handleBulkReject([...selectedQueueUsers])
                  setSelectedQueueUsers(new Set())
                }}>❌ Відхилити</button>
              </div>
            )}
            <div className="UsrQueueStatItem">
              <span className="UsrQueueStatLabel">СТАТУС</span>
              <div className="UsrSelectBox">
                <select
                  className="UsrSelect UsrQueueStatusSelect"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setExpandedRowId(null)
                  }}
                  aria-label="Статус заявок"
                >
                  {APPLICATION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="UsrQueueStatItem UsrQueueStatBordered">
              <span className="UsrQueueStatLabel">КІЛЬКІСТЬ</span>
              <span className="UsrQueueStatValue">{queue.length}</span>
            </div>
            <button type="button" className="UsrBatchBtn" onClick={() => {
              if (selectedQueueUsers.size > 0) {
                handleBulkApprove([...selectedQueueUsers])
                setSelectedQueueUsers(new Set())
              }
            }}>
              <img src={IconLayers} />
              Пакетний огляд
            </button>
          </div>
        </div>
      )}

      {activeTab === "catalog" ? (
        <div className="UsrCatalogLayout">
          <aside className="UsrFiltersAside">
            <div className="UsrFiltersCard">
              <div className="UsrFilterGroup">
                <span className="UsrFilterGroupLabel">ПОШУК</span>
                <input
                  type="text"
                  className="UsrSelect UsrSearchInput"
                  placeholder="Ім'я або email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <div className="UsrFilterGroup UsrFilterGroupBordered">
                <span className="UsrFilterGroupLabel">РОЛЬ</span>
                <input
                  type="text"
                  className="UsrSelect UsrSearchInput"
                  placeholder="напр. Admin, Artist…"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setPageNumber(1)
                  }}
                />
              </div>

              <button type="button" className="UsrClearFiltersBtn" onClick={handleClearFilters}>
                Очистити всі фільтри
              </button>
            </div>

            <div className="UsrTipCard">
              <span className="UsrTipLabel">Порада професіонала</span>
              <p className="UsrTipText">
                Фільтр за роллю шукає точний збіг назви ролі, як вона збережена в базі даних.
              </p>
            </div>
          </aside>

          <div className="UsrCatalogMain">
            <div className="UsrBentoGrid">
              {usersLoading && (
                <div className="UsrEmptyState">Завантаження користувачів…</div>
              )}

              {!usersLoading && usersError && (
                <div className="UsrEmptyState">
                  Не вдалося завантажити користувачів.{" "}
                  <button type="button" className="UsrClearFiltersBtn" onClick={() => refetchUsers()}>
                    Спробувати ще раз
                  </button>
                </div>
              )}

              {!usersLoading && !usersError && usersData?.items.map((user) => {
                const name = user.displayName || user.username
                const actionState = userActionState?.id === user.id ? userActionState : null
                const isBusy = actionState?.status === "loading"
                return (
                <div key={user.id} className={`UsrCard${user.isSuspended ? " UsrCardSuspended" : ""}`}>
                  <span
                    className={`UsrStatusPill${
                      user.isSuspended ? " UsrStatusPillSuspended" : " UsrStatusPillNeutral"
                    }`}
                  >
                    <span className="UsrStatusDot" />
                    {user.isSuspended ? "Призупинено" : user.roles[0] ?? "Без ролі"}
                  </span>

                  <div className="UsrCardHead">
                    {user.avatarUrl ? (
                      <img className="UsrAvatar" src={user.avatarUrl} alt="" />
                    ) : (
                      <span className="UsrAvatar" aria-hidden="true" />
                    )}
                    <div className="UsrCardHeadInfo">
                      <span className="UsrCardName">{name}</span>
                      <span className="UsrCardEmail">{user.email}</span>
                    </div>
                  </div>

                  <div className="UsrCardInfoRow">
                    <div className="UsrCardInfoBox">
                      <span className="UsrCardInfoLabel">Ролі</span>
                      <span className="UsrCardInfoValue">{user.roles.join(", ") || "—"}</span>
                    </div>
                    <div className="UsrCardInfoBox">
                      <span className="UsrCardInfoLabel">Приєднувався</span>
                      <span className="UsrCardInfoValue">{formatJoinedLabel(user.createdAt)}</span>
                    </div>
                  </div>

                  <div className="UsrCardFooter">
                    <div className="UsrCardFooterIcons">
                      <button
                        type="button"
                        className="UsrIconBtn"
                        onClick={() => handleResetPassword(user.id, name)}
                        disabled={isBusy}
                        title="Скинути пароль"
                        aria-label={`Скинути пароль для ${name}`}
                      >
                        <img src={IconEdit} />
                      </button>
                      <button
                        type="button"
                        className="UsrIconBtn"
                        onClick={() => handleForceLogout(user.id, name)}
                        disabled={isBusy}
                        title="Завершити всі сесії"
                        aria-label={`Завершити сесії ${name}`}
                      >
                        <img src={IconMessage} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="UsrSuspendBtn"
                      onClick={() => handleToggleSuspend(user.id, name, user.isSuspended)}
                      disabled={isBusy}
                    >
                      {user.isSuspended ? "Реактивувати" : "Призупинення користувача"}
                    </button>
                  </div>

                  {actionState && (
                    <div className={`UsrCardActionNote${actionState.status === "error" ? " UsrCardActionNoteError" : ""}`}>
                      {actionState.status === "loading" ? "Виконується…" : actionState.message}
                    </div>
                  )}
                </div>
              )})}

              <button
                type="button"
                className="UsrCreateCard"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="UsrCreateIconWrap">
                  <img src={IconUserPlus} />
                </span>
                <span className="UsrCreateTitle">Створити нового користувача</span>
              </button>

              {!usersLoading && !usersError && usersData?.items.length === 0 && (
                <div className="UsrEmptyState">Немає користувачів, що відповідають вибраним фільтрам.</div>
              )}
            </div>

            {usersData && usersData.totalCount > 0 && (
              <div className="UsrQueuePagination UsrCatalogPagination">
                <span className="UsrQueuePaginationSummary">
                  Сторінка {usersData.pageNumber} з {totalPages} · {usersData.totalCount.toLocaleString("uk-UA")} користувачів
                </span>
                <div className="UsrQueuePaginationArrows">
                  <button
                    type="button"
                    className="UsrPageArrow"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    aria-label="Попередня сторінка"
                  >
                    <img src={IconChevronLeft} />
                  </button>
                  <button
                    type="button"
                    className="UsrPageArrow"
                    disabled={pageNumber >= totalPages}
                    onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                    aria-label="Наступна сторінка"
                  >
                    <img src={IconChevronRight} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="UsrQueueTableCard">
          <div className="UsrQueueScroll">
            <div className="UsrQueueHeaderRow">
              <div className="UsrQCell UsrQCellCheckbox"></div>
              <div className="UsrQCell UsrQCellArtist">Виконавець</div>
              <div className="UsrQCell UsrQCellStatus">Жанр</div>
              <div className="UsrQCell UsrQCellFollowers">Платформа</div>
              <div className="UsrQCell UsrQCellDate">Дата подання</div>
              <div className="UsrQCell UsrQCellActions">Дії</div>
            </div>

            <div className="UsrQueueBody">
              {queueLoading && <div className="UsrQueueEmptyRow">Завантаження заявок…</div>}

              {!queueLoading && queueError && (
                <div className="UsrQueueEmptyRow">
                  Не вдалося завантажити заявки.{" "}
                  <button type="button" className="UsrClearFiltersBtn" onClick={() => refetchQueue()}>
                    Спробувати ще раз
                  </button>
                </div>
              )}

              {!queueLoading && !queueError && queue.map((row) => {
                const submitted = formatSubmittedDate(row.submittedAt)
                const isExpanded = expandedRowId === row.userId
                return (
                  <React.Fragment key={row.userId}>
                    <div className="UsrQueueRow">
                      <div className="UsrQCell UsrQCellCheckbox">
                        <input
                          type="checkbox"
                          className="UsrCheckbox"
                          checked={selectedQueueUsers.has(row.userId)}
                          onChange={() => toggleQueueSelection(row.userId)}
                        />
                      </div>
                      <div className="UsrQCell UsrQCellArtist">
                        {row.avatarUrl ? (
                          <img className="UsrAvatar UsrAvatarSm" src={row.avatarUrl} alt="" />
                        ) : (
                          <span className="UsrAvatar UsrAvatarSm" aria-hidden="true" />
                        )}
                        <div className="UsrQArtistInfo">
                          <span className="UsrQArtistName">{row.artistName || row.username}</span>
                          <span className="UsrQArtistEmail">{row.email}</span>
                        </div>
                      </div>

                      <div className="UsrQCell UsrQCellStatus">
                        <span className="UsrQStatusText">{row.genre || "—"}</span>
                      </div>

                      <div className="UsrQCell UsrQCellFollowers">{row.platform || "—"}</div>

                      <div className="UsrQCell UsrQCellDate">
                        <span className="UsrQDateLine">{submitted.date}</span>
                        <span className="UsrQTimeLine">{submitted.time}</span>
                      </div>

                      <div className="UsrQCell UsrQCellActions">
                        <button
                          type="button"
                          className="UsrQActionBtn UsrQActionView"
                          onClick={() => setExpandedRowId(isExpanded ? null : row.userId)}
                          aria-label={`Переглянути заявку ${row.artistName || row.username}`}
                        >
                          <img src={IconEye} />
                        </button>
                        {statusFilter === "Pending" && (
                          <>
                            <button
                              type="button"
                              className="UsrQActionBtn UsrQActionApprove"
                              onClick={() => handleApprove(row)}
                              disabled={isApproving || isRejecting}
                              aria-label={`Підтвердити ${row.artistName || row.username}`}
                            >
                              <img src={IconApprove} />
                            </button>
                            <button
                              type="button"
                              className="UsrQActionBtn UsrQActionReject"
                              onClick={() => handleReject(row)}
                              disabled={isApproving || isRejecting}
                              aria-label={`Відхилити ${row.artistName || row.username}`}
                            >
                              <img src={IconReject} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="UsrQueueDetailRow">
                        <span><strong>Країна:</strong> {row.country || "—"}</span>
                        <span><strong>Статус заявки:</strong> {row.status}</span>
                        <span><strong>Email:</strong> {row.email}</span>
                      </div>
                    )}

                    {actionErrorFor?.id === row.userId && (
                      <div className="UsrQueueDetailRow UsrQueueDetailRowError">{actionErrorFor.message}</div>
                    )}
                  </React.Fragment>
                )
              })}

              {!queueLoading && !queueError && queue.length === 0 && (
                <div className="UsrQueueEmptyRow">Черга верифікації порожня.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}