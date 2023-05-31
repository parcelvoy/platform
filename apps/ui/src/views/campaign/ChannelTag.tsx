import { ChannelType } from '../../types'
import { EmailIcon, PushIcon, TextIcon, WebhookIcon } from '../../ui/icons'
import Tag, { TagProps } from '../../ui/Tag'
import { snakeToTitle } from '../../utils'

interface ChannelTagParams {
    channel: ChannelType
    showIcon?: boolean
}

export function ChannelIcon({ channel }: Pick<ChannelTagParams, 'channel'>) {
    const Icon = channel === 'email'
        ? EmailIcon
        : channel === 'text'
            ? TextIcon
            : channel === 'push'
                ? PushIcon
                : WebhookIcon
    return <Icon />
}

export default function ChannelTag({ channel, showIcon = true, ...params }: ChannelTagParams & TagProps) {
    return Tag({
        ...params,
        children: <>{showIcon && <ChannelIcon channel={channel} />}{snakeToTitle(channel)}</>,
        variant: 'plain',
    })
}
