import { ChannelType } from '../../types'
import { EmailIcon, PushIcon, TextIcon, WebhookIcon } from '../../ui/icons'
import Tag from '../../ui/Tag'
import { snakeToTitle } from '../../utils'

interface ChannelTagParams {
    channel: ChannelType
}

export default function ChannelTag({ channel }: ChannelTagParams) {
    const Icon = channel === 'email'
        ? EmailIcon
        : channel === 'text'
            ? TextIcon
            : channel === 'push'
                ? PushIcon
                : WebhookIcon
    return Tag({
        children: <><Icon />{snakeToTitle(channel)}</>,
        variant: 'plain',
    })
}
