import { Job } from '../queue'
import { toggleSubscription } from './SubscriptionService'
import { SubscriptionState } from './Subscription'
import { getUserFromClientId } from '../users/UserRepository'
import { ClientIdentity } from '../client/Client'

type UserUnsubscribeParams = {
    external_id: string
    project_id: number
    subscription_id: number
} & ClientIdentity

export default class UnsubscribeJob extends Job {
    static $name = 'unsubscribe'

    static from(data: UserUnsubscribeParams): UnsubscribeJob {
        return new this(data)
    }

    static async handler({ project_id, subscription_id, external_id }: UserUnsubscribeParams) {
        const user = await getUserFromClientId(project_id, { external_id })
        if (!user) return
        await toggleSubscription(user.id, subscription_id, SubscriptionState.unsubscribed)
    }
}
