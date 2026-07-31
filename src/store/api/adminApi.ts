import { baseApi } from './baseApi'

export interface AdminUserListItem {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl: string
  roles: string[]
  createdAt: string
  isSuspended: boolean
}

export interface AdminUsersResponse {
  items: AdminUserListItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface AdminRole {
  id: string
  name: string
  description: string
  memberCount: number
}

export interface AdminArtistApplication {
  userId: string
  username: string
  email: string
  avatarUrl: string
  artistName: string
  genre: string
  country: string
  platform: string
  status: string
  submittedAt: string | null
}

export interface GetUsersParams {
  search?: string
  role?: string
  pageNumber?: number
  pageSize?: number
}

export interface CreateUserPayload {
  username: string
  email: string
  password: string
  role?: string
}

export interface CreateRolePayload {
  name: string
  description?: string
}

export interface BulkActionPayload {
  userIds: string[]
}

export interface RoleCapabilitiesResponse {
  name: string
  description: string
  permissions: Array<{
    feature: string
    canView: boolean
    canEdit: boolean
    canDelete: boolean
  }>
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<AdminRole[], void>({
      query: () => ({ url: '/admin/roles' }),
      providesTags: (result) =>
        result
          ? [
            ...result.map((r) => ({ type: 'AdminRole' as const, id: r.id })),
            { type: 'AdminRole' as const, id: 'LIST' },
          ]
        : [{ type: 'AdminRole' as const, id: 'LIST' }],
    }),
    getAdminUsers: builder.query<AdminUsersResponse, GetUsersParams | void>({
      query: (params) => ({
        url: '/admin/users',
        params: params ?? undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((u) => ({ type: 'AdminUser' as const, id: u.id })),
              { type: 'AdminUser' as const, id: 'LIST' },
            ]
          : [{ type: 'AdminUser' as const, id: 'LIST' }],
    }),

    getArtistApplications: builder.query<AdminArtistApplication[], string | void>({
      query: (status = 'Pending') => ({
        url: '/admin/artist-applications',
        params: { status },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((a) => ({ type: 'ArtistApplication' as const, id: a.userId })),
              { type: 'ArtistApplication' as const, id: 'LIST' },
            ]
          : [{ type: 'ArtistApplication' as const, id: 'LIST' }],
    }),

    approveArtistApplication: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/artist-applications/${userId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['ArtistApplication', 'AdminUser'],
    }),

    rejectArtistApplication: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/artist-applications/${userId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['ArtistApplication'],
    }),
    toggleSuspendUser: builder.mutation<{ isSuspended: boolean }, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, userId) => [{ type: 'AdminUser', id: userId }, { type: 'AdminUser', id: 'LIST' }],
    }),
 
    resetUserPassword: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/reset-password`,
        method: 'POST',
      }),
    }),
 
    forceLogoutUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/force-logout`,
        method: 'POST',
      }),
    }),

    // ====== CREATE USER ======
    createUser: builder.mutation<{ message: string; userId: string }, CreateUserPayload>({
      query: (body) => ({
        url: '/admin/users',
        method: 'POST',
        body: { username: body.username, email: body.email, password: body.password, role: body.role },
      }),
      invalidatesTags: ['AdminUser', 'LIST'],
    }),

    // ====== BULK APPROVE ARTIST APPLICATIONS ======
    bulkApproveApplications: builder.mutation<{ message: string }, BulkActionPayload>({
      query: (body) => ({
        url: '/admin/artist-applications/bulk-approve',
        method: 'POST',
        body: { userIds: body.userIds },
      }),
      invalidatesTags: ['ArtistApplication', 'LIST'],
    }),

    // ====== BULK REJECT ARTIST APPLICATIONS ======
    bulkRejectApplications: builder.mutation<{ message: string }, BulkActionPayload>({
      query: (body) => ({
        url: '/admin/artist-applications/bulk-reject',
        method: 'POST',
        body: { userIds: body.userIds },
      }),
      invalidatesTags: ['ArtistApplication', 'LIST'],
    }),

    // ====== CREATE ROLE ======
    createRole: builder.mutation<{ message: string; roleId: string }, CreateRolePayload>({
      query: (body) => ({
        url: '/admin/roles',
        method: 'POST',
        body: { name: body.name, description: body.description },
      }),
      invalidatesTags: ['AdminRole', 'LIST'],
    }),

    // ====== DELETE ROLE ======
    deleteRole: builder.mutation<{ message: string }, string>({
      query: (roleId) => ({
        url: `/admin/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminRole', 'LIST'],
    }),

    // ====== ADD USER TO ROLE ======
    addUserToRole: builder.mutation<{ message: string }, { roleId: string; userId: string }>({
      query: ({ roleId, userId }) => ({
        url: `/admin/roles/${roleId}/users/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['AdminUser', 'AdminRole', 'LIST'],
    }),

    // ====== GET ROLE CAPABILITIES ======
    getRoleCapabilities: builder.query<RoleCapabilitiesResponse, string>({
      query: (roleId) => `/admin/roles/${roleId}/capabilities`,
      providesTags: (_result, _error, roleId) => [{ type: 'AdminRole' as const, id: `capabilities-${roleId}` }],
    }),

  }),
})

export const {
  useGetRolesQuery,
  useGetAdminUsersQuery,
  useGetArtistApplicationsQuery,
  useApproveArtistApplicationMutation,
  useRejectArtistApplicationMutation,
  useToggleSuspendUserMutation,
  useResetUserPasswordMutation,
  useForceLogoutUserMutation,
  // NEW
  useCreateUserMutation,
  useBulkApproveApplicationsMutation,
  useBulkRejectApplicationsMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useAddUserToRoleMutation,
  useGetRoleCapabilitiesQuery,
} = adminApi