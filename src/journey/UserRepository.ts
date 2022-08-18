import { User } from '../models/User'

export const getUserFromExternalId = async (externalId: string): Promise<User | undefined> => {
    return await User.first(qb => qb.where('external_id', externalId))
}
