import { loadPushChannel } from '../push'
import InAppChannel from './InAppChannel'

export const loadInAppChannel = async (providerId: number, projectId: number) => {
    const channel = await loadPushChannel(providerId, projectId)
    if (!channel) return
    return new InAppChannel(channel)
}
