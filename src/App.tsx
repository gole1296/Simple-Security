import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  checkLicenseStatus,
  setStoredLicenseKey,
  getStoredLicenseKey,
} from './license'
import type { LicenseStatus } from './license'
import { SettingsModal } from './components/SettingsModal'
import {
  FieldpermissionsService,
  FieldsecurityprofilesService,
  Ope_simplesecurityactionsService,
  PrivilegesService,
  RolesService,
  RoleprivilegescollectionService,
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
import type { Ope_simplesecurityactions } from './generated/models/Ope_simplesecurityactionsModel'
import type { Privileges } from './generated/models/PrivilegesModel'
import type { Roleprivilegescollection } from './generated/models/RoleprivilegescollectionModel'
import type { Roles } from './generated/models/RolesModel'
import type { Systemuserprofilescollection } from './generated/models/SystemuserprofilescollectionModel'
import type { Systemuserrolescollection } from './generated/models/SystemuserrolescollectionModel'
import type { Systemusers } from './generated/models/SystemusersModel'
import type { Teammemberships } from './generated/models/TeammembershipsModel'
import type { Teamprofilescollection } from './generated/models/TeamprofilescollectionModel'
import type { Teamrolescollection } from './generated/models/TeamrolescollectionModel'
import type { Teams } from './generated/models/TeamsModel'
import { runSimpleSecurityAction } from './simpleSecurityAction'

const PAGE_SIZE = 25
const USER_PAGE_SIZE = 500
const ROLE_PAGE_SIZE = 200
const RELATIONSHIP_PAGE_SIZE = 200
const ACTION_PAGE_SIZE = 50

const ACTION_OPERATION_VALUES = {
  associate: 884680000,
  disassociate: 884680001,
} as const

const ACTION_PRINCIPAL_VALUES = {
  systemuser: 884680000,
  team: 884680001,
} as const

const ACTION_RELATED_VALUES = {
  role: 884680000,
  team: 884680001,
  columnsecurityprofile: 884680002,
} as const

const ACTION_STATUS_VALUES = {
  pending: 1,
  success: 884680001,
  failed: 884680002,
} as const

const RELATED_TYPE_LABELS = {
  role: 'role',
  team: 'team',
  columnsecurityprofile: 'profile',
} as const

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
  relatedTables: string[]
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

type ManageModalType = 'user' | 'team' | 'role' | 'profile'

type ManageModalState = {
  type: ManageModalType
  id: string
}

const SYSTEM_ADMIN_ROLE_NAME = 'System Administrator'
const SYSTEM_ADMIN_BLOCK_MESSAGE =
  'This application does not allow for removing System Administrator permissions. Please perform this action in the Power Platform Admin Center'
const BUSINESS_UNIT_BLOCK_MESSAGE = 'This application blocks cross business unit associations.'

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

const getFormattedValue = (record: Record<string, unknown>, field: string) => {
  const value = record[`${field}@OData.Community.Display.V1.FormattedValue`]
  return typeof value === 'string' ? value : undefined
}

const formatDateTime = (value?: string) => {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

const getActionOperationLabel = (action: Ope_simplesecurityactions) => {
  const record = action as unknown as Record<string, unknown>
  return (
    getFormattedValue(record, 'ope_operation') ||
    action.ope_operationname ||
    (action.ope_operation ? String(action.ope_operation) : 'Unknown')
  )
}

const getActionStatusLabel = (action: Ope_simplesecurityactions) => {
  const record = action as unknown as Record<string, unknown>
  return (
    getFormattedValue(record, 'statuscode') ||
    action.statuscodename ||
    (action.statuscode ? String(action.statuscode) : 'Unknown')
  )
}

const getActionPrincipalLabel = (action: Ope_simplesecurityactions) => {
  const record = action as unknown as Record<string, unknown>
  return (
    getFormattedValue(record, '_ope_principaluser_value') ||
    getFormattedValue(record, '_ope_principalteam_value') ||
    getFormattedValue(record, 'ope_principletype') ||
    'Unknown'
  )
}

const getActionRelatedLabel = (
  action: Ope_simplesecurityactions,
  profileNameById?: Record<string, string>
) => {
  const record = action as unknown as Record<string, unknown>
  const profileId = action.ope_relatedprofile ?? ''
  const profileName = profileId && profileNameById ? profileNameById[profileId] : undefined
  return (
    getFormattedValue(record, '_ope_relatedrole_value') ||
    getFormattedValue(record, '_ope_relatedteam_value') ||
    profileName ||
    action.ope_relatedprofile ||
    getFormattedValue(record, 'ope_relatedtype') ||
    'Unknown'
  )
}

const normalizeActionTypeLabel = (value?: string) => {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return undefined
  if (['systemuser', 'system user', 'user'].includes(normalized)) return 'User'
  if (['team'].includes(normalized)) return 'Team'
  if (['role', 'security role'].includes(normalized)) return 'Security Role'
  if (['columnsecurityprofile', 'column security profile', 'field security profile'].includes(normalized)) {
    return 'Field Security Profile'
  }
  return value
}

const formatActionEntityLabel = (
  action: Ope_simplesecurityactions,
  typeField: 'ope_principletype' | 'ope_relatedtype',
  name: string
) => {
  const record = action as unknown as Record<string, unknown>
  const rawType = getFormattedValue(record, typeField)
  const typeLabel = normalizeActionTypeLabel(rawType)
  if (!typeLabel) return name
  return `${name} (${typeLabel})`
}

const escapeODataValue = (value: string) => value.replace(/'/g, "''")

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

const getUserDisplayName = (user?: Systemusers) => {
  if (!user) return 'Unnamed user'
  const name = (user.fullname ?? '').trim()
  if (name) return name
  const email = (user.internalemailaddress ?? '').trim()
  if (email) return email
  return 'Unnamed user'
}

const sortLabeledUsers = (items: LabeledUser[]) =>
  [...items].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    if (nameCompare !== 0) return nameCompare
    const emailCompare = (a.email ?? '').localeCompare(b.email ?? '', undefined, {
      sensitivity: 'base',
    })
    if (emailCompare !== 0) return emailCompare
    return a.id.localeCompare(b.id)
  })

const extractEntitySchemaFromPrivilege = (name?: string) => {
  if (!name) return null
  const trimmed = name.startsWith('prv') ? name.slice(3) : name
  const prefixes = ['AppendTo', 'Append', 'Assign', 'Share', 'Read', 'Write', 'Create', 'Delete']
  const prefix = prefixes.find((entry) => trimmed.startsWith(entry))
  if (!prefix) return null
  const entity = trimmed.slice(prefix.length)
  if (!entity) return null
  return entity.toLowerCase()
}

function App() {
  // License state
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [licenseModalOpen, setLicenseModalOpen] = useState(() => !getStoredLicenseKey())
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>(() => getStoredLicenseKey() || '')
  const [licenseCheckLoading, setLicenseCheckLoading] = useState(false)
  const [licenseCheckError, setLicenseCheckError] = useState<string | null>(null)

  // Theme and app state
  const [theme, setTheme] = useState<'earth' | 'night' | 'clean-slate'>(() => {
    const stored = window.localStorage.getItem('simple-security-theme')
    if (stored === 'earth' || stored === 'night' || stored === 'clean-slate') {
      return stored
    }
    return 'earth'
  })
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'users' | 'teams' | 'roles' | 'profiles' | 'actions'
  >('users')
  const [userSearch, setUserSearch] = useState('')
  const [hideSystemUsers, setHideSystemUsers] = useState(true)
  const [userStatusFilter, setUserStatusFilter] = useState<'enabled' | 'disabled' | 'all'>(
    'enabled'
  )
  const [teamSearch, setTeamSearch] = useState('')

  // On mount, check license
  useEffect(() => {
    console.log('License check starting...')
    let isActive = true
    setLicenseCheckLoading(true)
    checkLicenseStatus().then((status) => {
      console.log('License status received:', status)
      if (isActive) setLicenseStatus(status)
    }).catch((_e) => {
      console.error('License check failed:', _e)
      if (isActive) setLicenseStatus({
        licensed: false,
        validTo: '',
        productId: '',
        message: 'License check failed',
      })
    }).finally(() => {
      if (isActive) setLicenseCheckLoading(false)
    })
    return () => { isActive = false }
  }, [])

  // Handler for license key update
  const handleLicenseKeySave = async () => {
    console.log('[App] handleLicenseKeySave called')
    setLicenseCheckLoading(true)
    setLicenseCheckError(null)
    const key = licenseKeyInput.trim()
    console.log('[App] Storing license key and forcing refresh...')
    setStoredLicenseKey(key)
    try {
      console.log('[App] Calling checkLicenseStatus with key and forceRefresh=true...')
      const status = await checkLicenseStatus(key, true)
      console.log('[App] Received license status:', status)
      setLicenseStatus(status)
      if (status.licensed) {
        console.log('[App] License is valid, closing modal')
        setLicenseModalOpen(false)
      } else {
        console.log('[App] License is not valid, showing error:', status.message)
        setLicenseCheckError(status.message || 'License verification failed')
      }
    } catch (e: any) {
      console.error('[App] Error checking license:', e)
      const errorMsg = e?.message || 'License check failed'
      setLicenseCheckError(errorMsg)
    } finally {
      setLicenseCheckLoading(false)
    }
  }

  // Block UI if not licensed
  const showLicenseBlock = !licenseStatus?.licensed

  const [teamTypeFilter, setTeamTypeFilter] = useState<'all' | '0' | '1' | '2' | '3'>('all')
  const [roleSearch, setRoleSearch] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [actionSearch, setActionSearch] = useState('')
  const [actionOperationFilter, setActionOperationFilter] = useState<
    'all' | 'associate' | 'disassociate'
  >('all')
  const [actionStatusFilter, setActionStatusFilter] = useState<
    'all' | 'pending' | 'success' | 'failed'
  >('all')
  const [actionPrincipalFilter, setActionPrincipalFilter] = useState<
    'all' | 'systemuser' | 'team'
  >('all')
  const [actionRelatedFilter, setActionRelatedFilter] = useState<
    'all' | 'role' | 'team' | 'columnsecurityprofile'
  >('all')
  const [actionSort, setActionSort] = useState<'newest' | 'oldest'>('newest')

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

  const [actions, setActions] = useState<Ope_simplesecurityactions[]>([])
  const [actionsSkipToken, setActionsSkipToken] = useState<string | null>(null)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionsHasMore, setActionsHasMore] = useState(true)
  const [actionsError, setActionsError] = useState<string | null>(null)
  const [actionProfileNameById, setActionProfileNameById] = useState<Record<string, string>>({})

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState<string | null>(null)

  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null)
  const [roleDetailLoading, setRoleDetailLoading] = useState(false)
  const [roleDetailError, setRoleDetailError] = useState<string | null>(null)

  const [teamDetail, setTeamDetail] = useState<{
    members: LabeledUser[]
    roles: LabeledRole[]
    fieldSecurityProfiles: LabeledProfile[]
  } | null>(null)
  const [teamDetailLoading, setTeamDetailLoading] = useState(false)
  const [teamDetailError, setTeamDetailError] = useState<string | null>(null)

  const [profilePermissions, setProfilePermissions] = useState<FieldPermissionSummary[]>([])
  const [profilePermissionsLoading, setProfilePermissionsLoading] = useState(false)
  const [profilePermissionsError, setProfilePermissionsError] = useState<string | null>(null)

  const [profileMemberships, setProfileMemberships] = useState<ProfileMemberships | null>(null)
  const [profileMembershipsLoading, setProfileMembershipsLoading] = useState(false)
  const [profileMembershipsError, setProfileMembershipsError] = useState<string | null>(null)

  const [userDetailRefreshToken, setUserDetailRefreshToken] = useState(0)
  const [teamDetailRefreshToken, setTeamDetailRefreshToken] = useState(0)
  const [roleDetailRefreshToken, setRoleDetailRefreshToken] = useState(0)
  const [profileMembershipsRefreshToken, setProfileMembershipsRefreshToken] = useState(0)

  const [manageModal, setManageModal] = useState<ManageModalState | null>(null)
  const [manageSearch, setManageSearch] = useState({
    users: '',
    teams: '',
    roles: '',
    profiles: '',
  })
  const [manageActionBusy, setManageActionBusy] = useState(false)
  const [manageActionError, setManageActionError] = useState<string | null>(null)
  const [manageActionNotice, setManageActionNotice] = useState<string | null>(null)
  const [manageActionNoticeType, setManageActionNoticeType] = useState<'success' | null>(null)
  const [manageUserResults, setManageUserResults] = useState<Systemusers[]>([])
  const [manageUserResultsLoading, setManageUserResultsLoading] = useState(false)
  const [manageUserResultsError, setManageUserResultsError] = useState<string | null>(null)

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
  const selectedAction = useMemo(
    () => actions.find((action) => action.ope_simplesecurityactionid === selectedActionId) ?? null,
    [actions, selectedActionId]
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

  const isUserDisabled = (user: Systemusers) => {
    const record = user as unknown as Record<string, unknown>
    const formatted = getFormattedValue(record, 'isdisabled')
    if (formatted) {
      const normalized = formatted.toLowerCase()
      if (['yes', 'true', 'disabled'].includes(normalized)) return true
      if (['no', 'false', 'enabled'].includes(normalized)) return false
    }

    const raw = record.isdisabled as unknown
    if (typeof raw === 'boolean') return raw
    if (typeof raw === 'number') return raw === 1
    if (typeof raw === 'string') return raw === '1' || raw.toLowerCase() === 'true'
    return false
  }

  const getUserStatusDisplay = (user: Systemusers) => {
    const record = user as unknown as Record<string, unknown>
    const formatted = getFormattedValue(record, 'isdisabled')
    if (formatted) return formatted
    return isUserDisabled(user) ? 'Disabled' : 'Enabled'
  }

  const matchesUserStatusFilter = (user: Systemusers) => {
    if (userStatusFilter === 'all') return true
    const disabled = isUserDisabled(user)
    return userStatusFilter === 'disabled' ? disabled : !disabled
  }

  const getManagerName = (user: Systemusers) => {
    const record = user as unknown as Record<string, unknown>
    return (
      getFormattedValue(record, '_parentsystemuserid_value') ||
      (record.parentsystemuseridname as string | undefined) ||
      user._parentsystemuserid_value ||
      'Not set'
    )
  }

  const getTeamBusinessUnitName = (team: Teams) => {
    const record = team as unknown as Record<string, unknown>
    return (
      getFormattedValue(record, '_businessunitid_value') ||
      (record.businessunitidname as string | undefined) ||
      team._businessunitid_value ||
      'Not loaded'
    )
  }

  const getTeamAdminName = (team: Teams) => {
    const record = team as unknown as Record<string, unknown>
    return (
      getFormattedValue(record, '_administratorid_value') ||
      (record.administratoridname as string | undefined) ||
      team._administratorid_value ||
      'Not loaded'
    )
  }

  const getRoleBusinessUnitName = (role: Roles) => {
    const record = role as unknown as Record<string, unknown>
    return (
      getFormattedValue(record, '_businessunitid_value') ||
      (record.businessunitidname as string | undefined) ||
      'Not loaded'
    )
  }

  const getUserBusinessUnitId = (user?: Systemusers | null) => user?._businessunitid_value

  const getTeamBusinessUnitId = (team?: Teams | null) => team?._businessunitid_value

  const getRoleBusinessUnitId = (role?: Roles | null) => role?._businessunitid_value

  const normalizeSearchValue = (value: string) => value.trim().toLowerCase()

  const isSystemAdministratorRole = (name?: string) =>
    normalizeSearchValue(name ?? '') === normalizeSearchValue(SYSTEM_ADMIN_ROLE_NAME)

  const validateBusinessUnitAssociation = (
    principalBusinessUnitId?: string,
    relatedBusinessUnitId?: string
  ) => {
    if (!principalBusinessUnitId || !relatedBusinessUnitId) {
      return 'Business unit data is not available for this record. Please refresh and try again.'
    }
    if (principalBusinessUnitId !== relatedBusinessUnitId) {
      return BUSINESS_UNIT_BLOCK_MESSAGE
    }
    return null
  }

  const shouldHideSystemUser = (user?: Systemusers) =>
    hideSystemUsers && (user?.fullname ?? '').startsWith('#')

  const toLabeledUser = (
    user: Systemusers | undefined,
    id: string,
    source: LabeledUser['source'],
    teamName?: string
  ): LabeledUser | null => {
    if (!user || shouldHideSystemUser(user)) return null
    return {
      id,
      name: getUserDisplayName(user),
      email: user.internalemailaddress ?? '',
      source,
      teamName,
    }
  }

  const applyUserFilters = (filter?: string) => {
    const clauses: string[] = []
    if (filter) clauses.push(`(${filter})`)
    if (hideSystemUsers) clauses.push("not startswith(fullname, '#')")
    if (userStatusFilter !== 'all') {
      clauses.push(`isdisabled eq ${userStatusFilter === 'disabled' ? 'true' : 'false'}`)
    }
    return clauses.join(' and ')
  }

  const applyTeamFilters = (filter?: string) => {
    const clauses: string[] = []
    if (filter) clauses.push(`(${filter})`)
    if (teamTypeFilter !== 'all') {
      clauses.push(`teamtype eq ${teamTypeFilter}`)
    }
    if (teamSearch.trim()) {
      const term = escapeODataValue(teamSearch.trim())
      clauses.push(`contains(name, '${term}')`)
    }
    return clauses.length ? clauses.join(' and ') : undefined
  }

  const applyRoleFilters = (filter?: string) => {
    const clauses: string[] = []
    if (filter) clauses.push(`(${filter})`)
    if (roleSearch.trim()) {
      const term = escapeODataValue(roleSearch.trim())
      clauses.push(`(contains(name, '${term}') or contains(description, '${term}'))`)
    }
    return clauses.length ? clauses.join(' and ') : undefined
  }

  const applyProfileFilters = (filter?: string) => {
    const clauses: string[] = []
    if (filter) clauses.push(`(${filter})`)
    if (profileSearch.trim()) {
      const term = escapeODataValue(profileSearch.trim())
      clauses.push(`(contains(name, '${term}') or contains(description, '${term}'))`)
    }
    return clauses.length ? clauses.join(' and ') : undefined
  }

  const applyActionFilters = () => {
    const clauses: string[] = []

    if (actionOperationFilter !== 'all') {
      clauses.push(`ope_operation eq ${ACTION_OPERATION_VALUES[actionOperationFilter]}`)
    }
    if (actionPrincipalFilter !== 'all') {
      clauses.push(`ope_principletype eq ${ACTION_PRINCIPAL_VALUES[actionPrincipalFilter]}`)
    }
    if (actionRelatedFilter !== 'all') {
      clauses.push(`ope_relatedtype eq ${ACTION_RELATED_VALUES[actionRelatedFilter]}`)
    }
    if (actionStatusFilter !== 'all') {
      clauses.push(`statuscode eq ${ACTION_STATUS_VALUES[actionStatusFilter]}`)
    }

    const searchTerm = actionSearch.trim()
    if (searchTerm) {
      const term = escapeODataValue(searchTerm)
      clauses.push(
        `(${[
          `contains(ope_relatedprofile, '${term}')`,
          `contains(ope_errormessage, '${term}')`,
          `contains(ope_name, '${term}')`,
        ].join(' or ')})`
      )
    }

    return clauses.length ? clauses.join(' and ') : undefined
  }

  const openManageModal = (type: ManageModalType, id: string) => {
    setManageModal({ type, id })
    setManageActionError(null)
    setManageActionNotice(null)
    setManageActionNoticeType(null)
    setManageSearch({ users: '', teams: '', roles: '', profiles: '' })
    setManageUserResults([])
    setManageUserResultsError(null)
  }

  const closeManageModal = () => {
    setManageModal(null)
    setManageActionError(null)
    setManageActionNotice(null)
    setManageActionNoticeType(null)
    setManageUserResults([])
    setManageUserResultsError(null)
  }

  const refreshActiveDetail = (type?: ManageModalType) => {
    if (!type) return
    switch (type) {
      case 'user':
        setUserDetailRefreshToken((prev) => prev + 1)
        return
      case 'team':
        setTeamDetailRefreshToken((prev) => prev + 1)
        return
      case 'role':
        setRoleDetailRefreshToken((prev) => prev + 1)
        return
      case 'profile':
        setProfileMembershipsRefreshToken((prev) => prev + 1)
        return
      default:
        return
    }
  }

  const loadManageUsers = async () => {
    const searchTerm = manageSearch.users.trim()
    if (!searchTerm) {
      setManageUserResults([])
      setManageUserResultsError(null)
      return
    }

    setManageUserResultsLoading(true)
    setManageUserResultsError(null)
    try {
      const searchFilter = `(${[
        `contains(fullname, '${escapeODataValue(searchTerm)}')`,
        `contains(internalemailaddress, '${escapeODataValue(searchTerm)}')`,
        `contains(address1_telephone1, '${escapeODataValue(searchTerm)}')`,
      ].join(' or ')})`
      const filter = applyUserFilters(searchFilter)

      let skipToken: string | undefined
      let allUsers: Systemusers[] = []

      do {
        const result = await SystemusersService.getAll({
          select: [
            'systemuserid',
            'fullname',
            'internalemailaddress',
            'address1_telephone1',
            '_businessunitid_value',
            '_parentsystemuserid_value',
            'isdisabled',
          ],
          filter,
          top: USER_PAGE_SIZE,
          skipToken,
        })

        if (!result.success) {
          throw new Error(`Unable to load users. ${describeError(result.error)}`)
        }

        allUsers = [...allUsers, ...result.data]
        skipToken = result.skipToken ?? undefined
      } while (skipToken)

      setManageUserResults(allUsers)
    } catch (error) {
      console.error('[Manage Users] Load failed', error)
      setManageUserResultsError(describeError(error))
    } finally {
      setManageUserResultsLoading(false)
    }
  }

  const handleManageAction = async (input: {
    operation: 'associate' | 'disassociate'
    principalType: 'systemuser' | 'team'
    principalId: string
    relatedType: 'role' | 'team' | 'columnsecurityprofile'
    relatedId: string
    relatedName?: string
    principalBusinessUnitId?: string
    relatedBusinessUnitId?: string
  }) => {
    setManageActionError(null)
    setManageActionNotice(null)
    setManageActionNoticeType(null)

    if (input.operation === 'disassociate' && input.relatedType === 'role') {
      if (isSystemAdministratorRole(input.relatedName)) {
        setManageActionError(SYSTEM_ADMIN_BLOCK_MESSAGE)
        return
      }
    }

    if (input.operation === 'associate' && input.relatedType !== 'columnsecurityprofile') {
      const businessUnitError = validateBusinessUnitAssociation(
        input.principalBusinessUnitId,
        input.relatedBusinessUnitId
      )
      if (businessUnitError) {
        setManageActionError(businessUnitError)
        return
      }
    }

    const relatedLabel = input.relatedName?.trim()
      ? input.relatedName.trim()
      : RELATED_TYPE_LABELS[input.relatedType] ?? input.relatedType
    const successMessage =
      input.operation === 'associate'
        ? `Added to ${relatedLabel}.`
        : `Removed from ${relatedLabel}.`

    setManageActionBusy(true)
    try {
      const result = await runSimpleSecurityAction({
        operation: input.operation,
        principalType: input.principalType,
        principalId: input.principalId,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      })
      if (result.pending) {
        setManageActionNoticeType(null)
        setManageActionNotice(result.message ?? 'Request submitted. Updates may take a moment.')
      } else {
        setManageActionNoticeType('success')
        setManageActionNotice(successMessage)
      }
      refreshActiveDetail(manageModal?.type)
    } catch (error) {
      console.error('[Manage] Action failed', error)
      setManageActionError(describeError(error))
    } finally {
      setManageActionBusy(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    const base = users.filter((user) => {
      const disabled = isUserDisabled(user)
      if (userStatusFilter === 'all') return true
      return userStatusFilter === 'disabled' ? disabled : !disabled
    })
    if (!term) return base
    return base.filter((user) => {
      const candidateValues = [
        user.systemuserid,
        getBusinessUnitName(user),
        user.fullname ?? '',
        user.internalemailaddress ?? '',
        user.address1_telephone1 ?? '',
        getUserStatusDisplay(user),
      ]
      return candidateValues.some((value) => value.toLowerCase().includes(term))
    })
  }, [users, userSearch, userStatusFilter])

  const filteredTeams = useMemo(() => {
    const term = teamSearch.trim().toLowerCase()
    const base =
      teamTypeFilter === 'all'
        ? teams
        : teams.filter((team) => String(team.teamtype ?? '') === teamTypeFilter)
    if (!term) return base
    return base.filter((team) => (team.name ?? '').toLowerCase().includes(term))
  }, [teams, teamSearch, teamTypeFilter])

  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase()
    if (!term) return roles
    return roles.filter((role) => {
      const candidateValues = [
        role.roleid,
        getRoleBusinessUnitName(role),
        role.name ?? '',
        role.description ?? '',
      ]
      return candidateValues.some((value) => value.toLowerCase().includes(term))
    })
  }, [roles, roleSearch])

  const filteredProfiles = useMemo(() => {
    const term = profileSearch.trim().toLowerCase()
    if (!term) return profiles
    return profiles.filter((profile) => {
      const candidateValues = [
        profile.fieldsecurityprofileid,
        profile.name ?? '',
        profile.description ?? '',
      ]
      return candidateValues.some((value) => value.toLowerCase().includes(term))
    })
  }, [profiles, profileSearch])

  const handleTabChange = (tab: 'users' | 'teams' | 'roles' | 'profiles' | 'actions') => {
    setActiveTab(tab)
    setSelectedUserId(null)
    setSelectedTeamId(null)
    setSelectedRoleId(null)
    setSelectedProfileId(null)
    setSelectedActionId(null)
    setUserDetail(null)
    setTeamDetail(null)
    setRoleDetail(null)
    setProfileMemberships(null)
    closeManageModal()
  }

  const loadUsersPage = async (mode: 'reset' | 'more' = 'reset') => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const searchTerm = userSearch.trim()
      const searchFilter = searchTerm
        ? `(${[
            `contains(fullname, '${escapeODataValue(searchTerm)}')`,
            `contains(internalemailaddress, '${escapeODataValue(searchTerm)}')`,
            `contains(address1_telephone1, '${escapeODataValue(searchTerm)}')`,
          ].join(' or ')})`
        : undefined
      const filter = applyUserFilters(searchFilter)

      if (mode === 'reset' && searchTerm) {
        let skipToken: string | undefined
        let allUsers: Systemusers[] = []

        do {
          const result = await SystemusersService.getAll({
            select: [
              'systemuserid',
              'fullname',
              'internalemailaddress',
              'address1_telephone1',
              '_businessunitid_value',
              '_parentsystemuserid_value',
              'isdisabled',
            ],
            filter,
            top: USER_PAGE_SIZE,
            skipToken,
          })

          if (!result.success) {
            throw new Error(`Unable to load users. ${describeError(result.error)}`)
          }

          allUsers = [...allUsers, ...result.data]
          skipToken = result.skipToken ?? undefined
        } while (skipToken)

        setUsers(allUsers)
        setUsersSkipToken(null)
        setUsersHasMore(false)
      } else {
        const skipToken = mode === 'more' ? usersSkipToken ?? undefined : undefined
        const result = await SystemusersService.getAll({
          select: [
            'systemuserid',
            'fullname',
            'internalemailaddress',
            'address1_telephone1',
            '_businessunitid_value',
            '_parentsystemuserid_value',
            'isdisabled',
          ],
          filter,
          top: USER_PAGE_SIZE,
          skipToken,
        })

        if (!result.success) {
          throw new Error(`Unable to load users. ${describeError(result.error)}`)
        }

        setUsers((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
        setUsersSkipToken(result.skipToken ?? null)
        setUsersHasMore(Boolean(result.skipToken))
      }
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
      const filter = applyTeamFilters()
      const result = await TeamsService.getAll({
        select: [
          'teamid',
          'name',
          'teamtype',
          'description',
          '_businessunitid_value',
          '_administratorid_value',
          'azureactivedirectoryobjectid',
        ],
        filter,
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
      const filter = applyRoleFilters()
      const result = await RolesService.getAll({
        select: ['roleid', 'name', 'description', '_businessunitid_value'],
        filter,
        orderBy: ['name'],
        top: ROLE_PAGE_SIZE,
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
      const filter = applyProfileFilters()
      const result = await FieldsecurityprofilesService.getAll({
        select: ['fieldsecurityprofileid', 'name', 'description'],
        filter,
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

  const loadActionsPage = async (mode: 'reset' | 'more' = 'reset') => {
    setActionsLoading(true)
    setActionsError(null)
    try {
      const skipToken = mode === 'more' ? actionsSkipToken ?? undefined : undefined
      const filter = applyActionFilters()
      const orderBy = [actionSort === 'oldest' ? 'createdon' : 'createdon desc']

      const result = await Ope_simplesecurityactionsService.getAll({
        select: [
          'ope_simplesecurityactionid',
          'ope_operation',
          'ope_principletype',
          'ope_relatedtype',
          'ope_relatedprofile',
          'ope_errormessage',
          'createdon',
          'statuscode',
          'ope_name',
          '_ope_principaluser_value',
          '_ope_principalteam_value',
          '_ope_relatedrole_value',
          '_ope_relatedteam_value',
          '_ownerid_value',
        ],
        filter,
        orderBy,
        top: ACTION_PAGE_SIZE,
        skipToken,
      })

      if (!result.success) {
        throw new Error(`Unable to load security actions. ${describeError(result.error)}`)
      }

      setActions((prev) => (mode === 'reset' ? result.data : [...prev, ...result.data]))
      setActionsSkipToken(result.skipToken ?? null)
      setActionsHasMore(Boolean(result.skipToken))
    } catch (error) {
      console.error('[Actions] Load failed', error)
      setActionsError(describeError(error))
    } finally {
      setActionsLoading(false)
    }
  }

  const exportActionsCsv = () => {
    if (actions.length === 0) return

    const toCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`

    const rows = actions.map((action) => {
      const record = action as unknown as Record<string, unknown>
      const principalType =
        getFormattedValue(record, 'ope_principletype') || 'Unknown'
      const relatedType =
        getFormattedValue(record, 'ope_relatedtype') || 'Unknown'
      return [
        formatDateTime(action.createdon),
        getActionOperationLabel(action),
        principalType,
        getActionPrincipalLabel(action),
        relatedType,
        getActionRelatedLabel(action, actionProfileNameById),
        getActionStatusLabel(action),
        action.ope_errormessage ?? '',
      ]
    })

    const header = [
      'Created On',
      'Operation',
      'Principal Type',
      'Principal',
      'Related Type',
      'Related',
      'Status',
      'Error',
    ]

    const csv = [header, ...rows]
      .map((row) => row.map((value) => toCsvValue(String(value))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `security-actions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const fetchRolesByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Roles[]
    const filter = buildOrFilter('roleid', ids)
    const result = await RolesService.getAll({
      select: ['roleid', 'name', 'description', '_businessunitid_value'],
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
      select: [
        'teamid',
        'name',
        'teamtype',
        'description',
        '_businessunitid_value',
        '_administratorid_value',
        'azureactivedirectoryobjectid',
      ],
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
        '_parentsystemuserid_value',
        'isdisabled',
      ],
      filter: applyUserFilters(filter),
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

  const fetchPrivilegesByIds = async (ids: string[]) => {
    if (ids.length === 0) return [] as Privileges[]
    const filter = buildOrFilter('privilegeid', ids)
    const result = await PrivilegesService.getAll({
      select: ['privilegeid', 'name'],
      filter,
      top: ids.length,
    })
    if (!result.success) {
      throw new Error(`Unable to load privileges. ${describeError(result.error)}`)
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
    if (activeTab === 'users') {
      void loadUsersPage('reset')
    }
  }, [hideSystemUsers, userStatusFilter])

  useEffect(() => {
    if (activeTab === 'users') {
      void loadUsersPage('reset')
    }
  }, [userSearch])

  useEffect(() => {
    if (activeTab === 'teams') {
      void loadTeamsPage('reset')
    }
  }, [teamSearch, teamTypeFilter])

  useEffect(() => {
    if (activeTab === 'roles') {
      void loadRolesPage('reset')
    }
  }, [roleSearch])

  useEffect(() => {
    if (activeTab === 'profiles') {
      void loadProfilesPage('reset')
    }
  }, [profileSearch])

  useEffect(() => {
    if (activeTab === 'actions') {
      void loadActionsPage('reset')
    }
  }, [
    activeTab,
    actionSearch,
    actionOperationFilter,
    actionStatusFilter,
    actionPrincipalFilter,
    actionRelatedFilter,
    actionSort,
  ])

  useEffect(() => {
    window.localStorage.setItem('simple-security-theme', theme)
  }, [theme])

  useEffect(() => {
    const profileIds = uniqueById(
      actions
        .filter(
          (action) =>
            String(action.ope_relatedtype ?? '') ===
            String(ACTION_RELATED_VALUES.columnsecurityprofile)
        )
        .map((action) => ({ id: action.ope_relatedprofile ?? '' }))
        .filter((item) => item.id)
    ).map((item) => item.id)

    const missingIds = profileIds.filter((id) => !actionProfileNameById[id])
    if (missingIds.length === 0) return

    let isActive = true
    const loadProfileNames = async () => {
      try {
        const profiles = await fetchProfilesByIds(missingIds)
        if (!isActive) return
        setActionProfileNameById((prev) => {
          const next = { ...prev }
          profiles.forEach((profile) => {
            if (!profile.fieldsecurityprofileid) return
            next[profile.fieldsecurityprofileid] = profile.name ?? 'Unnamed profile'
          })
          return next
        })
      } catch (error) {
        console.error('[Actions] Profile name lookup failed', error)
      }
    }

    void loadProfileNames()

    return () => {
      isActive = false
    }
  }, [actions, actionProfileNameById])

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
  }, [selectedUserId, userDetailRefreshToken])

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamDetail(null)
      setTeamDetailError(null)
      return
    }

    let isActive = true
    const loadTeamDetail = async () => {
      setTeamDetailLoading(true)
      setTeamDetailError(null)
      try {
        const teamGuidFilter = `teamid eq ${selectedTeamId}`
        const [membersResult, teamRolesResult, teamProfilesResult] = await Promise.all([
          TeammembershipsService.getAll({
            select: ['teamid', 'systemuserid'],
            filter: teamGuidFilter,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
          TeamrolescollectionService.getAll({
            select: ['teamid', 'roleid'],
            filter: teamGuidFilter,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
          TeamprofilescollectionService.getAll({
            select: ['teamid', 'fieldsecurityprofileid'],
            filter: teamGuidFilter,
            top: RELATIONSHIP_PAGE_SIZE,
          }),
        ])

        if (!membersResult.success) {
          throw new Error(`Unable to load team members. ${describeError(membersResult.error)}`)
        }
        if (!teamRolesResult.success) {
          throw new Error(`Unable to load team roles. ${describeError(teamRolesResult.error)}`)
        }
        if (!teamProfilesResult.success) {
          throw new Error(
            `Unable to load team field security profiles. ${describeError(teamProfilesResult.error)}`
          )
        }

        const memberLinks = membersResult.data as Teammemberships[]
        const roleLinks = teamRolesResult.data as Teamrolescollection[]
        const profileLinks = teamProfilesResult.data as Teamprofilescollection[]

        const [users, roles, profiles] = await Promise.all([
          fetchUsersByIds(uniqueById(memberLinks.map((link) => ({ id: link.systemuserid }))).map((i) => i.id)),
          fetchRolesByIds(uniqueById(roleLinks.map((link) => ({ id: link.roleid }))).map((i) => i.id)),
          fetchProfilesByIds(
            uniqueById(profileLinks.map((link) => ({ id: link.fieldsecurityprofileid }))).map((i) => i.id)
          ),
        ])

        const userById = new Map<string, Systemusers>(users.map((user) => [user.systemuserid, user]))
        const roleById = new Map<string, Roles>(roles.map((role) => [role.roleid, role]))
        const profileById = new Map<string, Fieldsecurityprofiles>(
          profiles.map((profile) => [profile.fieldsecurityprofileid, profile])
        )

        const members = memberLinks.reduce<LabeledUser[]>((acc, link) => {
          const labeled = toLabeledUser(userById.get(link.systemuserid), link.systemuserid, 'direct')
          if (labeled) acc.push(labeled)
          return acc
        }, [])

        const teamRoles: LabeledRole[] = roleLinks.map((link) => {
          const role = roleById.get(link.roleid)
          return {
            id: link.roleid,
            name: role?.name ?? 'Unnamed role',
            description: role?.description ?? '',
            source: 'direct',
          }
        })

        const teamProfiles: LabeledProfile[] = profileLinks.map((link) => {
          const profile = profileById.get(link.fieldsecurityprofileid)
          return {
            id: link.fieldsecurityprofileid,
            name: profile?.name ?? 'Unnamed profile',
            description: profile?.description ?? '',
            source: 'direct',
          }
        })

        if (!isActive) return
        setTeamDetail({
          members,
          roles: teamRoles,
          fieldSecurityProfiles: teamProfiles,
        })
      } catch (error) {
        console.error('[Team Detail] Load failed', error)
        if (!isActive) return
        setTeamDetailError(describeError(error))
      } finally {
        if (isActive) setTeamDetailLoading(false)
      }
    }

    void loadTeamDetail()

    return () => {
      isActive = false
    }
  }, [selectedTeamId, hideSystemUsers, userStatusFilter, teamDetailRefreshToken])

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
        const [directUsersResult, teamsResult, rolePrivilegesResult] = await Promise.all([
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
          RoleprivilegescollectionService.getAll({
            select: ['roleid', 'privilegeid', 'privilegedepthmask'],
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
        if (!rolePrivilegesResult.success) {
          throw new Error(
            `Unable to load role privileges. ${describeError(rolePrivilegesResult.error)}`
          )
        }

        const directUserLinks = directUsersResult.data as Systemuserrolescollection[]
        const teamRoleLinks = teamsResult.data as Teamrolescollection[]
        const rolePrivilegeLinks = rolePrivilegesResult.data as Roleprivilegescollection[]
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

        const privilegeIds = uniqueById(
          rolePrivilegeLinks
            .filter((link) => Number(link.privilegedepthmask ?? 0) > 0)
            .map((link) => ({ id: link.privilegeid }))
        ).map((item) => item.id)
        const privileges = await fetchPrivilegesByIds(privilegeIds)
        const relatedTables = Array.from(
          new Set(
            privileges
              .map((privilege) => extractEntitySchemaFromPrivilege(privilege.name ?? ''))
              .filter((value): value is string => Boolean(value))
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

        const userById = new Map<string, Systemusers>(users.map((user) => [user.systemuserid, user]))
        const teamNameById = new Map<string, string>(
          teams.map((team) => [team.teamid, team.name ?? 'Unnamed team'])
        )

        const labeledDirectUsers = directUserLinks.reduce<LabeledUser[]>((acc, link) => {
          const labeled = toLabeledUser(userById.get(link.systemuserid), link.systemuserid, 'direct')
          if (labeled) acc.push(labeled)
          return acc
        }, [])

        const labeledTeamUsers = teamMemberships.reduce<LabeledUser[]>((acc, membership) => {
          const labeled = toLabeledUser(
            userById.get(membership.systemuserid),
            membership.systemuserid,
            'team',
            teamNameById.get(membership.teamid)
          )
          if (labeled) acc.push(labeled)
          return acc
        }, [])

        const teamSummaries: TeamSummary[] = teams.map((team) => ({
          id: team.teamid,
          name: team.name ?? 'Unnamed team',
          teamType: teamTypeLabel(String(team.teamtype ?? '')),
          admin: '',
        }))

        if (!isActive) return
        setRoleDetail({
          teams: teamSummaries,
          users: sortLabeledUsers([...labeledDirectUsers, ...labeledTeamUsers]),
          relatedTables,
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
  }, [selectedRoleId, hideSystemUsers, userStatusFilter, roleDetailRefreshToken])

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
          filter: `_fieldsecurityprofileid_value eq ${selectedProfileId}`,
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
  }, [selectedProfileId, hideSystemUsers, userStatusFilter])

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

        const labeledDirectUsers = directUserIds.reduce<LabeledUser[]>((acc, userId) => {
          const labeled = toLabeledUser(userById.get(userId), userId, 'direct')
          if (labeled) acc.push(labeled)
          return acc
        }, [])

        const labeledTeamUsers = teamMemberships.reduce<LabeledUser[]>((acc, membership) => {
          const labeled = toLabeledUser(
            userById.get(membership.systemuserid),
            membership.systemuserid,
            'team',
            teamNameById.get(membership.teamid)
          )
          if (labeled) acc.push(labeled)
          return acc
        }, [])

        const teamSummaries: TeamSummary[] = teams.map((team) => ({
          id: team.teamid,
          name: team.name ?? 'Unnamed team',
          teamType: teamTypeLabel(String(team.teamtype ?? '')),
          admin: '',
        }))

        if (!isActive) return
        setProfileMemberships({
          teams: teamSummaries,
          users: sortLabeledUsers([...labeledDirectUsers, ...labeledTeamUsers]),
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
  }, [selectedProfileId, profileMembershipsRefreshToken])

  useEffect(() => {
    if (!manageModal) return
    if (
      (manageModal.type === 'user' && !selectedUserId) ||
      (manageModal.type === 'team' && !selectedTeamId) ||
      (manageModal.type === 'role' && !selectedRoleId) ||
      (manageModal.type === 'profile' && !selectedProfileId)
    ) {
      closeManageModal()
    }
  }, [manageModal, selectedUserId, selectedTeamId, selectedRoleId, selectedProfileId])

  const detailOpen =
    (activeTab === 'users' && Boolean(selectedUserId)) ||
    (activeTab === 'teams' && Boolean(selectedTeamId)) ||
    (activeTab === 'roles' && Boolean(selectedRoleId)) ||
    (activeTab === 'profiles' && Boolean(selectedProfileId)) ||
    (activeTab === 'actions' && Boolean(selectedActionId))

  const tabDescriptions: Record<typeof activeTab, string> = {
    users: 'Pick a user to see direct roles and inherited roles via team membership.',
    teams: 'Browse teams and drill into administrators and team types.',
    roles: 'Review assignments for users and teams, including inherited memberships.',
    profiles: 'Inspect field permissions and profile memberships.',
    actions: 'Track association requests, status, and error details.',
  }

  const tabTitles: Record<typeof activeTab, string> = {
    users: 'System Users',
    teams: 'Teams',
    roles: 'Security Roles',
    profiles: 'Field Security Profiles',
    actions: 'Security Actions',
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
        { key: 'teamtype', label: 'Team Type' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 0.9fr 1.2fr 140px',
    },
    roles: {
      columns: [
        { key: 'roleid', label: 'Role Id' },
        { key: 'businessUnit', label: 'Business Unit' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 1fr 1.4fr 140px',
    },
    profiles: {
      columns: [
        { key: 'profileid', label: 'Profile Id' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ],
      template: '1.4fr 1fr 1.4fr 140px',
    },
    actions: {
      columns: [
        { key: 'createdon', label: 'Created' },
        { key: 'principal', label: 'Principal' },
        { key: 'operation', label: 'Operation' },
        { key: 'related', label: 'Related' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status' },
      ],
      template: '1fr 1.2fr 0.9fr 1.2fr 1fr 0.8fr 140px',
    },
  } as const

  const gridTemplate = gridConfig[activeTab].template

  const matchesSearchTerm = (term: string, ...values: Array<string | undefined>) => {
    if (!term) return true
    return values.some((value) => (value ?? '').toLowerCase().includes(term))
  }

  const userManageRoles = userDetail?.roles ?? []
  const userManageTeams = userDetail?.teams ?? []
  const userManageProfiles = userDetail?.fieldSecurityProfiles ?? []

  const teamManageMembers = teamDetail?.members ?? []
  const teamManageRoles = teamDetail?.roles ?? []
  const teamManageProfiles = teamDetail?.fieldSecurityProfiles ?? []

  const roleManageTeams = roleDetail?.teams ?? []
  const roleManageUsers = roleDetail?.users ?? []

  const profileManageTeams = profileMemberships?.teams ?? []
  const profileManageUsers = profileMemberships?.users ?? []

  const userRoleIds = new Set(
    userManageRoles.filter((role) => role.source === 'direct').map((role) => role.id)
  )
  const userTeamIds = new Set(userManageTeams.map((team) => team.id))
  const userProfileIds = new Set(
    userManageProfiles.filter((profile) => profile.source === 'direct').map((profile) => profile.id)
  )

  const teamMemberIds = new Set(teamManageMembers.map((member) => member.id))
  const teamRoleIds = new Set(teamManageRoles.map((role) => role.id))
  const teamProfileIds = new Set(teamManageProfiles.map((profile) => profile.id))

  const roleTeamIds = new Set(roleManageTeams.map((team) => team.id))
  const roleUserIds = new Set(
    roleManageUsers.filter((user) => user.source === 'direct').map((user) => user.id)
  )

  const profileTeamIds = new Set(profileManageTeams.map((team) => team.id))
  const profileUserIds = new Set(
    profileManageUsers.filter((user) => user.source === 'direct').map((user) => user.id)
  )

  const manageUserCandidates = manageUserResults.length ? manageUserResults : users
  const manageUserSearchTerm = normalizeSearchValue(manageSearch.users)
  const manageTeamSearchTerm = normalizeSearchValue(manageSearch.teams)
  const manageRoleSearchTerm = normalizeSearchValue(manageSearch.roles)
  const manageProfileSearchTerm = normalizeSearchValue(manageSearch.profiles)
  const manageNoticeClassName =
    manageActionNoticeType === 'success' ? 'notice success' : 'notice'

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Show license block as overlay if not licensed */}
      {showLicenseBlock && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#fff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
            <h2>License Information</h2>
            
            {/* License Status Box */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'left' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Status</strong>
                <div style={{ fontSize: '16px', color: licenseStatus?.licensed ? '#080' : '#b00', fontWeight: 600 }}>
                  {licenseStatus?.licensed ? '✓ Licensed' : '✗ Not Licensed'}
                </div>
              </div>
              
              {licenseStatus?.validTo && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Valid Until</strong>
                  <div style={{ fontSize: '14px' }}>{licenseStatus.validTo}</div>
                </div>
              )}
              
              {licenseStatus?.productId && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Product</strong>
                  <div style={{ fontSize: '14px' }}>{licenseStatus.productId}</div>
                </div>
              )}
              
              {getStoredLicenseKey() && (
                <div>
                  <strong style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>License Key</strong>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', padding: '8px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', wordBreak: 'break-all', marginTop: '4px' }}>
                    {getStoredLicenseKey()}
                  </div>
                </div>
              )}
            </div>
            
            {licenseStatus?.message && !licenseStatus.licensed && (
              <p style={{ color: '#b00', fontWeight: 600, marginBottom: '20px' }}>{licenseStatus.message}</p>
            )}
            
            <button 
              onClick={() => setLicenseModalOpen(true)} 
              style={{ padding: '10px 20px', marginTop: '20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              Update License Key
            </button>
          </div>

          {/* License key update modal */}
          {licenseModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ background: '#fff', padding: '32px', borderRadius: '8px', minWidth: '420px', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Update License Key</h3>
                
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  Enter your license key:
                </label>
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={e => setLicenseKeyInput(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    marginBottom: '16px', 
                    boxSizing: 'border-box', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}
                  disabled={licenseCheckLoading}
                  placeholder="Paste your license key here"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !licenseCheckLoading && licenseKeyInput.trim()) {
                      handleLicenseKeySave()
                    }
                  }}
                  autoFocus
                />
                
                {/* Status message area */}
                {licenseCheckError && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#b00', fontSize: '14px' }}>
                    <strong>Error:</strong> {licenseCheckError}
                  </div>
                )}
                
                {licenseCheckLoading && (
                  <div style={{ marginBottom: '16px', padding: '12px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #007bff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                    </div>
                    Verifying license with Azure...
                  </div>
                )}
                
                {/* Buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => {
                      setLicenseModalOpen(false)
                      setLicenseCheckError(null)
                    }}
                    disabled={licenseCheckLoading} 
                    style={{ 
                      padding: '10px 20px', 
                      background: '#6c757d', 
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: licenseCheckLoading ? 'not-allowed' : 'pointer',
                      opacity: licenseCheckLoading ? 0.6 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleLicenseKeySave} 
                    disabled={licenseCheckLoading || !licenseKeyInput.trim()} 
                    style={{ 
                      padding: '10px 20px', 
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: licenseCheckLoading || !licenseKeyInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: licenseCheckLoading || !licenseKeyInput.trim() ? 0.6 : 1,
                    }}
                  >
                    {licenseCheckLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
              
              {/* Add CSS animation for spinner */}
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </div>
      )}
      <aside className={`side-nav ${navCollapsed ? 'is-collapsed' : ''}`}>
        <div className="side-nav-header">
          <button
            className="nav-toggle"
            type="button"
            onClick={() => setNavCollapsed((prev) => !prev)}
            aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <span className="nav-toggle-icon" aria-hidden>
              {navCollapsed ? '>' : '<'}
            </span>
          </button>
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
            title="System Users"
          >
            <span className="tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" role="presentation">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </span>
            <span className="tab-text">
              <span className="tab-title">System Users</span>
              <span className="tab-meta">Pick a user to see direct roles and inherited roles.</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'teams' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('teams')}
            title="Teams"
          >
            <span className="tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" role="presentation">
                <circle cx="8" cy="9" r="3" />
                <circle cx="16" cy="9" r="3" />
                <path d="M2 20c0-3.3 2.7-6 6-6" />
                <path d="M22 20c0-3.3-2.7-6-6-6" />
              </svg>
            </span>
            <span className="tab-text">
              <span className="tab-title">Teams</span>
              <span className="tab-meta">Browse team composition and types.</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'roles' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('roles')}
            title="Security Roles"
          >
            <span className="tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 3l7 3v6c0 4.4-3 8.2-7 9-4-0.8-7-4.6-7-9V6l7-3z" />
              </svg>
            </span>
            <span className="tab-text">
              <span className="tab-title">Security Roles</span>
              <span className="tab-meta">Audit direct and inherited assignments.</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'profiles' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('profiles')}
            title="Field Security Profiles"
          >
            <span className="tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" role="presentation">
                <circle cx="7" cy="12" r="3" />
                <path d="M10 12h10" />
                <path d="M16 12v3" />
                <path d="M20 12v2" />
              </svg>
            </span>
            <span className="tab-text">
              <span className="tab-title">Field Security Profiles</span>
              <span className="tab-meta">Review memberships and field permissions.</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'actions' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('actions')}
            title="Security Actions"
          >
            <span className="tab-icon" aria-hidden>
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M12 3v6l4 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <span className="tab-text">
              <span className="tab-title">Security Actions</span>
              <span className="tab-meta">Review requests and completion status.</span>
            </span>
          </button>
        </div>
        <div className={`theme-switcher ${navCollapsed ? 'is-collapsed' : ''}`}>
          <p className="theme-label">Theme</p>
          <select
            className="filter-select theme-select"
            value={theme}
            onChange={(event) =>
              setTheme(event.target.value as 'earth' | 'night' | 'clean-slate')
            }
          >
            <option value="earth">Sienna Clay</option>
            <option value="night">Night Watch</option>
            <option value="clean-slate">Clean Slate</option>
          </select>
          <button
            onClick={() => setSettingsModalOpen(true)}
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: navCollapsed ? 'auto' : '100%',
              fontSize: '14px',
            }}
            title="Open settings"
          >
            {navCollapsed ? '⚙' : 'Settings'}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <section className={`list-panel ${detailOpen ? 'is-shifted' : ''}`}>
          <div className="panel-header">
            <div>
              <h2>{tabTitles[activeTab]}</h2>
              <p>{tabDescriptions[activeTab]}</p>
            </div>
            <div className="panel-header-right">
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
              {activeTab === 'teams' && (
                <div className="panel-header-controls">
                  <input
                    className="filter-input"
                    type="search"
                    placeholder="Filter teams"
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                  />
                  <label className="toggle">
                    <span>Type</span>
                    <select
                      className="filter-select"
                      value={teamTypeFilter}
                      onChange={(event) =>
                        setTeamTypeFilter(event.target.value as 'all' | '0' | '1' | '2' | '3')
                      }
                    >
                      <option value="all">All types</option>
                      <option value="0">Owner</option>
                      <option value="1">Access</option>
                      <option value="2">Security Group</option>
                      <option value="3">Office Group</option>
                    </select>
                  </label>
                </div>
              )}
              {activeTab === 'roles' && (
                <div className="panel-header-controls">
                  <input
                    className="filter-input"
                    type="search"
                    placeholder="Filter roles"
                    value={roleSearch}
                    onChange={(event) => setRoleSearch(event.target.value)}
                  />
                </div>
              )}
              {activeTab === 'profiles' && (
                <div className="panel-header-controls">
                  <input
                    className="filter-input"
                    type="search"
                    placeholder="Filter profiles"
                    value={profileSearch}
                    onChange={(event) => setProfileSearch(event.target.value)}
                  />
                </div>
              )}
              {activeTab === 'actions' && (
                <div className="panel-header-controls">
                  <input
                    className="filter-input"
                    type="search"
                    placeholder="Search actions"
                    value={actionSearch}
                    onChange={(event) => setActionSearch(event.target.value)}
                  />
                  <label className="toggle">
                    <span>Operation</span>
                    <select
                      className="filter-select"
                      value={actionOperationFilter}
                      onChange={(event) =>
                        setActionOperationFilter(
                          event.target.value as 'all' | 'associate' | 'disassociate'
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="associate">Associate</option>
                      <option value="disassociate">Disassociate</option>
                    </select>
                  </label>
                  <label className="toggle">
                    <span>Status</span>
                    <select
                      className="filter-select"
                      value={actionStatusFilter}
                      onChange={(event) =>
                        setActionStatusFilter(
                          event.target.value as 'all' | 'pending' | 'success' | 'failed'
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                  <label className="toggle">
                    <span>Principal</span>
                    <select
                      className="filter-select"
                      value={actionPrincipalFilter}
                      onChange={(event) =>
                        setActionPrincipalFilter(event.target.value as 'all' | 'systemuser' | 'team')
                      }
                    >
                      <option value="all">All</option>
                      <option value="systemuser">User</option>
                      <option value="team">Team</option>
                    </select>
                  </label>
                  <label className="toggle">
                    <span>Related</span>
                    <select
                      className="filter-select"
                      value={actionRelatedFilter}
                      onChange={(event) =>
                        setActionRelatedFilter(
                          event.target.value as 'all' | 'role' | 'team' | 'columnsecurityprofile'
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="role">Role</option>
                      <option value="team">Team</option>
                      <option value="columnsecurityprofile">Profile</option>
                    </select>
                  </label>
                  <label className="toggle">
                    <span>Sort</span>
                    <select
                      className="filter-select"
                      value={actionSort}
                      onChange={(event) =>
                        setActionSort(event.target.value as 'newest' | 'oldest')
                      }
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="panel-header-actions">
                <label className="toggle">
                  <span>User Status</span>
                  <select
                    className="filter-select"
                    value={userStatusFilter}
                    onChange={(event) =>
                      setUserStatusFilter(event.target.value as 'enabled' | 'disabled' | 'all')
                    }
                  >
                    <option value="enabled">Enabled only</option>
                    <option value="disabled">Disabled only</option>
                    <option value="all">All</option>
                  </select>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={hideSystemUsers}
                    onChange={(event) => setHideSystemUsers(event.target.checked)}
                  />
                  <span>Hide MS Users</span>
                </label>
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
                {activeTab === 'actions' && (
                  <>
                    <button className="ghost-button" onClick={() => loadActionsPage('reset')} disabled={actionsLoading}>
                      Refresh
                    </button>
                    <button className="ghost-button" onClick={exportActionsCsv} disabled={actions.length === 0}>
                      Export CSV
                    </button>
                  </>
                )}
              </div>
            </div>
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
                      <span className="grid-cell">{getUserStatusDisplay(user)}</span>
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
                  {filteredTeams.map((team) => (
                    <div className="grid-row" style={{ gridTemplateColumns: gridTemplate }} key={team.teamid}>
                      <span className="grid-cell mono">{team.teamid}</span>
                      <span className="grid-cell">{team.name ?? 'Unnamed team'}</span>
                      <span className="grid-cell">{teamTypeLabel(String(team.teamtype ?? ''))}</span>
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
                  {filteredRoles.map((role) => (
                    <div className="grid-row" style={{ gridTemplateColumns: gridTemplate }} key={role.roleid}>
                      <span className="grid-cell mono">{role.roleid}</span>
                      <span className="grid-cell">{getRoleBusinessUnitName(role)}</span>
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
                  {filteredProfiles.map((profile) => (
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
              {activeTab === 'actions' && (
                <>
                  {actionsError && <div className="notice error">{actionsError}</div>}
                  {actionsLoading && actions.length === 0 && (
                    <div className="notice">Loading actions...</div>
                  )}
                  {!actionsLoading && actions.length === 0 && (
                    <div className="notice">No actions found.</div>
                  )}
                  {actions.map((action) => (
                    <div
                      className="grid-row"
                      style={{ gridTemplateColumns: gridTemplate }}
                      key={action.ope_simplesecurityactionid}
                    >
                      <span className="grid-cell">{formatDateTime(action.createdon)}</span>
                      <span className="grid-cell">
                        {formatActionEntityLabel(
                          action,
                          'ope_principletype',
                          getActionPrincipalLabel(action)
                        )}
                      </span>
                      <span className="grid-cell">{getActionOperationLabel(action)}</span>
                      <span className="grid-cell">
                        {formatActionEntityLabel(
                          action,
                          'ope_relatedtype',
                          getActionRelatedLabel(action, actionProfileNameById)
                        )}
                      </span>
                      <span className="grid-cell">
                        {getFormattedValue(
                          action as unknown as Record<string, unknown>,
                          '_ownerid_value'
                        ) ?? 'Unknown'}
                      </span>
                      <span className="grid-cell">{getActionStatusLabel(action)}</span>
                      <span className="grid-cell action">
                        <button
                          className="ghost-button small"
                          onClick={() => setSelectedActionId(action.ope_simplesecurityactionid)}
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
            {activeTab === 'actions' && (
              <button
                className="ghost-button"
                onClick={() => loadActionsPage('more')}
                disabled={!actionsHasMore || actionsLoading}
              >
                {actionsHasMore ? 'Load more' : 'No more actions'}
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
                  <div className="detail-header-top">
                    <h3>User Details</h3>
                    <div className="detail-header-actions">
                      <button
                        className="ghost-button small"
                        type="button"
                        onClick={() => openManageModal('user', selectedUser.systemuserid)}
                      >
                        Manage
                      </button>
                      <button
                        className="detail-close"
                        type="button"
                        onClick={() => setSelectedUserId(null)}
                        aria-label="Close user details"
                      >
                        <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                          <path d="M6 6l12 12" />
                          <path d="M18 6l-12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Full Name</span>
                      <span>{selectedUser.fullname ?? 'Unnamed user'}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Business Unit</span>
                      <span>{getBusinessUnitName(selectedUser)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Primary Email</span>
                      <span>{selectedUser.internalemailaddress ?? 'No email address'}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Status</span>
                      <span>{getUserStatusDisplay(selectedUser)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Manager Name</span>
                      <span>{getManagerName(selectedUser)}</span>
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
                  <div className="detail-header-top">
                    <h3>Team Details</h3>
                    <div className="detail-header-actions">
                      <button
                        className="ghost-button small"
                        type="button"
                        onClick={() => openManageModal('team', selectedTeam.teamid)}
                      >
                        Manage
                      </button>
                      <button
                        className="detail-close"
                        type="button"
                        onClick={() => setSelectedTeamId(null)}
                        aria-label="Close team details"
                      >
                        <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                          <path d="M6 6l12 12" />
                          <path d="M18 6l-12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Team Type</span>
                      <span>{teamTypeLabel(String(selectedTeam.teamtype ?? ''))}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Business Unit</span>
                      <span>{getTeamBusinessUnitName(selectedTeam)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Description</span>
                      <span>{selectedTeam.description ?? 'No description'}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Administrator</span>
                      <span>{getTeamAdminName(selectedTeam)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Object Id for Group</span>
                      <span>{selectedTeam.azureactivedirectoryobjectid ?? 'Not set'}</span>
                    </div>
                  </div>
                </div>
                {teamDetailError && <div className="notice error">{teamDetailError}</div>}
                {teamDetailLoading && <div className="notice">Loading team details...</div>}
                {teamDetail && (
                  <>
                    <div className="detail-section">
                      <h4>Team Members</h4>
                      {teamDetail.members.length === 0 ? (
                        <p className="muted">No members assigned.</p>
                      ) : (
                        <ul className="detail-list">
                          {teamDetail.members.map((member) => (
                            <li key={member.id}>
                              <span>{member.name}</span>
                              <span className="detail-meta">{member.email ?? 'No email'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="detail-section">
                      <h4>Security Roles</h4>
                      {teamDetail.roles.length === 0 ? (
                        <p className="muted">No roles assigned.</p>
                      ) : (
                        <ul className="detail-list">
                          {teamDetail.roles.map((role) => (
                            <li key={role.id}>
                              <span>{role.name}</span>
                              <span className="detail-meta">{role.description ?? 'No description'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="detail-section">
                      <h4>Field Security Profiles</h4>
                      {teamDetail.fieldSecurityProfiles.length === 0 ? (
                        <p className="muted">No field security profiles assigned.</p>
                      ) : (
                        <ul className="detail-list">
                          {teamDetail.fieldSecurityProfiles.map((profile) => (
                            <li key={profile.id}>
                              <span>{profile.name}</span>
                              <span className="detail-meta">{profile.description ?? 'No description'}</span>
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

          {activeTab === 'roles' && !selectedRole && (
            <div className="detail-panel-inner">
              <div className="notice">Select a role to view assignments.</div>
            </div>
          )}
          {activeTab === 'roles' && selectedRole && (
            <div className="detail-panel-inner">
              <div className="detail">
                <div className="detail-header">
                  <div className="detail-header-top">
                    <h3>{selectedRole.name ?? 'Unnamed role'}</h3>
                    <div className="detail-header-actions">
                      <button
                        className="ghost-button small"
                        type="button"
                        onClick={() => openManageModal('role', selectedRole.roleid)}
                      >
                        Manage
                      </button>
                      <button
                        className="detail-close"
                        type="button"
                        onClick={() => setSelectedRoleId(null)}
                        aria-label="Close role details"
                      >
                        <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                          <path d="M6 6l12 12" />
                          <path d="M18 6l-12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
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
                    <div className="detail-section">
                      <h4>Related Tables</h4>
                      {roleDetail.relatedTables.length === 0 ? (
                        <p className="muted">No table permissions found.</p>
                      ) : (
                        <div className="badge-list">
                          {roleDetail.relatedTables.map((table) => (
                            <span className="badge badge-table" key={table}>
                              {table}
                            </span>
                          ))}
                        </div>
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
                  <div className="detail-header-top">
                    <h3>{selectedProfile.name ?? 'Unnamed profile'}</h3>
                    <div className="detail-header-actions">
                      <button
                        className="ghost-button small"
                        type="button"
                        onClick={() => openManageModal('profile', selectedProfile.fieldsecurityprofileid)}
                      >
                        Manage
                      </button>
                      <button
                        className="detail-close"
                        type="button"
                        onClick={() => setSelectedProfileId(null)}
                        aria-label="Close profile details"
                      >
                        <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                          <path d="M6 6l12 12" />
                          <path d="M18 6l-12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
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
                    <div className="permission-table">
                      <div className="permission-row permission-header">
                        <span>Table Schema</span>
                        <span>Field Schema</span>
                        <span>Permissions</span>
                      </div>
                      {profilePermissions.map((permission) => (
                        <div className="permission-row" key={permission.id}>
                          <span className="permission-cell mono">{permission.entity}</span>
                          <span className="permission-cell mono">{permission.attribute}</span>
                          <span className="permission-cell">
                            <span className="permission-stack">
                              <span>Read: {permission.read ?? 'Unknown'}</span>
                              <span>Update: {permission.update ?? 'Unknown'}</span>
                              <span>Create: {permission.create ?? 'Unknown'}</span>
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && !selectedAction && (
            <div className="detail-panel-inner">
              <div className="notice">Select an action to view details.</div>
            </div>
          )}
          {activeTab === 'actions' && selectedAction && (
            <div className="detail-panel-inner">
              <div className="detail">
                <div className="detail-header">
                  <div className="detail-header-top">
                    <h3>Security Action</h3>
                    <div className="detail-header-actions">
                      <button
                        className="detail-close"
                        type="button"
                        onClick={() => setSelectedActionId(null)}
                        aria-label="Close action details"
                      >
                        <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                          <path d="M6 6l12 12" />
                          <path d="M18 6l-12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="detail-stack">
                  <div className="detail-line">
                    <span className="detail-label">Created</span>
                    <span>{formatDateTime(selectedAction.createdon)}</span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Operation</span>
                    <span>{getActionOperationLabel(selectedAction)}</span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Status</span>
                    <span>{getActionStatusLabel(selectedAction)}</span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Principal Type</span>
                    <span>
                      {getFormattedValue(
                        selectedAction as unknown as Record<string, unknown>,
                        'ope_principletype'
                      ) || 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Principal</span>
                    <span>
                      {formatActionEntityLabel(
                        selectedAction,
                        'ope_principletype',
                        getActionPrincipalLabel(selectedAction)
                      )}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Related Type</span>
                    <span>
                      {getFormattedValue(
                        selectedAction as unknown as Record<string, unknown>,
                        'ope_relatedtype'
                      ) || 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Related</span>
                    <span>
                      {formatActionEntityLabel(
                        selectedAction,
                        'ope_relatedtype',
                        getActionRelatedLabel(selectedAction, actionProfileNameById)
                      )}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Owner</span>
                    <span>
                      {getFormattedValue(
                        selectedAction as unknown as Record<string, unknown>,
                        '_ownerid_value'
                      ) ?? 'Unknown'}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Error Message</span>
                    <span>{selectedAction.ope_errormessage ?? 'None'}</span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Request Id</span>
                    <span className="mono">{selectedAction.ope_simplesecurityactionid}</span>
                  </div>
                </div>
                {selectedAction.ope_errormessage && (
                  <div className="notice error">{selectedAction.ope_errormessage}</div>
                )}
              </div>
            </div>
          )}
        </aside>

        {manageModal && (
          <div className="manage-modal">
            <div className="manage-modal-backdrop" onClick={closeManageModal} aria-hidden />
            <div className="manage-modal-card" role="dialog" aria-modal="true">
              {manageModal.type === 'user' && selectedUser && (
                <>
                  <div className="manage-modal-header">
                    <div>
                      <p className="manage-eyebrow">Manage User</p>
                      <h3>{selectedUser.fullname ?? 'Unnamed user'}</h3>
                    </div>
                    <button
                      className="detail-close"
                      type="button"
                      onClick={closeManageModal}
                      aria-label="Close manage user"
                    >
                      <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                        <path d="M6 6l12 12" />
                        <path d="M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="manage-modal-summary detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Business Unit</span>
                      <span>{getBusinessUnitName(selectedUser)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Primary Email</span>
                      <span>{selectedUser.internalemailaddress ?? 'No email address'}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Status</span>
                      <span>{getUserStatusDisplay(selectedUser)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Manager Name</span>
                      <span>{getManagerName(selectedUser)}</span>
                    </div>
                  </div>
                  {manageActionError && <div className="notice error">{manageActionError}</div>}
                  {manageActionNotice && (
                    <div className={manageNoticeClassName}>{manageActionNotice}</div>
                  )}
                  <div className="manage-sections">
                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Security Roles</h4>
                      </div>
                      {userManageRoles.length === 0 ? (
                        <p className="muted">No roles assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {userManageRoles.map((role) => (
                            <li key={role.id} className="manage-row">
                              <div>
                                <span>{role.name}</span>
                                <span
                                  className={`badge ${
                                    role.source === 'direct' ? 'badge-direct' : 'badge-team'
                                  }`}
                                >
                                  {role.source === 'direct'
                                    ? 'Direct'
                                    : `Via ${role.teamName ?? 'Team'}`}
                                </span>
                                {isSystemAdministratorRole(role.name) && (
                                  <span className="manage-meta">Protected</span>
                                )}
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={
                                  manageActionBusy ||
                                  role.source !== 'direct' ||
                                  isSystemAdministratorRole(role.name)
                                }
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: selectedUser.systemuserid,
                                    relatedType: 'role',
                                    relatedId: role.id,
                                    relatedName: role.name,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add roles</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search roles"
                            value={manageSearch.roles}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, roles: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {roles
                            .filter((role) => !userRoleIds.has(role.roleid))
                            .filter((role) =>
                              matchesSearchTerm(
                                manageRoleSearchTerm,
                                role.name ?? '',
                                role.description ?? ''
                              )
                            )
                            .map((role) => (
                              <li key={role.roleid} className="manage-row">
                                <div>
                                  <span>{role.name ?? 'Unnamed role'}</span>
                                  <span className="manage-meta">{getRoleBusinessUnitName(role)}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: selectedUser.systemuserid,
                                      relatedType: 'role',
                                      relatedId: role.roleid,
                                      relatedName: role.name ?? '',
                                      principalBusinessUnitId: getUserBusinessUnitId(selectedUser),
                                      relatedBusinessUnitId: getRoleBusinessUnitId(role),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Team Memberships</h4>
                      </div>
                      {userManageTeams.length === 0 ? (
                        <p className="muted">No team memberships.</p>
                      ) : (
                        <ul className="manage-list">
                          {userManageTeams.map((team) => (
                            <li key={team.id} className="manage-row">
                              <div>
                                <span>{team.name}</span>
                                <span className="manage-meta">
                                  {team.teamType ? `Type: ${team.teamType}` : 'Team'}
                                </span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: selectedUser.systemuserid,
                                    relatedType: 'team',
                                    relatedId: team.id,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add teams</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search teams"
                            value={manageSearch.teams}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, teams: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {teams
                            .filter((team) => !userTeamIds.has(team.teamid))
                            .filter((team) =>
                              matchesSearchTerm(
                                manageTeamSearchTerm,
                                team.name ?? '',
                                team.description ?? ''
                              )
                            )
                            .map((team) => (
                              <li key={team.teamid} className="manage-row">
                                <div>
                                  <span>{team.name ?? 'Unnamed team'}</span>
                                  <span className="manage-meta">{teamTypeLabel(String(team.teamtype ?? ''))}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: selectedUser.systemuserid,
                                      relatedType: 'team',
                                      relatedId: team.teamid,
                                      principalBusinessUnitId: getUserBusinessUnitId(selectedUser),
                                      relatedBusinessUnitId: getTeamBusinessUnitId(team),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Column Security Profiles</h4>
                      </div>
                      {userManageProfiles.length === 0 ? (
                        <p className="muted">No field security profiles assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {userManageProfiles.map((profile) => (
                            <li key={profile.id} className="manage-row">
                              <div>
                                <span>{profile.name}</span>
                                <span
                                  className={`badge ${
                                    profile.source === 'direct' ? 'badge-direct' : 'badge-team'
                                  }`}
                                >
                                  {profile.source === 'direct'
                                    ? 'Direct'
                                    : `Via ${profile.teamName ?? 'Team'}`}
                                </span>
                                <span className="manage-meta">{profile.description ?? 'No description'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy || profile.source !== 'direct'}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: selectedUser.systemuserid,
                                    relatedType: 'columnsecurityprofile',
                                    relatedId: profile.id,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add profiles</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search profiles"
                            value={manageSearch.profiles}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, profiles: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {profiles
                            .filter((profile) => !userProfileIds.has(profile.fieldsecurityprofileid))
                            .filter((profile) =>
                              matchesSearchTerm(
                                manageProfileSearchTerm,
                                profile.name ?? '',
                                profile.description ?? ''
                              )
                            )
                            .map((profile) => (
                              <li key={profile.fieldsecurityprofileid} className="manage-row">
                                <div>
                                  <span>{profile.name ?? 'Unnamed profile'}</span>
                                  <span className="manage-meta">{profile.description ?? 'No description'}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: selectedUser.systemuserid,
                                      relatedType: 'columnsecurityprofile',
                                      relatedId: profile.fieldsecurityprofileid,
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>
                  </div>
                </>
              )}

              {manageModal.type === 'team' && selectedTeam && (
                <>
                  <div className="manage-modal-header">
                    <div>
                      <p className="manage-eyebrow">Manage Team</p>
                      <h3>{selectedTeam.name ?? 'Unnamed team'}</h3>
                    </div>
                    <button
                      className="detail-close"
                      type="button"
                      onClick={closeManageModal}
                      aria-label="Close manage team"
                    >
                      <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                        <path d="M6 6l12 12" />
                        <path d="M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="manage-modal-summary detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Team Type</span>
                      <span>{teamTypeLabel(String(selectedTeam.teamtype ?? ''))}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Business Unit</span>
                      <span>{getTeamBusinessUnitName(selectedTeam)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Administrator</span>
                      <span>{getTeamAdminName(selectedTeam)}</span>
                    </div>
                  </div>
                  {manageActionError && <div className="notice error">{manageActionError}</div>}
                  {manageActionNotice && (
                    <div className={manageNoticeClassName}>{manageActionNotice}</div>
                  )}
                  <div className="manage-sections">
                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Team Members</h4>
                      </div>
                      {teamManageMembers.length === 0 ? (
                        <p className="muted">No members assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {teamManageMembers.map((member) => (
                            <li key={member.id} className="manage-row">
                              <div>
                                <span>{member.name}</span>
                                <span className="manage-meta">{member.email ?? 'No email'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: member.id,
                                    relatedType: 'team',
                                    relatedId: selectedTeam.teamid,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add users</summary>
                        <div className="manage-search manage-search-row">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search users"
                            value={manageSearch.users}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, users: event.target.value }))
                            }
                          />
                          <button
                            className="ghost-button small"
                            type="button"
                            onClick={loadManageUsers}
                            disabled={manageUserResultsLoading || manageActionBusy}
                          >
                            {manageUserResultsLoading ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                        {manageUserResultsError && (
                          <div className="notice error">{manageUserResultsError}</div>
                        )}
                        <ul className="manage-list">
                          {manageUserCandidates
                            .filter((user) => !teamMemberIds.has(user.systemuserid))
                            .filter((user) => matchesUserStatusFilter(user))
                            .filter((user) => !shouldHideSystemUser(user))
                            .filter((user) =>
                              matchesSearchTerm(
                                manageUserSearchTerm,
                                user.fullname ?? '',
                                user.internalemailaddress ?? ''
                              )
                            )
                            .map((user) => (
                              <li key={user.systemuserid} className="manage-row">
                                <div>
                                  <span>{getUserDisplayName(user)}</span>
                                  <span className="manage-meta">{user.internalemailaddress ?? 'No email'}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: user.systemuserid,
                                      relatedType: 'team',
                                      relatedId: selectedTeam.teamid,
                                      principalBusinessUnitId: getUserBusinessUnitId(user),
                                      relatedBusinessUnitId: getTeamBusinessUnitId(selectedTeam),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Security Roles</h4>
                      </div>
                      {teamManageRoles.length === 0 ? (
                        <p className="muted">No roles assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {teamManageRoles.map((role) => (
                            <li key={role.id} className="manage-row">
                              <div>
                                <span>{role.name}</span>
                                <span className="manage-meta">{role.description ?? 'No description'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy || isSystemAdministratorRole(role.name)}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'team',
                                    principalId: selectedTeam.teamid,
                                    relatedType: 'role',
                                    relatedId: role.id,
                                    relatedName: role.name,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add roles</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search roles"
                            value={manageSearch.roles}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, roles: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {roles
                            .filter((role) => !teamRoleIds.has(role.roleid))
                            .filter((role) =>
                              matchesSearchTerm(
                                manageRoleSearchTerm,
                                role.name ?? '',
                                role.description ?? ''
                              )
                            )
                            .map((role) => (
                              <li key={role.roleid} className="manage-row">
                                <div>
                                  <span>{role.name ?? 'Unnamed role'}</span>
                                  <span className="manage-meta">{getRoleBusinessUnitName(role)}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'team',
                                      principalId: selectedTeam.teamid,
                                      relatedType: 'role',
                                      relatedId: role.roleid,
                                      relatedName: role.name ?? '',
                                      principalBusinessUnitId: getTeamBusinessUnitId(selectedTeam),
                                      relatedBusinessUnitId: getRoleBusinessUnitId(role),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Column Security Profiles</h4>
                      </div>
                      {teamManageProfiles.length === 0 ? (
                        <p className="muted">No field security profiles assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {teamManageProfiles.map((profile) => (
                            <li key={profile.id} className="manage-row">
                              <div>
                                <span>{profile.name}</span>
                                <span className="manage-meta">{profile.description ?? 'No description'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'team',
                                    principalId: selectedTeam.teamid,
                                    relatedType: 'columnsecurityprofile',
                                    relatedId: profile.id,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add profiles</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search profiles"
                            value={manageSearch.profiles}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, profiles: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {profiles
                            .filter((profile) => !teamProfileIds.has(profile.fieldsecurityprofileid))
                            .filter((profile) =>
                              matchesSearchTerm(
                                manageProfileSearchTerm,
                                profile.name ?? '',
                                profile.description ?? ''
                              )
                            )
                            .map((profile) => (
                              <li key={profile.fieldsecurityprofileid} className="manage-row">
                                <div>
                                  <span>{profile.name ?? 'Unnamed profile'}</span>
                                  <span className="manage-meta">{profile.description ?? 'No description'}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'team',
                                      principalId: selectedTeam.teamid,
                                      relatedType: 'columnsecurityprofile',
                                      relatedId: profile.fieldsecurityprofileid,
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>
                  </div>
                </>
              )}

              {manageModal.type === 'role' && selectedRole && (
                <>
                  <div className="manage-modal-header">
                    <div>
                      <p className="manage-eyebrow">Manage Role</p>
                      <h3>{selectedRole.name ?? 'Unnamed role'}</h3>
                    </div>
                    <button
                      className="detail-close"
                      type="button"
                      onClick={closeManageModal}
                      aria-label="Close manage role"
                    >
                      <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                        <path d="M6 6l12 12" />
                        <path d="M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="manage-modal-summary detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Business Unit</span>
                      <span>{getRoleBusinessUnitName(selectedRole)}</span>
                    </div>
                    <div className="detail-line">
                      <span className="detail-label">Description</span>
                      <span>{selectedRole.description ?? 'No description'}</span>
                    </div>
                  </div>
                  {manageActionError && <div className="notice error">{manageActionError}</div>}
                  {manageActionNotice && (
                    <div className={manageNoticeClassName}>{manageActionNotice}</div>
                  )}
                  <div className="manage-sections">
                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Users</h4>
                      </div>
                      {roleManageUsers.length === 0 ? (
                        <p className="muted">No users assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {roleManageUsers.map((user) => (
                            <li key={user.id} className="manage-row">
                              <div>
                                <span>{user.name}</span>
                                <span
                                  className={`badge ${
                                    user.source === 'direct' ? 'badge-direct' : 'badge-team'
                                  }`}
                                >
                                  {user.source === 'direct'
                                    ? 'Direct'
                                    : `Via ${user.teamName ?? 'Team'}`}
                                </span>
                                <span className="manage-meta">{user.email ?? 'No email'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={
                                  manageActionBusy ||
                                  user.source !== 'direct' ||
                                  isSystemAdministratorRole(selectedRole.name)
                                }
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: user.id,
                                    relatedType: 'role',
                                    relatedId: selectedRole.roleid,
                                    relatedName: selectedRole.name ?? '',
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add users</summary>
                        <div className="manage-search manage-search-row">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search users"
                            value={manageSearch.users}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, users: event.target.value }))
                            }
                          />
                          <button
                            className="ghost-button small"
                            type="button"
                            onClick={loadManageUsers}
                            disabled={manageUserResultsLoading || manageActionBusy}
                          >
                            {manageUserResultsLoading ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                        {manageUserResultsError && (
                          <div className="notice error">{manageUserResultsError}</div>
                        )}
                        <ul className="manage-list">
                          {manageUserCandidates
                            .filter((user) => !roleUserIds.has(user.systemuserid))
                            .filter((user) => matchesUserStatusFilter(user))
                            .filter((user) => !shouldHideSystemUser(user))
                            .filter((user) =>
                              matchesSearchTerm(
                                manageUserSearchTerm,
                                user.fullname ?? '',
                                user.internalemailaddress ?? ''
                              )
                            )
                            .map((user) => (
                              <li key={user.systemuserid} className="manage-row">
                                <div>
                                  <span>{getUserDisplayName(user)}</span>
                                  <span className="manage-meta">{user.internalemailaddress ?? 'No email'}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: user.systemuserid,
                                      relatedType: 'role',
                                      relatedId: selectedRole.roleid,
                                      relatedName: selectedRole.name ?? '',
                                      principalBusinessUnitId: getUserBusinessUnitId(user),
                                      relatedBusinessUnitId: getRoleBusinessUnitId(selectedRole),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Teams</h4>
                      </div>
                      {roleManageTeams.length === 0 ? (
                        <p className="muted">No teams assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {roleManageTeams.map((team) => (
                            <li key={team.id} className="manage-row">
                              <div>
                                <span>{team.name}</span>
                                <span className="manage-meta">{team.teamType ?? 'Team'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy || isSystemAdministratorRole(selectedRole.name)}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'team',
                                    principalId: team.id,
                                    relatedType: 'role',
                                    relatedId: selectedRole.roleid,
                                    relatedName: selectedRole.name ?? '',
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add teams</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search teams"
                            value={manageSearch.teams}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, teams: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {teams
                            .filter((team) => !roleTeamIds.has(team.teamid))
                            .filter((team) =>
                              matchesSearchTerm(
                                manageTeamSearchTerm,
                                team.name ?? '',
                                team.description ?? ''
                              )
                            )
                            .map((team) => (
                              <li key={team.teamid} className="manage-row">
                                <div>
                                  <span>{team.name ?? 'Unnamed team'}</span>
                                  <span className="manage-meta">{teamTypeLabel(String(team.teamtype ?? ''))}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'team',
                                      principalId: team.teamid,
                                      relatedType: 'role',
                                      relatedId: selectedRole.roleid,
                                      relatedName: selectedRole.name ?? '',
                                      principalBusinessUnitId: getTeamBusinessUnitId(team),
                                      relatedBusinessUnitId: getRoleBusinessUnitId(selectedRole),
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>
                  </div>
                </>
              )}

              {manageModal.type === 'profile' && selectedProfile && (
                <>
                  <div className="manage-modal-header">
                    <div>
                      <p className="manage-eyebrow">Manage Column Security Profile</p>
                      <h3>{selectedProfile.name ?? 'Unnamed profile'}</h3>
                    </div>
                    <button
                      className="detail-close"
                      type="button"
                      onClick={closeManageModal}
                      aria-label="Close manage profile"
                    >
                      <svg viewBox="0 0 24 24" role="presentation" aria-hidden>
                        <path d="M6 6l12 12" />
                        <path d="M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="manage-modal-summary detail-stack">
                    <div className="detail-line">
                      <span className="detail-label">Description</span>
                      <span>{selectedProfile.description ?? 'No description'}</span>
                    </div>
                  </div>
                  {manageActionError && <div className="notice error">{manageActionError}</div>}
                  {manageActionNotice && (
                    <div className={manageNoticeClassName}>{manageActionNotice}</div>
                  )}
                  <div className="manage-sections">
                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Users</h4>
                      </div>
                      {profileManageUsers.length === 0 ? (
                        <p className="muted">No users assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {profileManageUsers.map((user) => (
                            <li key={user.id} className="manage-row">
                              <div>
                                <span>{user.name}</span>
                                <span
                                  className={`badge ${
                                    user.source === 'direct' ? 'badge-direct' : 'badge-team'
                                  }`}
                                >
                                  {user.source === 'direct'
                                    ? 'Direct'
                                    : `Via ${user.teamName ?? 'Team'}`}
                                </span>
                                <span className="manage-meta">{user.email ?? 'No email'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy || user.source !== 'direct'}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'systemuser',
                                    principalId: user.id,
                                    relatedType: 'columnsecurityprofile',
                                    relatedId: selectedProfile.fieldsecurityprofileid,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add users</summary>
                        <div className="manage-search manage-search-row">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search users"
                            value={manageSearch.users}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, users: event.target.value }))
                            }
                          />
                          <button
                            className="ghost-button small"
                            type="button"
                            onClick={loadManageUsers}
                            disabled={manageUserResultsLoading || manageActionBusy}
                          >
                            {manageUserResultsLoading ? 'Searching...' : 'Search'}
                          </button>
                        </div>
                        {manageUserResultsError && (
                          <div className="notice error">{manageUserResultsError}</div>
                        )}
                        <ul className="manage-list">
                          {manageUserCandidates
                            .filter((user) => !profileUserIds.has(user.systemuserid))
                            .filter((user) => matchesUserStatusFilter(user))
                            .filter((user) => !shouldHideSystemUser(user))
                            .filter((user) =>
                              matchesSearchTerm(
                                manageUserSearchTerm,
                                user.fullname ?? '',
                                user.internalemailaddress ?? ''
                              )
                            )
                            .map((user) => (
                              <li key={user.systemuserid} className="manage-row">
                                <div>
                                  <span>{getUserDisplayName(user)}</span>
                                  <span className="manage-meta">{user.internalemailaddress ?? 'No email'}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'systemuser',
                                      principalId: user.systemuserid,
                                      relatedType: 'columnsecurityprofile',
                                      relatedId: selectedProfile.fieldsecurityprofileid,
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>

                    <section className="manage-section">
                      <div className="manage-section-header">
                        <h4>Teams</h4>
                      </div>
                      {profileManageTeams.length === 0 ? (
                        <p className="muted">No teams assigned.</p>
                      ) : (
                        <ul className="manage-list">
                          {profileManageTeams.map((team) => (
                            <li key={team.id} className="manage-row">
                              <div>
                                <span>{team.name}</span>
                                <span className="manage-meta">{team.teamType ?? 'Team'}</span>
                              </div>
                              <button
                                className="ghost-button small danger"
                                type="button"
                                disabled={manageActionBusy}
                                onClick={() =>
                                  handleManageAction({
                                    operation: 'disassociate',
                                    principalType: 'team',
                                    principalId: team.id,
                                    relatedType: 'columnsecurityprofile',
                                    relatedId: selectedProfile.fieldsecurityprofileid,
                                  })
                                }
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details className="manage-expand">
                        <summary>Add teams</summary>
                        <div className="manage-search">
                          <input
                            className="filter-input"
                            type="search"
                            placeholder="Search teams"
                            value={manageSearch.teams}
                            onChange={(event) =>
                              setManageSearch((prev) => ({ ...prev, teams: event.target.value }))
                            }
                          />
                        </div>
                        <ul className="manage-list">
                          {teams
                            .filter((team) => !profileTeamIds.has(team.teamid))
                            .filter((team) =>
                              matchesSearchTerm(
                                manageTeamSearchTerm,
                                team.name ?? '',
                                team.description ?? ''
                              )
                            )
                            .map((team) => (
                              <li key={team.teamid} className="manage-row">
                                <div>
                                  <span>{team.name ?? 'Unnamed team'}</span>
                                  <span className="manage-meta">{teamTypeLabel(String(team.teamtype ?? ''))}</span>
                                </div>
                                <button
                                  className="ghost-button small"
                                  type="button"
                                  disabled={manageActionBusy}
                                  onClick={() =>
                                    handleManageAction({
                                      operation: 'associate',
                                      principalType: 'team',
                                      principalId: team.teamid,
                                      relatedType: 'columnsecurityprofile',
                                      relatedId: selectedProfile.fieldsecurityprofileid,
                                    })
                                  }
                                >
                                  Add
                                </button>
                              </li>
                            ))}
                        </ul>
                      </details>
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        licenseStatus={licenseStatus}
        onLicenseUpdated={setLicenseStatus}
        theme={theme}
      />
    </div>
  )
}

export default App
