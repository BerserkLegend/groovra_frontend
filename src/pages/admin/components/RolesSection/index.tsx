import React, { useState } from "react"
import "./style.css"
import IconPlus from "./Plus.svg"
import { getAdminErrorMessage } from "../../adminError"

import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useGetRoleCapabilitiesQuery,
  useGetAdminUsersQuery,
  useAddUserToRoleMutation,
  type AdminRole,
} from "../../../../store/api/adminApi"

const MEMBER_WORD = (count: number): string => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return "Людей"
  if (mod10 === 1) return "Людина"
  if (mod10 >= 2 && mod10 <= 4) return "Людини"
  return "Людей"
}

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => (
  <div className="RolModalOverlay" onClick={onClose}>
    <div className="RolModal" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
)

interface RolesSectionProps {
  onViewRoleUsers?: (roleName: string) => void
}

export const RolesSection = ({ onViewRoleUsers }: RolesSectionProps): React.JSX.Element => {
  const { data: roles = [], isFetching, isError, refetch } = useGetRolesQuery()
  const [viewRole, setViewRole] = useState<AdminRole | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [addUserToRole, setShowAddUserModal] = useState<{ show: boolean; roleId: string; roleName: string }>({ 
    show: false, 
    roleId: "", 
    roleName: "" 
  })
  const [userIdToAssign, setUserIdToAssign] = useState("")
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDesc, setNewRoleDesc] = useState("")
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation()
  const [addUser, { isLoading: isAssigning }] = useAddUserToRoleMutation()
  // FIX: Hook must always be called, use skip option
  const { data: capabilitiesData, isLoading: isCapabilitiesLoading } = useGetRoleCapabilitiesQuery(
    viewRole?.id ?? "00000000-0000-0000-0000-000000000000",
    { skip: !viewRole }
  )

  // Get users for add user modal
  const { data: usersResponse } = useGetAdminUsersQuery(
    { pageNumber: 1, pageSize: 100 },
    { skip: !addUserToRole.show }
  )
  const users = usersResponse?.items ?? []

  const leftColumnRoles = roles.filter((_, i) => i % 2 === 0)
  const rightColumnRoles = roles.filter((_, i) => i % 2 === 1)

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    try {
      await createRole({ name: newRoleName.trim(), description: newRoleDesc.trim() }).unwrap()
      setActionStatus({ type: "success", message: "Роль створено!" })
      setNewRoleName("")
      setNewRoleDesc("")
      setShowCreateModal(false)
      setTimeout(() => setActionStatus(null), 3000)
      refetch()
    } catch (err: unknown) {
      setActionStatus({ type: "error", message: getAdminErrorMessage(err) })
    }
  }

  const handleAddUserToRole = async () => {
    if (!userIdToAssign || !addUserToRole.roleId) return
    try {
      await addUser({ roleId: addUserToRole.roleId, userId: userIdToAssign }).unwrap()
      setActionStatus({ type: "success", message: "Користувача додано до ролі!" })
      setShowAddUserModal({ show: false, roleId: "", roleName: "" })
      setUserIdToAssign("")
      refetch()
      setTimeout(() => setActionStatus(null), 3000)
    } catch (err: unknown) {
      setActionStatus({ type: "error", message: getAdminErrorMessage(err) })
    }
  }

  const renderRoleCard = (role: AdminRole) => (
    <div key={role.id} className="RolCard">
      <div className="RolCardTopRow">
        <h3 className="RolCardTitle">{role.name}</h3>
        <span className="RolMemberBadge">{role.memberCount} {MEMBER_WORD(role.memberCount)}</span>
      </div>
      <p className="RolCardDesc">{role.description}</p>
      <div className="RolCardLinks">
        <button type="button" className="RolLinkBtn" onClick={() => onViewRoleUsers?.(role.name)} disabled={!onViewRoleUsers}>
          Дивитися користувачів
        </button>
        <button 
          type="button" 
          className="RolLinkBtn" 
          onClick={() => {
            setShowAddUserModal({ show: true, roleId: role.id, roleName: role.name })
            setViewRole(null) // Close capabilities modal if open
          }}
        >
          Додати учасника
        </button>
      </div>
    </div>
  )

  return (
    <div className="AdminRolSection">
      <span className="RolGlow RolGlowTop" />
      <span className="RolGlow RolGlowBottom" />
      <div className="RolPageHeader">
        <div className="RolHeaderText">
          <h1 className="RolTitle">Ролі та дозволи</h1>
          <p className="RolSubtitle">Керуйте ролями та їх можливостями</p>
        </div>
        <button type="button" className="RolManageBtn" onClick={() => setShowCreateModal(true)}>
          Керувати ролями
        </button>
      </div>

      {actionStatus && (
        <div className={`RolActionNote RolActionNote${actionStatus.type === "success" ? "Success" : "Error"}`}>
          {actionStatus.message}
        </div>
      )}

      {isFetching && <p className="RolSubtitle">Завантаження ролей…</p>}
      {!isFetching && isError && (
        <p className="RolSubtitle">
          Не вдалося завантажити ролі{" "}
          <button type="button" className="RolLinkBtn" onClick={() => refetch()}>Спробувати ще раз</button>
        </p>
      )}

      {!isFetching && !isError && (
        <div className="RolGrid">
          <div className="RolColumn">{leftColumnRoles.map(renderRoleCard)}</div>
          <div className="RolColumn">
            {rightColumnRoles.map(renderRoleCard)}
            <button type="button" className="RolCreateCard" onClick={() => setShowCreateModal(true)}>
              <span className="RolCreateIconWrap"><img src={IconPlus} /></span>
              <span className="RolCreateTitle">Створити нову роль</span>
            </button>
            <button
              type="button"
              className="RolCapabilitiesCard"
              onClick={() => {
                if (roles.length > 0) setViewRole(roles[0])
              }}
            >
              Переглянути можливості
            </button>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <div className="RolModalHeader">
            <h2 className="RolModalTitle">Створити нову роль</h2>
            <button className="RolModalClose" onClick={() => setShowCreateModal(false)}>✕</button>
          </div>
          <div className="RolModalBody">
            <div className="RolFormField">
              <label className="RolFormLabel">Назва ролі *</label>
              <input
                className="RolFormInput"
                placeholder="напр. Moderator"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="RolFormField">
              <label className="RolFormLabel">Опис</label>
              <textarea
                className="RolFormTextarea"
                placeholder="Короткий опис ролі…"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="RolModalFooter">
            <button className="RolLinkBtn" onClick={() => setShowCreateModal(false)}>Скасувати</button>
            <button className="RolLinkBtn" onClick={handleCreateRole} disabled={isCreating || !newRoleName.trim()}>
              {isCreating ? "Створення…" : "Створити"}
            </button>
          </div>
        </Modal>
      )}

      {/* Add User to Role Modal */}
      {addUserToRole.show && (
        <Modal onClose={() => {
          setShowAddUserModal({ show: false, roleId: "", roleName: "" })
          setUserIdToAssign("")
        }}>
          <div className="RolModalHeader">
            <h2 className="RolModalTitle">Додати учасника — {addUserToRole.roleName}</h2>
            <button className="RolModalClose" onClick={() => {
              setShowAddUserModal({ show: false, roleId: "", roleName: "" })
              setUserIdToAssign("")
            }}>✕</button>
          </div>
          <div className="RolModalBody">
            {!users.length && isFetching && <p>Завантаження користувачів…</p>}
            {!users.length && !isFetching && <p>Немає доступних користувачів</p>}
            <div className="RolUserList">
              {users.map((user) => (
                <label key={user.id} className="RolUserItem">
                  <input
                    type="radio"
                    name="assignUser"
                    value={user.id}
                    checked={userIdToAssign === user.id}
                    onChange={(e) => setUserIdToAssign(e.target.value)}
                  />
                  <div className="RolUserInfo">
                    <span className="RolUserName">{user.username || user.displayName}</span>
                    <span className="RolUserEmail">{user.email}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="RolModalFooter">
            <button className="RolLinkBtn" onClick={() => {
              setShowAddUserModal({ show: false, roleId: "", roleName: "" })
              setUserIdToAssign("")
            }}>Скасувати</button>
            <button 
              className="RolLinkBtn" 
              onClick={handleAddUserToRole} 
              disabled={isAssigning || !userIdToAssign}
            >
              {isAssigning ? "Додавання…" : "Додати"}
            </button>
          </div>
        </Modal>
      )}

      {/* Capabilities Modal */}
      {viewRole && (
        <Modal onClose={() => {
          setViewRole(null)
          setShowAddUserModal({ show: false, roleId: "", roleName: "" })
        }}>
          <div className="RolModalHeader">
            <h2 className="RolModalTitle">{viewRole.name} — Можливості</h2>
            <button className="RolModalClose" onClick={() => setViewRole(null)}>✕</button>
          </div>
          <div className="RolModalBody">
            {isCapabilitiesLoading && <p>Завантаження…</p>}
            {capabilitiesData && (
              <div className="RolCapabilitiesGrid">
                {capabilitiesData.permissions.map((cap, i) => (
                  <div key={i} className="RolCapabilityRow">
                    <span className="RolCapabilityFeature">{cap.feature}</span>
                    <div className="RolCapabilityActions">
                      <span className={cap.canView ? "RolYes" : "RolNo"}>{cap.canView ? "Так" : "Ні"}</span>
                      <span className={cap.canEdit ? "RolYes" : "RolNo"}>{cap.canEdit ? "Так" : "Ні"}</span>
                      <span className={cap.canDelete ? "RolYes" : "RolNo"}>{cap.canDelete ? "Так" : "Ні"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {actionStatus && (
        <div className="RolActionNote RolActionNoteError">{actionStatus.message}</div>
      )}
    </div>
  )
}
