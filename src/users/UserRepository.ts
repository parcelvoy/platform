import { User } from '../users/User'

export const getUserFromExternalId = async (projectId: number, externalId: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('external_id', externalId)
            .where('project_id', projectId),
    )
}
