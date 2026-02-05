import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  FieldpermissionsService,
  FieldsecurityprofilesService,
  RolesService,
  SystemuserprofilescollectionService,
  SystemuserrolescollectionService,
  SystemusersService,
  TeammembershipsService,
  TeamprofilescollectionService,
  TeamrolescollectionService,
  TeamsService,
} from './generated'
import type { Fieldpermissions } from './generated/models/FieldpermissionsModel'
import type { Fieldsecurityprofiles } from './generated/models/FieldsecurityprofilesModel'
import type { Roles } from './generated/models/RolesModel'
import type { Systemuserprofilescollection } from './generated/models/SystemuserprofilescollectionModel'
import type { Systemuserrolescollection } from './generated/models/SystemuserrolescollectionModel'
import type { Systemusers } from './generated/models/SystemusersModel'
import type { Teammemberships } from './generated/models/TeammembershipsModel'
import type { Teamprofilescollection } from './generated/models/TeamprofilescollectionModel'
import type { Teamrolescollection } from './generated/models/TeamrolescollectionModel'
import type { Teams } from './generated/models/TeamsModel'

const PAGE_SIZE = 25
const RELATIONSHIP_PAGE_SIZE = 200

type LabeledRole = {
  id: string
  name: string
  description?: string
  source: 'direct' | 'team'
  teamName?: string
}

type LabeledUser = {
  id: string
  name: string
  email?: string
  source: 'direct' | 'team'
  teamName?: string
}

type TeamSummary = {
  id: string
  name: string
  teamType?: string
  admin?: string
}

type FieldPermissionSummary = {
  id: string
  entity: string
  attribute: string
  read?: string
  update?: string
  create?: string
  unmasked?: string
}

type UserDetail = {
  teams: TeamSummary[]
  roles: LabeledRole[]
}

type RoleDetail = {
  teams: TeamSummary[]
  users: LabeledUser[]
}

type ProfileMemberships = {
  users: LabeledUser[]
  teams: TeamSummary[]
}

const describeError = (error: unknown) => {
  if (!error) return 'Unknown error.'
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error.'
  }
}

const teamTypeLabel = (value?: string) => {
  switch (String(value ?? '')) {
    case '0':
      return 'Owner'
    case '1':
      return 'Access'
    case '2':
      return 'Security Group'
    case '3':
      return 'Office Group'
    default:
      return 'Unknown'
  }
}

const permissionLabel = (value?: string) => {
  switch (String(value ?? '')) {
    case '0':
      return 'Not allowed'
    case '4':
      return 'Allowed'
    default:
      return 'Unknown'
  }
}

const readUnmaskedLabel = (value?: string) => {
  switch (String(value ?? '')) {
    case '0':
      return 'Not allowed'
    case '1':
      return 'One record'
    case '3':
      return 'All records'
    default:
      return 'Unknown'
  }
}

