import { getClient } from '@microsoft/power-apps/data'
import { dataSourcesInfo } from '../.power/schemas/appschemas/dataSourcesInfo'

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
}

const client = getClient(dataSourcesInfo) as unknown as {
  executeAsync: (request: unknown) => Promise<unknown>
}

export const runSimpleSecurityAction = async (
  params: SimpleSecurityActionParams
): Promise<SimpleSecurityActionResponse> => {
  const result = (await client.executeAsync({
    dataverseRequest: {
      action: 'ope_simplesecurityaction',
      parameters: {
        ope_Operation: params.operation,
        ope_PrincipalType: params.principalType,
        ope_PrincipalId: params.principalId,
        ope_RelatedType: params.relatedType,
        ope_RelatedId: params.relatedId,
        ...(params.relationshipName ? { ope_RelationshipName: params.relationshipName } : {}),
      },
    },
  })) as { success: boolean; data?: { ope_Success?: boolean }; error?: unknown }

  if (!result.success) {
    throw result.error ?? new Error('Simple security action failed.')
  }

  const success = Boolean(result.data?.ope_Success)
  if (!success) {
    throw new Error('Simple security action did not return success.')
  }

  return { success }
}
