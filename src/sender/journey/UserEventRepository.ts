import { UserEvent } from './UserEvent'

export const createEvent = async (
    user_id: number,
    name: string,
    properties: Record<string, any>,
): Promise<void> => {
    UserEvent.insert({
        user_id,
        name,
        properties,
    })
}