const buildOrFilter = (field: string, ids: string[]) =>
  ids.length === 0 ? '' : ids.map((id) => `${field} eq ${id}`).join(' or ')

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function App() {
  const [users, setUsers] = useState<Systemusers[]>([])
  const [usersSkipToken, setUsersSkipToken] = useState<string | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersHasMore, setUsersHasMore] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Teams[]>([])
  const [teamsSkipToken, setTeamsSkipToken] = useState<string | null>(null)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsHasMore, setTeamsHasMore] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  const [roles, setRoles] = useState<Roles[]>([])
  const [rolesSkipToken, setRolesSkipToken] = useState<string | null>(null)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesHasMore, setRolesHasMore] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const [profiles, setProfiles] = useState<Fieldsecurityprofiles[]>([])
  const [profilesSkipToken, setProfilesSkipToken] = useState<string | null>(null)
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profilesHasMore, setProfilesHasMore] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState<string | null>(null)

  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null)
  const [roleDetailLoading, setRoleDetailLoading] = useState(false)
  const [roleDetailError, setRoleDetailError] = useState<string | null>(null)

  const [profilePermissions, setProfilePermissions] = useState<FieldPermissionSummary[]>([])
  const [profilePermissionsLoading, setProfilePermissionsLoading] = useState(false)
  const [profilePermissionsError, setProfilePermissionsError] = useState<string | null>(null)

  const [profileMemberships, setProfileMemberships] = useState<ProfileMemberships | null>(null)
  const [profileMembershipsLoading, setProfileMembershipsLoading] = useState(false)
  const [profileMembershipsError, setProfileMembershipsError] = useState<string | null>(null)

  const selectedUser = useMemo(
    () => users.find((user) => user.systemuserid === selectedUserId) ?? null,
    [users, selectedUserId]
  )
  const selectedTeam = useMemo(
    () => teams.find((team) => team.teamid === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  )
  const selectedRole = useMemo(
    () => roles.find((role) => role.roleid === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.fieldsecurityprofileid === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const loadUsersPage = async (mode: 'reset' | 'more' = 'reset') => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const skipToken = mode === 'more' ? usersSkipToken ?? undefined : undefined
      const result = await SystemusersService.getAll({
        select: ['systemuserid', 'fullname', 'internalemailaddress'],
        top: PAGE_SIZE,
        skipToken,
      })

      if (!result.success) {
        throw new Error(`Unable to load users. ${describeError(result.error)}`)
      }

      setUsers((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
      setUsersSkipToken(result.skipToken ?? null)
      setUsersHasMore(Boolean(result.skipToken))
    } catch (error) {
      console.error('[Users] Load failed', error)
      setUsersError(describeError(error))
    } finally {
      setUsersLoading(false)
    }
  }

  const loadTeamsPage = async (mode: 'reset' | 'more' = 'reset') => {
    setTeamsLoading(true)
    setTeamsError(null)
    try {
      const skipToken = mode === 'more' ? teamsSkipToken ?? undefined : undefined
      const result = await TeamsService.getAll({
        select: ['teamid', 'name', 'teamtype'],
        top: PAGE_SIZE,
        skipToken,
      })

      if (!result.success) {
        throw new Error(`Unable to load teams. ${describeError(result.error)}`)
      }

      setTeams((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
      setTeamsSkipToken(result.skipToken ?? null)
      setTeamsHasMore(Boolean(result.skipToken))
    } catch (error) {
      console.error('[Teams] Load failed', error)
      setTeamsError(describeError(error))
    } finally {
      setTeamsLoading(false)
    }
  }

  const loadRolesPage = async (mode: 'reset' | 'more' = 'reset') => {
    setRolesLoading(true)
    setRolesError(null)
    try {
      const skipToken = mode === 'more' ? rolesSkipToken ?? undefined : undefined
      const result = await RolesService.getAll({
        select: ['roleid', 'name', 'description'],
        top: PAGE_SIZE,
        skipToken,
      })

      if (!result.success) {
        throw new Error(`Unable to load roles. ${describeError(result.error)}`)
      }

      setRoles((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
      setRolesSkipToken(result.skipToken ?? null)
      setRolesHasMore(Boolean(result.skipToken))
    } catch (error) {
      console.error('[Roles] Load failed', error)
      setRolesError(describeError(error))
    } finally {
      setRolesLoading(false)
    }
  }

  const loadProfilesPage = async (mode: 'reset' | 'more' = 'reset') => {
    setProfilesLoading(true)
    setProfilesError(null)
    try {
      const skipToken = mode === 'more' ? profilesSkipToken ?? undefined : undefined
      const result = await FieldsecurityprofilesService.getAll({
        select: ['fieldsecurityprofileid', 'name', 'description'],
        top: PAGE_SIZE,
        skipToken,
      })

      if (!result.success) {
        throw new Error(
          `Unable to load field security profiles. ${describeError(result.error)}`
        )
      }

      setProfiles((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
      setProfilesSkipToken(result.skipToken ?? null)
      setProfilesHasMore(Boolean(result.skipToken))
    } catch (error) {
      console.error('[Profiles] Load failed', error)
      setProfilesError(describeError(error))
    } finally {
      setProfilesLoading(false)
    }
  }

  const fetchRolesByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Roles[]
    const filter = buildOrFilter('roleid', ids)
    const result = await RolesService.getAll({
      select: ['roleid', 'name', 'description'],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load roles. ${describeError(result.error)}`)
    }
    return result.data
  }

  const fetchTeamsByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Teams[]
    const filter = buildOrFilter('teamid', ids)
    const result = await TeamsService.getAll({
      select: ['teamid', 'name', 'teamtype'],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load teams. ${describeError(result.error)}`)
    }
    return result.data
  }

  const fetchUsersByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Systemusers[]
    const filter = buildOrFilter('systemuserid', ids)
    const result = await SystemusersService.getAll({
      select: ['systemuserid', 'fullname', 'internalemailaddress'],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load users. ${describeError(result.error)}`)
    }
    return result.data
  }

  useEffect(() => {
    void loadUsersPage()
    void loadTeamsPage()
    void loadRolesPage()
    void loadProfilesPage()
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setUserDetail(null)
      setUserDetailError(null)
      return
    }

    let isActive = true
    const loadUserDetail = async () => {
      setUserDetailLoading(true)
      setUserDetailError(null)
      try {
        const [userRolesResult, teamMembershipsResult] = await Promise.all([
          SystemuserrolescollectionService.getAll({
            select: ['roleid', 'systemuserid'],
            filter: `systemuserid eq ${selectedUserId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
          TeammembershipsService.getAll({
            select: ['teamid', 'systemuserid'],
            filter: `systemuserid eq ${selectedUserId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
        ])

        if (!userRolesResult.success) {
          throw new Error(`Unable to load user roles. ${describeError(userRolesResult.error)}`)
        }
        if (!teamMembershipsResult.success) {
          throw new Error(
            `Unable to load team memberships. ${describeError(teamMembershipsResult.error)}`
          )
        }

        const userRoleLinks = userRolesResult.data as Systemuserrolescollection[]
        const memberships = teamMembershipsResult.data as Teammemberships[]
        const teamIds = memberships.map((membership) => membership.teamid)

        const teamRolesResult = teamIds.length
          ? await TeamrolescollectionService.getAll({
              select: ['roleid', 'teamid'],
              filter: buildOrFilter('teamid', teamIds),
              top: RELATIONSHIP_PAGE_SIZE,
            })
          : { success: true, data: [] as Teamrolescollection[] }

        if (!teamRolesResult.success) {
          throw new Error(`Unable to load team roles. ${describeError(teamRolesResult.error)}`)
        }

        const teamRoleLinks = teamRolesResult.data as Teamrolescollection[]

        const [directRoles, teams] = await Promise.all([
          fetchRolesByIds(uniqueById(userRoleLinks.map((link) => ({ id: link.roleid }))).map((i) => i.id)),
          fetchTeamsByIds(uniqueById(teamIds.map((id) => ({ id }))).map((i) => i.id)),
        ])

        const teamRoles = await fetchRolesByIds(
          uniqueById(teamRoleLinks.map((link) => ({ id: link.roleid }))).map((i) => i.id)
        )

        const teamNameById = new Map<string, string>(
          teams.map((team) => [team.teamid, team.name ?? 'Unnamed team'])
        )

        const roleNameById = new Map<string, Roles>(
          [...directRoles, ...teamRoles].map((role) => [role.roleid, role])
        )

        const labeledDirectRoles: LabeledRole[] = userRoleLinks.map((link) => {
          const role = roleNameById.get(link.roleid)
          return {
            id: link.roleid,
            name: role?.name ?? 'Unnamed role',
            description: role?.description ?? '',
            source: 'direct',
          }
        })

        const labeledTeamRoles: LabeledRole[] = teamRoleLinks.map((link) => {
          const role = roleNameById.get(link.roleid)
          return {
            id: link.roleid,
            name: role?.name ?? 'Unnamed role',
            description: role?.description ?? '',
            source: 'team',
            teamName: teamNameById.get(link.teamid),
          }
        })

        const teamSummaries: TeamSummary[] = teams.map((team) => ({
          id: team.teamid,
          name: team.name ?? 'Unnamed team',
          teamType: teamTypeLabel(String(team.teamtype ?? '')),
          admin: '',
        }))

        if (!isActive) return
        setUserDetail({
          teams: teamSummaries,
          roles: [...labeledDirectRoles, ...labeledTeamRoles],
        })
      } catch (error) {
        console.error('[User Detail] Load failed', error)
        if (!isActive) return
        setUserDetailError(describeError(error))
      } finally {
        if (isActive) setUserDetailLoading(false)
      }
    }

    void loadUserDetail()

    return () => {
      isActive = false
    }
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedRoleId) {
      setRoleDetail(null)
      setRoleDetailError(null)
      return
    }

    let isActive = true
    const loadRoleDetail = async () => {
      setRoleDetailLoading(true)
      setRoleDetailError(null)
      try {
        const [directUsersResult, teamsResult] = await Promise.all([
          SystemuserrolescollectionService.getAll({
            select: ['roleid', 'systemuserid'],
            filter: `roleid eq ${selectedRoleId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
          TeamrolescollectionService.getAll({
            select: ['roleid', 'teamid'],
            filter: `roleid eq ${selectedRoleId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
        ])

        if (!directUsersResult.success) {
          throw new Error(
            `Unable to load role users. ${describeError(directUsersResult.error)}`
          )
        }
        if (!teamsResult.success) {
          throw new Error(`Unable to load role teams. ${describeError(teamsResult.error)}`)
        }

        const directUserLinks = directUsersResult.data as Systemuserrolescollection[]
        const teamRoleLinks = teamsResult.data as Teamrolescollection[]
        const teamIds = teamRoleLinks.map((link) => link.teamid)

        const teamMembershipsResult = teamIds.length
          ? await TeammembershipsService.getAll({
              select: ['teamid', 'systemuserid'],
              filter: buildOrFilter('teamid', teamIds),
              top: RELATIONSHIP_PAGE_SIZE,
            })
          : { success: true, data: [] as Teammemberships[] }

        if (!teamMembershipsResult.success) {
          throw new Error(
            `Unable to load team memberships. ${describeError(teamMembershipsResult.error)}`
          )
        }

        const teamMemberships = teamMembershipsResult.data as Teammemberships[]
        const directUserIds = directUserLinks.map((link) => link.systemuserid)
        const inheritedUserIds = teamMemberships.map((membership) => membership.systemuserid)
        const users = await fetchUsersByIds(uniqueById([...directUserIds, ...inheritedUserIds].map((id) => ({ id }))).map((i) => i.id))
        const teams = await fetchTeamsByIds(uniqueById(teamIds.map((id) => ({ id }))).map((i) => i.id))

        const userById = new Map<string, Systemusers>(users.map((user) => [user.systemuserid, user]))
        const teamNameById = new Map<string, string>(
          teams.map((team) => [team.teamid, team.name ?? 'Unnamed team'])
        )

        const labeledDirectUsers: LabeledUser[] = directUserLinks.map((link) => {
          const user = userById.get(link.systemuserid)
          return {
            id: link.systemuserid,
            name: user?.fullname ?? 'Unnamed user',
            email: user?.internalemailaddress ?? '',
            source: 'direct',
          }
        })

        const labeledTeamUsers: LabeledUser[] = teamMemberships.map((membership) => {
          const user = userById.get(membership.systemuserid)
          return {
            id: membership.systemuserid,
            name: user?.fullname ?? 'Unnamed user',
            email: user?.internalemailaddress ?? '',
            source: 'team',
            teamName: teamNameById.get(membership.teamid),
          }
        })

        const teamSummaries: TeamSummary[] = teams.map((team) => ({
          id: team.teamid,
          name: team.name ?? 'Unnamed team',
          teamType: teamTypeLabel(String(team.teamtype ?? '')),
          admin: '',
        }))

        if (!isActive) return
        setRoleDetail({
          teams: teamSummaries,
          users: [...labeledDirectUsers, ...labeledTeamUsers],
        })
      } catch (error) {
        console.error('[Role Detail] Load failed', error)
        if (!isActive) return
        setRoleDetailError(describeError(error))
      } finally {
        if (isActive) setRoleDetailLoading(false)
      }
    }

    void loadRoleDetail()

    return () => {
      isActive = false
    }
  }, [selectedRoleId])

  useEffect(() => {
    if (!selectedProfileId) {
      setProfilePermissions([])
      setProfilePermissionsError(null)
      return
    }

    let isActive = true
    const loadProfilePermissions = async () => {
      setProfilePermissionsLoading(true)
      setProfilePermissionsError(null)
      try {
        const result = await FieldpermissionsService.getAll({
          select: [
            'fieldpermissionid',
            'entityname',
            'attributelogicalname',
            'canread',
            'canupdate',
            'cancreate',
            'canreadunmasked',
            'fieldsecurityprofileid',
          ],
          filter: `fieldsecurityprofileid eq ${selectedProfileId}`,
          top: RELATIONSHIP_PAGE_SIZE,
        })

        if (!result.success) {
          throw new Error(
            `Unable to load field permissions. ${describeError(result.error)}`
          )
        }

        const permissions = result.data as Fieldpermissions[]
        const mapped: FieldPermissionSummary[] = permissions.map((permission) => ({
          id: permission.fieldpermissionid,
          entity: permission.entityname,
          attribute: permission.attributelogicalname,
          read: permissionLabel(String(permission.canread ?? '')),
          update: permissionLabel(String(permission.canupdate ?? '')),
          create: permissionLabel(String(permission.cancreate ?? '')),
          unmasked: readUnmaskedLabel(String(permission.canreadunmasked ?? '')),
        }))

        if (!isActive) return
        setProfilePermissions(mapped)
      } catch (error) {
        console.error('[Profile Permissions] Load failed', error)
        if (!isActive) return
        setProfilePermissionsError(describeError(error))
      } finally {
        if (isActive) setProfilePermissionsLoading(false)
      }
    }

    void loadProfilePermissions()

    return () => {
      isActive = false
    }
  }, [selectedProfileId])

  useEffect(() => {
    if (!selectedProfileId) {
      setProfileMemberships(null)
      setProfileMembershipsError(null)
      return
    }

    let isActive = true
    const loadProfileMemberships = async () => {
      setProfileMembershipsLoading(true)
      setProfileMembershipsError(null)
      try {
        const [userProfilesResult, teamProfilesResult] = await Promise.all([
          SystemuserprofilescollectionService.getAll({
            select: ['systemuserid', 'fieldsecurityprofileid'],
            filter: `fieldsecurityprofileid eq ${selectedProfileId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
          TeamprofilescollectionService.getAll({
            select: ['teamid', 'fieldsecurityprofileid'],
            filter: `fieldsecurityprofileid eq ${selectedProfileId}`,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
        ])

        if (!userProfilesResult.success) {
          throw new Error(
            `Unable to load profile users. ${describeError(userProfilesResult.error)}`
          )
        }
        if (!teamProfilesResult.success) {
          throw new Error(
            `Unable to load profile teams. ${describeError(teamProfilesResult.error)}`
          )
        }

        const userProfileLinks = userProfilesResult.data as Systemuserprofilescollection[]
        const teamProfileLinks = teamProfilesResult.data as Teamprofilescollection[]
        const directUserIds = userProfileLinks.map((link) => link.systemuserid)
        const teamIds = teamProfileLinks.map((link) => link.teamid)

        const teamMembershipsResult = teamIds.length
          ? await TeammembershipsService.getAll({
              select: ['teamid', 'systemuserid'],
              filter: buildOrFilter('teamid', teamIds),
              top: RELATIONSHIP_PAGE_SIZE,
            })
          : { success: true, data: [] as Teammemberships[] }

        if (!teamMembershipsResult.success) {
          throw new Error(
            `Unable to load team memberships. ${describeError(teamMembershipsResult.error)}`
          )
        }

        const teamMemberships = teamMembershipsResult.data as Teammemberships[]
        const inheritedUserIds = teamMemberships.map((membership) => membership.systemuserid)

        const [users, teams] = await Promise.all([
          fetchUsersByIds(
            uniqueById([...directUserIds, ...inheritedUserIds].map((id) => ({ id }))).map((i) => i.id)
          ),
          fetchTeamsByIds(uniqueById(teamIds.map((id) => ({ id }))).map((i) => i.id)),
        ])

        const userById = new Map<string, Systemusers>(users.map((user) => [user.systemuserid, user]))
        const teamNameById = new Map<string, string>(
          teams.map((team) => [team.teamid, team.name ?? 'Unnamed team'])
        )

        const labeledDirectUsers: LabeledUser[] = directUserIds.map((userId) => {
          const user = userById.get(userId)
          return {
            id: userId,
            name: user?.fullname ?? 'Unnamed user',
            email: user?.internalemailaddress ?? '',
            source: 'direct',
          }
        })

        const labeledTeamUsers: LabeledUser[] = teamMemberships.map((membership) => {
          const user = userById.get(membership.systemuserid)
          return {
            id: membership.systemuserid,
            name: user?.fullname ?? 'Unnamed user',
            email: user?.internalemailaddress ?? '',
            source: 'team',
            teamName: teamNameById.get(membership.teamid),
          }
        })

        const teamSummaries: TeamSummary[] = teams.map((team) => ({
          id: team.teamid,
          name: team.name ?? 'Unnamed team',
          teamType: teamTypeLabel(String(team.teamtype ?? '')),
          admin: '',
        }))

        if (!isActive) return
        setProfileMemberships({
          teams: teamSummaries,
          users: [...labeledDirectUsers, ...labeledTeamUsers],
        })
      } catch (error) {
        console.error('[Profile Memberships] Load failed', error)
        if (!isActive) return
        setProfileMembershipsError(describeError(error))
      } finally {
        if (isActive) setProfileMembershipsLoading(false)
      }
    }

    void loadProfileMemberships()

    return () => {
      isActive = false
    }
  }, [selectedProfileId])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">Dataverse Security Explorer</p>
          <h1>Simple Security</h1>
          <p className="app-subtitle">
            Trace users, teams, security roles, and field security profiles across direct and inherited
            assignments.
          </p>
        </div>
        <div className="app-status">
          <span className="status-dot" />
          Ready for MCP queries
        </div>
      </header>

      <main className="app-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>System Users</h2>
              <p>Pick a user to see direct roles and inherited roles via team membership.</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => loadUsersPage('reset')}
              disabled={usersLoading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            <div className="panel-list">
              {usersError && <div className="notice error">{usersError}</div>}
              {usersLoading && users.length === 0 ? (
                <div className="notice">Loading users...</div>
              ) : (
                <ul className="list">
                  {users.map((user) => (
                    <li key={user.systemuserid}>
                      <button
                        className={`list-item ${selectedUserId === user.systemuserid ? 'is-active' : ''}`}
                        onClick={() => setSelectedUserId(user.systemuserid)}
                      >
                        <div>
                          <span className="list-title">{user.fullname ?? 'Unnamed user'}</span>
                          <span className="list-meta">{user.internalemailaddress ?? 'No email'}</span>
                        </div>
                        <span className="list-tag">User</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="list-actions">
                <button
                  className="ghost-button"
                  onClick={() => loadUsersPage('more')}
                  disabled={!usersHasMore || usersLoading}
                >
                  {usersHasMore ? 'Load more' : 'No more users'}
                </button>
              </div>
            </div>
            <div className="panel-detail">
              {!selectedUser && <div className="notice">Select a user to view relationships.</div>}
              {selectedUser && (
                <div className="detail">
                  <div className="detail-header">
                    <h3>{selectedUser.fullname ?? 'Unnamed user'}</h3>
                    <p>{selectedUser.internalemailaddress ?? 'No email address'}</p>
                  </div>
                  {userDetailError && <div className="notice error">{userDetailError}</div>}
                  {userDetailLoading && <div className="notice">Loading relationships...</div>}
                  {userDetail && (
                    <>
                      <div className="detail-section">
                        <h4>Teams</h4>
                        {userDetail.teams.length === 0 ? (
                          <p className="muted">No team memberships.</p>
                        ) : (
                          <ul className="detail-list">
                            {userDetail.teams.map((team) => (
                              <li key={team.id}>
                                <span>{team.name}</span>
                                <span className="detail-meta">
                                  {team.teamType ? `Type: ${team.teamType}` : 'Team'}
                                  {team.admin ? ` · Admin: ${team.admin}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="detail-section">
                        <h4>Roles</h4>
                        {userDetail.roles.length === 0 ? (
                          <p className="muted">No roles assigned.</p>
                        ) : (
                          <ul className="detail-list">
                            {userDetail.roles.map((role, index) => (
                              <li key={`${role.id}-${index}`}>
                                <span>{role.name}</span>
                                <span className={`badge ${role.source === 'direct' ? 'badge-direct' : 'badge-team'}`}>
                                  {role.source === 'direct' ? 'Direct' : `Via ${role.teamName ?? 'Team'}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Teams</h2>
              <p>Browse teams and drill into administrators and team types.</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => loadTeamsPage('reset')}
              disabled={teamsLoading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            <div className="panel-list">
              {teamsError && <div className="notice error">{teamsError}</div>}
              {teamsLoading && teams.length === 0 ? (
                <div className="notice">Loading teams...</div>
              ) : (
                <ul className="list">
                  {teams.map((team) => (
                    <li key={team.teamid}>
                      <button
                        className={`list-item ${selectedTeamId === team.teamid ? 'is-active' : ''}`}
                        onClick={() => setSelectedTeamId(team.teamid)}
                      >
                        <div>
                          <span className="list-title">{team.name ?? 'Unnamed team'}</span>
                          <span className="list-meta">
                            {teamTypeLabel(String(team.teamtype ?? ''))}
                          </span>
                        </div>
                        <span className="list-tag">Team</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="list-actions">
                <button
                  className="ghost-button"
                  onClick={() => loadTeamsPage('more')}
                  disabled={!teamsHasMore || teamsLoading}
                >
                  {teamsHasMore ? 'Load more' : 'No more teams'}
                </button>
              </div>
            </div>
            <div className="panel-detail">
              {!selectedTeam && <div className="notice">Select a team to view details.</div>}
              {selectedTeam && (
                <div className="detail">
                  <div className="detail-header">
                    <h3>{selectedTeam.name ?? 'Unnamed team'}</h3>
                    <p>{teamTypeLabel(String(selectedTeam.teamtype ?? ''))}</p>
                  </div>
                  <div className="detail-section">
                    <h4>Administrator</h4>
                    <p className="muted">Not loaded</p>
                  </div>
                  <div className="detail-section">
                    <h4>Business Unit</h4>
                    <p className="muted">Not loaded</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Security Roles</h2>
              <p>Review assignments for users and teams, including inherited memberships.</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => loadRolesPage('reset')}
              disabled={rolesLoading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            <div className="panel-list">
              {rolesError && <div className="notice error">{rolesError}</div>}
              {rolesLoading && roles.length === 0 ? (
                <div className="notice">Loading roles...</div>
              ) : (
                <ul className="list">
                  {roles.map((role) => (
                    <li key={role.roleid}>
                      <button
                        className={`list-item ${selectedRoleId === role.roleid ? 'is-active' : ''}`}
                        onClick={() => setSelectedRoleId(role.roleid)}
                      >
                        <div>
                          <span className="list-title">{role.name ?? 'Unnamed role'}</span>
                          <span className="list-meta">{role.description ?? 'No description'}</span>
                        </div>
                        <span className="list-tag">Role</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="list-actions">
                <button
                  className="ghost-button"
                  onClick={() => loadRolesPage('more')}
                  disabled={!rolesHasMore || rolesLoading}
                >
                  {rolesHasMore ? 'Load more' : 'No more roles'}
                </button>
              </div>
            </div>
            <div className="panel-detail">
              {!selectedRole && <div className="notice">Select a role to view assignments.</div>}
              {selectedRole && (
                <div className="detail">
                  <div className="detail-header">
                    <h3>{selectedRole.name ?? 'Unnamed role'}</h3>
                    <p>{selectedRole.description ?? 'No description'}</p>
                  </div>
                  {roleDetailError && <div className="notice error">{roleDetailError}</div>}
                  {roleDetailLoading && <div className="notice">Loading assignments...</div>}
                  {roleDetail && (
                    <>
                      <div className="detail-section">
                        <h4>Teams</h4>
                        {roleDetail.teams.length === 0 ? (
                          <p className="muted">No teams assigned.</p>
                        ) : (
                          <ul className="detail-list">
                            {roleDetail.teams.map((team) => (
                              <li key={team.id}>
                                <span>{team.name}</span>
                                <span className="detail-meta">
                                  {team.teamType ? `Type: ${team.teamType}` : 'Team'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="detail-section">
                        <h4>Users</h4>
                        {roleDetail.users.length === 0 ? (
                          <p className="muted">No users assigned.</p>
                        ) : (
                          <ul className="detail-list">
                            {roleDetail.users.map((user, index) => (
                              <li key={`${user.id}-${index}`}>
                                <span>{user.name}</span>
                                <span className={`badge ${user.source === 'direct' ? 'badge-direct' : 'badge-team'}`}>
                                  {user.source === 'direct' ? 'Direct' : `Via ${user.teamName ?? 'Team'}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Field Security Profiles</h2>
              <p>Inspect field permissions and profile memberships.</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => loadProfilesPage('reset')}
              disabled={profilesLoading}
            >
              Refresh
            </button>
          </div>
          <div className="panel-body">
            <div className="panel-list">
              {profilesError && <div className="notice error">{profilesError}</div>}
              {profilesLoading && profiles.length === 0 ? (
                <div className="notice">Loading profiles...</div>
              ) : (
                <ul className="list">
                  {profiles.map((profile) => (
                    <li key={profile.fieldsecurityprofileid}>
                      <button
                        className={`list-item ${
                          selectedProfileId === profile.fieldsecurityprofileid ? 'is-active' : ''
                        }`}
                        onClick={() => setSelectedProfileId(profile.fieldsecurityprofileid)}
                      >
                        <div>
                          <span className="list-title">{profile.name ?? 'Unnamed profile'}</span>
                          <span className="list-meta">{profile.description ?? 'No description'}</span>
                        </div>
                        <span className="list-tag">Profile</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="list-actions">
                <button
                  className="ghost-button"
                  onClick={() => loadProfilesPage('more')}
                  disabled={!profilesHasMore || profilesLoading}
                >
                  {profilesHasMore ? 'Load more' : 'No more profiles'}
                </button>
              </div>
            </div>
            <div className="panel-detail">
              {!selectedProfile && <div className="notice">Select a profile to view permissions.</div>}
              {selectedProfile && (
                <div className="detail">
                  <div className="detail-header">
                    <h3>{selectedProfile.name ?? 'Unnamed profile'}</h3>
                    <p>{selectedProfile.description ?? 'No description'}</p>
                  </div>
                  <div className="detail-section">
                    <h4>Memberships</h4>
                    {profileMembershipsError && (
                      <div className="notice error">{profileMembershipsError}</div>
                    )}
                    {profileMembershipsLoading ? (
                      <div className="notice">Loading profile memberships...</div>
                    ) : profileMemberships ? (
                      <>
                        <div className="detail-section">
                          <h4>Teams</h4>
                          {profileMemberships.teams.length === 0 ? (
                            <p className="muted">No teams assigned.</p>
                          ) : (
                            <ul className="detail-list">
                              {profileMemberships.teams.map((team) => (
                                <li key={team.id}>
                                  <span>{team.name}</span>
                                  <span className="detail-meta">
                                    {team.teamType ? `Type: ${team.teamType}` : 'Team'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="detail-section">
                          <h4>Users</h4>
                          {profileMemberships.users.length === 0 ? (
                            <p className="muted">No users assigned.</p>
                          ) : (
                            <ul className="detail-list">
                              {profileMemberships.users.map((user, index) => (
                                <li key={`${user.id}-${index}`}>
                                  <span>{user.name}</span>
                                  <span className={`badge ${user.source === 'direct' ? 'badge-direct' : 'badge-team'}`}>
                                    {user.source === 'direct' ? 'Direct' : `Via ${user.teamName ?? 'Team'}`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="muted">No memberships available.</p>
                    )}
                  </div>
                  <div className="detail-section">
                    <h4>Field Permissions</h4>
                    {profilePermissionsError && (
                      <div className="notice error">{profilePermissionsError}</div>
                    )}
                    {profilePermissionsLoading ? (
                      <div className="notice">Loading field permissions...</div>
                    ) : profilePermissions.length === 0 ? (
                      <p className="muted">No field permissions found.</p>
                    ) : (
                      <ul className="detail-list">
                        {profilePermissions.map((permission) => (
                          <li key={permission.id}>
                            <span>{`${permission.entity}.${permission.attribute}`}</span>
                            <span className="detail-meta">
                              Read: {permission.read ?? 'Unknown'} · Update: {permission.update ?? 'Unknown'} ·
                              Create: {permission.create ?? 'Unknown'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
