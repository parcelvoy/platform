import { combineURLs, encrypt } from '../utilities'

export const unsubscribe = async (user: User, list: List): Promise<void> => {
    await UserList.update(qb => qb.where('user_id', user.id).where('list_id', list.id), {
        deleted_at: new Date(),
    })
}

export const unsubscribeLink = (user: User, list?: List): string => {
    // const listKey = encrypt(String(list.id))
    // const userKey = encrypt(String(user.id))
    return combineURLs([process.env.BASE_URL!])
}
