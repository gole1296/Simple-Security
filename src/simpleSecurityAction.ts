import {
  Ope_simplesecurityactionsService,
} from './generated'
import { checkLicenseStatus } from './license'
import type {
  Ope_simplesecurityactionsope_operation,
  Ope_simplesecurityactionsope_principletype,
  Ope_simplesecurityactionsope_relatedtype,
  Ope_simplesecurityactionsBase,
} from './generated/models/Ope_simplesecurityactionsModel'

type SimpleSecurityOperation = 'associate' | 'disassociate'
type SimpleSecurityPrincipal = 'systemuser' | 'team'
type SimpleSecurityRelated = 'role' | 'team' | 'columnsecurityprofile'

type SimpleSecurityActionParams = {
  operation: SimpleSecurityOperation
  principalType: SimpleSecurityPrincipal
  principalId: string
  relatedType: SimpleSecurityRelated
  relatedId: string
  relationshipName?: string
}

type SimpleSecurityActionResponse = {
  success: boolean
  pending?: boolean
  message?: string
}

const operationValues: Record<SimpleSecurityOperation, Ope_simplesecurityactionsope_operation> = {
  associate: 884680000,
  disassociate: 884680001,
}

const principalTypeValues: Record<SimpleSecurityPrincipal, Ope_simplesecurityactionsope_principletype> = {
  systemuser: 884680000,
  team: 884680001,
}

const relatedTypeValues: Record<SimpleSecurityRelated, Ope_simplesecurityactionsope_relatedtype> = {
  role: 884680000,
  team: 884680001,
  columnsecurityprofile: 884680002,
}

const STATUS_PENDING = 1
const STATUS_SUCCESS = 884680001
const STATUS_FAILED = 884680002
const STATE_ACTIVE = 0

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const runSimpleSecurityAction = async (
  params: SimpleSecurityActionParams
): Promise<SimpleSecurityActionResponse> => {
  // License check before mutation
  const license = await checkLicenseStatus();
  if (!license.licensed) {
    throw new Error(license.message || 'App is not licensed. Cannot perform this action.');
  }

  const record = {
    ope_name: `Security ${params.operation} ${new Date().toISOString()}`,
    ope_operation: operationValues[params.operation],
    ope_principletype: principalTypeValues[params.principalType],
    ope_relatedtype: relatedTypeValues[params.relatedType],
    statuscode: STATUS_PENDING,
    statecode: STATE_ACTIVE,
    ...(params.principalType === 'systemuser'
      ? { 'ope_PrincipalUser@odata.bind': `/systemusers(${params.principalId})` }
      : { 'ope_PrincipalTeam@odata.bind': `/teams(${params.principalId})` }),
    ...(params.relatedType === 'role'
      ? { 'ope_RelatedRole@odata.bind': `/roles(${params.relatedId})` }
      : params.relatedType === 'team'
      ? { 'ope_RelatedTeam@odata.bind': `/teams(${params.relatedId})` }
      : { ope_relatedprofile: params.relatedId }),
  } as Ope_simplesecurityactionsBase

  const createResult = await Ope_simplesecurityactionsService.create(record)

  if (!createResult.success) {
    throw createResult.error ?? new Error('Unable to create simple security action request.')
  }

  const requestId = createResult.data.ope_simplesecurityactionid
  const maxAttempts = 10
  const delayMs = 500

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const statusResult = await Ope_simplesecurityactionsService.get(requestId, {
      select: ['statuscode', 'ope_errormessage'],
    })

    if (!statusResult.success) {
      throw statusResult.error ?? new Error('Unable to read simple security action status.')
    }

    const statusValue = Number(statusResult.data.statuscode ?? STATUS_PENDING)
    if (statusValue === STATUS_SUCCESS) {
      return { success: true }
    }

    if (statusValue === STATUS_FAILED) {
      const message = statusResult.data.ope_errormessage || 'Security action failed.'
      throw new Error(message)
    }

    await sleep(delayMs)
  }

  return {
    success: true,
    pending: true,
    message: 'Request submitted. Updates may take a moment to appear.',
  }
}
