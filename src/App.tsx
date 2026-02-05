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
  fieldSecurityProfiles: LabeledProfile[]
}

type RoleDetail = {
  teams: TeamSummary[]
  users: LabeledUser[]
}

type ProfileMemberships = {
  users: LabeledUser[]
  teams: TeamSummary[]
}

type LabeledProfile = {
  id: string
  name: string
  description?: string
  source: 'direct' | 'team'
  teamName?: string
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

const userStatusLabel = (value?: string) => {
  switch (String(value ?? '')) {
    case '0':
      return 'Enabled'
    case '1':
      return 'Disabled'
    default:
      return 'Unknown'
  }
}

const getFormattedValue = (record: Record<string, unknown>, field: string) => {
  const value = record[`${field}@OData.Community.Display.V1.FormattedValue`]
  return typeof value === 'string' ? value : undefined
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
  const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'roles' | 'profiles'>('users')
  const [userSearch, setUserSearch] = useState('')

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

  const getBusinessUnitName = (user: Systemusers) => {
    const record = user as unknown as Record<string, unknown>
    return (
      getFormattedValue(record, '_businessunitid_value') ||
      (record.businessunitidname as string | undefined) ||
      user._businessunitid_value ||
      'Not loaded'
    )
  }

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => {
      const candidateValues = [
        user.systemuserid,
        getBusinessUnitName(user),
        user.fullname ?? '',
        user.internalemailaddress ?? '',
        user.address1_telephone1 ?? '',
        userStatusLabel(String(user.isdisabled ?? '')),
      ]
      return candidateValues.some((value) => value.toLowerCase().includes(term))
    })
  }, [users, userSearch])

  const handleTabChange = (tab: 'users' | 'teams' | 'roles' | 'profiles') => {
    setActiveTab(tab)
    setSelectedUserId(null)
    setSelectedTeamId(null)
    setSelectedRoleId(null)
    setSelectedProfileId(null)
    setUserDetail(null)
    setRoleDetail(null)
    setProfileMemberships(null)
  }

  const loadUsersPage = async (mode: 'reset' | 'more' = 'reset') => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const skipToken = mode === 'more' ? usersSkipToken ?? undefined : undefined
      const result = await SystemusersService.getAll({
        select: [
          'systemuserid',
          'fullname',
          'internalemailaddress',
          'address1_telephone1',
          '_businessunitid_value',
          'isdisabled',
        ],
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
        select: ['teamid', 'name', 'teamtype', 'description'],
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
      select: ['teamid', 'name', 'teamtype', 'description'],
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
      select: [
        'systemuserid',
        'fullname',
        'internalemailaddress',
        'address1_telephone1',
        '_businessunitid_value',
        'isdisabled',
      ],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load users. ${describeError(result.error)}`)
    }
    return result.data
  }

  const fetchProfilesByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Fieldsecurityprofiles[]
    const filter = buildOrFilter('fieldsecurityprofileid', ids)
    const result = await FieldsecurityprofilesService.getAll({
      select: ['fieldsecurityprofileid', 'name', 'description'],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load field security profiles. ${describeError(result.error)}`)
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
        const [userRolesResult, teamMembershipsResult, userProfilesResult] = await Promise.all([
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
          SystemuserprofilescollectionService.getAll({
            select: ['systemuserid', 'fieldsecurityprofileid'],
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
        if (!userProfilesResult.success) {
          throw new Error(
            `Unable to load user field security profiles. ${describeError(userProfilesResult.error)}`
          )
        }

        const userRoleLinks = userRolesResult.data as Systemuserrolescollection[]
        const memberships = teamMembershipsResult.data as Teammemberships[]
        const userProfileLinks = userProfilesResult.data as Systemuserprofilescollection[]
        const teamIds = memberships.map((membership) => membership.teamid)

        const [teamRolesResult, teamProfilesResult] = await Promise.all([
          teamIds.length
            ? TeamrolescollectionService.getAll({
                select: ['roleid', 'teamid'],
                filter: buildOrFilter('teamid', teamIds),
                top: RELATIONSHIP_PAGE_SIZE,
              })
            : Promise.resolve({
                success: true,
                data: [] as Teamrolescollection[],
                error: undefined,
              }),
          teamIds.length
            ? TeamprofilescollectionService.getAll({
                select: ['teamid', 'fieldsecurityprofileid'],
                filter: buildOrFilter('teamid', teamIds),
                top: RELATIONSHIP_PAGE_SIZE,
              })
            : Promise.resolve({
                success: true,
                data: [] as Teamprofilescollection[],
                error: undefined,
              }),
        ])

        if (!teamRolesResult.success) {
          throw new Error(`Unable to load team roles. ${describeError(teamRolesResult.error)}`)
        }
        if (!teamProfilesResult.success) {
          throw new Error(
            `Unable to load team field security profiles. ${describeError(teamProfilesResult.error)}`
          )
        }

        const teamRoleLinks = teamRolesResult.data as Teamrolescollection[]
        const teamProfileLinks = teamProfilesResult.data as Teamprofilescollection[]

        const [directRoles, teams] = await Promise.all([
          fetchRolesByIds(uniqueById(userRoleLinks.map((link) => ({ id: link.roleid }))).map((i) => i.id)),
          fetchTeamsByIds(uniqueById(teamIds.map((id) => ({ id }))).map((i) => i.id)),
        ])

        const teamRoles = await fetchRolesByIds(
          uniqueById(teamRoleLinks.map((link) => ({ id: link.roleid }))).map((i) => i.id)
        )

        const profileIds = uniqueById(
          [...userProfileLinks, ...teamProfileLinks].map((link) => ({ id: link.fieldsecurityprofileid }))
        ).map((item) => item.id)
        const profiles = await fetchProfilesByIds(profileIds)

        const teamNameById = new Map<string, string>(
          teams.map((team) => [team.teamid, team.name ?? 'Unnamed team'])
        )

        const roleNameById = new Map<string, Roles>(
          [...directRoles, ...teamRoles].map((role) => [role.roleid, role])
        )

        const profileById = new Map<string, Fieldsecurityprofiles>(
          profiles.map((profile) => [profile.fieldsecurityprofileid, profile])
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

        const labeledDirectProfiles: LabeledProfile[] = userProfileLinks.map((link) => {
          const profile = profileById.get(link.fieldsecurityprofileid)
          return {
            id: link.fieldsecurityprofileid,
            name: profile?.name ?? 'Unnamed profile',
            description: profile?.description ?? '',
            source: 'direct',
          }
        })

        const labeledTeamProfiles: LabeledProfile[] = teamProfileLinks.map((link) => {
          const profile = profileById.get(link.fieldsecurityprofileid)
          return {
            id: link.fieldsecurityprofileid,
            name: profile?.name ?? 'Unnamed profile',
            description: profile?.description ?? '',
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
          fieldSecurityProfiles: [...labeledDirectProfiles, ...labeledTeamProfiles],
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

  const detailOpen =
    (activeTab === 'users' && Boolean(selectedUserId)) ||
    (activeTab === 'teams' && Boolean(selectedTeamId)) ||
    (activeTab === 'roles' && Boolean(selectedRoleId)) ||
    (activeTab === 'profiles' && Boolean(selectedProfileId))

  const tabDescriptions: Record<typeof activeTab, string> = {
    users: 'Pick a user to see direct roles and inherited roles via team membership.',
    teams: 'Browse teams and drill into administrators and team types.',
    roles: 'Review assignments for users and teams, including inherited memberships.',
    profiles: 'Inspect field permissions and profile memberships.',
  }

  const tabTitles: Record<typeof activeTab, string> = {
    users: 'System Users',
    teams: 'Teams',
    roles: 'Security Roles',
    profiles: 'Field Security Profiles',
  }

  const gridConfig = {
    users: {
      columns: [
        { key: 'systemuserid', label: 'System User Id' },
        { key: 'businessUnit', label: 'Business Unit' },
        { key: 'fullname', label: 'Full Name' },
        { key: 'email', label: 'Primary Email' },
        { key: 'phone', label: 'Business Phone' },
        { key: 'status', label: 'Status' },
      ],
      template: '1.4fr 1.1fr 1.1fr 1.2fr 1fr 0.8fr 140px',
    },
    teams: {
      columns: [
        { key: 'teamid', label: 'Team Id' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 1.4fr 140px',
    },
    roles: {
      columns: [
        { key: 'roleid', label: 'Role Id' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 1.4fr 140px',
    },
    profiles: {
      columns: [
        { key: 'profileid', label: 'Profile Id' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 1.4fr 140px',
    },
  } as const

  const gridTemplate = gridConfig[activeTab].template

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="side-nav-header">
          <p className="app-eyebrow">Dataverse Security Explorer</p>
          <h1>Simple Security</h1>
          <p className="app-subtitle">
            Trace users, teams, security roles, and field security profiles across direct and inherited
            assignments.
          </p>
        </div>
        <div className="side-nav-tabs">
          <button
            className={`tab-button ${activeTab === 'users' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <span className="tab-title">System Users</span>
            <span className="tab-meta">Pick a user to see direct roles and inherited roles.</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'teams' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('teams')}
          >
            <span className="tab-title">Teams</span>
            <span className="tab-meta">Browse team composition and types.</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'roles' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('roles')}
          >
            <span className="tab-title">Security Roles</span>
            <span className="tab-meta">Audit direct and inherited assignments.</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'profiles' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('profiles')}
          >
            <span className="tab-title">Field Security Profiles</span>
            <span className="tab-meta">Review memberships and field permissions.</span>
          </button>
        </div>
        <div className="app-status">
          <span className="status-dot" />
          Ready for MCP queries
        </div>
      </aside>

      <main className="content-area">
        <section className={`list-panel ${detailOpen ? 'is-shifted' : ''}`}>
          <div className="panel-header">
            <div>
              <h2>{tabTitles[activeTab]}</h2>
              <p>{tabDescriptions[activeTab]}</p>
            </div>
            {activeTab === 'users' && (
              <div className="panel-header-controls">
                <input
                  className="filter-input"
                  type="search"
                  placeholder="Filter users"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </div>
            )}
            {activeTab === 'users' && (
              <button className="ghost-button" onClick={() => loadUsersPage('reset')} disabled={usersLoading}>
                Refresh
              </button>
            )}
            {activeTab === 'teams' && (
              <button className="ghost-button" onClick={() => loadTeamsPage('reset')} disabled={teamsLoading}>
                Refresh
              </button>
            )}
            {activeTab === 'roles' && (
              <button className="ghost-button" onClick={() => loadRolesPage('reset')} disabled={rolesLoading}>
                Refresh
              </button>
            )}
            {activeTab === 'profiles' && (
              <button className="ghost-button" onClick={() => loadProfilesPage('reset')} disabled={profilesLoading}>
                Refresh
              </button>
            )}
          </div>
          <div className="grid-table">
            <div className="grid-header" style={{ gridTemplateColumns: gridTemplate }}>
              {gridConfig[activeTab].columns.map((column) => (
                <span key={column.key}>{column.label}</span>
              ))}
              <span></span>
            </div>
            <div className="grid-body">
              {activeTab === 'users' && (
                <>
                  {usersError && <div className="notice error">{usersError}</div>}
                  {usersLoading && users.length === 0 && <div className="notice">Loading users...</div>}
                  {filteredUsers.map((user) => (
                    <div
                      className="grid-row"
                      style={{ gridTemplateColumns: gridTemplate }}
                      key={user.systemuserid}
                    >
                      <span className="grid-cell mono">{user.systemuserid}</span>
                      <span className="grid-cell">{getBusinessUnitName(user)}</span>
                      <span className="grid-cell">{user.fullname ?? 'Unnamed user'}</span>
                      <span className="grid-cell">{user.internalemailaddress ?? 'No email'}</span>
                      <span className="grid-cell">{user.address1_telephone1 ?? 'Not set'}</span>
                      <span className="grid-cell">{userStatusLabel(String(user.isdisabled ?? ''))}</span>
                      <span className="grid-cell action">
                        <button
                          className="ghost-button small"
                          onClick={() => setSelectedUserId(user.systemuserid)}
                        >
                          View Details
                        </button>
                      </span>
                    </div>
                  ))}
                </>
              )}
              {activeTab === 'teams' && (
                <>
                  {teamsError && <div className="notice error">{teamsError}</div>}
                  {teamsLoading && teams.length === 0 && <div className="notice">Loading teams...</div>}
                  {teams.map((team) => (
                    <div className="grid-row" style={{ gridTemplateColumns: gridTemplate }} key={team.teamid}>
                      <span className="grid-cell mono">{team.teamid}</span>
                      <span className="grid-cell">{team.name ?? 'Unnamed team'}</span>
                      <span className="grid-cell">{team.description ?? 'No description'}</span>
                      <span className="grid-cell action">
                        <button className="ghost-button small" onClick={() => setSelectedTeamId(team.teamid)}>
                          View Details
                        </button>
                      </span>
                    </div>
                  ))}
                </>
              )}
              {activeTab === 'roles' && (
                <>
                  {rolesError && <div className="notice error">{rolesError}</div>}
                  {rolesLoading && roles.length === 0 && <div className="notice">Loading roles...</div>}
                  {roles.map((role) => (
                    <div className="grid-row" style={{ gridTemplateColumns: gridTemplate }} key={role.roleid}>
                      <span className="grid-cell mono">{role.roleid}</span>
                      <span className="grid-cell">{role.name ?? 'Unnamed role'}</span>
                      <span className="grid-cell">{role.description ?? 'No description'}</span>
                      <span className="grid-cell action">
                        <button className="ghost-button small" onClick={() => setSelectedRoleId(role.roleid)}>
                          View Details
                        </button>
                      </span>
                    </div>
                  ))}
                </>
              )}
              {activeTab === 'profiles' && (
                <>
                  {profilesError && <div className="notice error">{profilesError}</div>}
                  {profilesLoading && profiles.length === 0 && <div className="notice">Loading profiles...</div>}
                  {profiles.map((profile) => (
                    <div
                      className="grid-row"
                      style={{ gridTemplateColumns: gridTemplate }}
                      key={profile.fieldsecurityprofileid}
                    >
                      <span className="grid-cell mono">{profile.fieldsecurityprofileid}</span>
                      <span className="grid-cell">{profile.name ?? 'Unnamed profile'}</span>
                      <span className="grid-cell">{profile.description ?? 'No description'}</span>
                      <span className="grid-cell action">
                        <button
                          className="ghost-button small"
                          onClick={() => setSelectedProfileId(profile.fieldsecurityprofileid)}
                        >
                          View Details
                        </button>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="list-actions">
            {activeTab === 'users' && (
              <button
                className="ghost-button"
                onClick={() => loadUsersPage('more')}
                disabled={!usersHasMore || usersLoading}
              >
                {usersHasMore ? 'Load more' : 'No more users'}
              </button>
            )}
            {activeTab === 'teams' && (
              <button
                className="ghost-button"
                onClick={() => loadTeamsPage('more')}
                disabled={!teamsHasMore || teamsLoading}
              >
                {teamsHasMore ? 'Load more' : 'No more teams'}
              </button>
            )}
            {activeTab === 'roles' && (
              <button
                className="ghost-button"
                onClick={() => loadRolesPage('more')}
                disabled={!rolesHasMore || rolesLoading}
              >
                {rolesHasMore ? 'Load more' : 'No more roles'}
              </button>
            )}
            {activeTab === 'profiles' && (
              <button
                className="ghost-button"
                onClick={() => loadProfilesPage('more')}
                disabled={!profilesHasMore || profilesLoading}
              >
                {profilesHasMore ? 'Load more' : 'No more profiles'}
              </button>
            )}
          </div>
        </section>

        <aside className={`detail-panel ${detailOpen ? 'is-open' : ''}`}>
          {activeTab === 'users' && !selectedUser && (
            <div className="detail-panel-inner">
              <div className="notice">Select a user to view details.</div>
            </div>
          )}
          {activeTab === 'users' && selectedUser && (
            <div className="detail-panel-inner">
              <div className="detail">
                <div className="detail-header">
                  <h3>{selectedUser.fullname ?? 'Unnamed user'}</h3>
                  <div className="detail-summary">
                    <div>
                      <span className="detail-label">Email</span>
                      <span>{selectedUser.internalemailaddress ?? 'No email address'}</span>
                    </div>
                    <div>
                      <span className="detail-label">Business Unit</span>
                      <span>
                        {getBusinessUnitName(selectedUser)}
                      </span>
                    </div>
                    <div>
                      <span className="detail-label">Status</span>
                      <span>{userStatusLabel(String(selectedUser.isdisabled ?? ''))}</span>
                    </div>
                  </div>
                </div>
                {userDetailError && <div className="notice error">{userDetailError}</div>}
                {userDetailLoading && <div className="notice">Loading relationships...</div>}
                {userDetail && (
                  <>
                    <div className="detail-section">
                      <h4>Assigned Security Roles</h4>
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
                    <div className="detail-section">
                      <h4>Field Security Profiles</h4>
                      {userDetail.fieldSecurityProfiles.length === 0 ? (
                        <p className="muted">No field security profiles assigned.</p>
                      ) : (
                        <ul className="detail-list">
                          {userDetail.fieldSecurityProfiles.map((profile, index) => (
                            <li key={`${profile.id}-${index}`}>
                              <span>{profile.name}</span>
                              <span className={`badge ${profile.source === 'direct' ? 'badge-direct' : 'badge-team'}`}>
                                {profile.source === 'direct' ? 'Direct' : `Via ${profile.teamName ?? 'Team'}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="detail-section">
                      <h4>Team Assignments</h4>
                      {userDetail.teams.length === 0 ? (
                        <p className="muted">No team memberships.</p>
                      ) : (
                        <ul className="detail-list">
                          {userDetail.teams.map((team) => (
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
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'teams' && !selectedTeam && (
            <div className="detail-panel-inner">
              <div className="notice">Select a team to view details.</div>
            </div>
          )}
          {activeTab === 'teams' && selectedTeam && (
            <div className="detail-panel-inner">
              <div className="detail">
                <div className="detail-header">
                  <h3>{selectedTeam.name ?? 'Unnamed team'}</h3>
                  <div className="detail-summary">
                    <div>
                      <span className="detail-label">Type</span>
                      <span>{teamTypeLabel(String(selectedTeam.teamtype ?? ''))}</span>
                    </div>
                    <div>
                      <span className="detail-label">Description</span>
                      <span>{selectedTeam.description ?? 'No description'}</span>
                    </div>
                  </div>
                </div>
                <p className="muted">Additional team details can be added here.</p>
              </div>
            </div>
          )}

          {activeTab === 'roles' && !selectedRole && (
            <div className="detail-panel-inner">
              <div className="notice">Select a role to view assignments.</div>
            </div>
          )}
          {activeTab === 'roles' && selectedRole && (
            <div className="detail-panel-inner">
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
            </div>
          )}

          {activeTab === 'profiles' && !selectedProfile && (
            <div className="detail-panel-inner">
              <div className="notice">Select a profile to view permissions.</div>
            </div>
          )}
          {activeTab === 'profiles' && selectedProfile && (
            <div className="detail-panel-inner">
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
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
