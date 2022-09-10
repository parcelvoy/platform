import { UserEvent, UserEventParams } from './UserEvent'

export const createEvent = async (event: UserEventParams): Promise<UserEvent> => {
    return await UserEvent.insertAndFetch(event)
}

// export const createEmailEvent = async (event:)

// emailSubscribe (joined list)
// emailUnsubscribe (left list)
// push send
// email send
// email opened
// text send
