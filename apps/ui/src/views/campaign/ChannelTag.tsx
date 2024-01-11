import { ChannelType } from '../../types'
import { EmailIcon, PushIcon, TextIcon, WebhookIcon } from '../../ui/icons'
import Tag, { TagProps } from '../../ui/Tag'
import { useTranslation } from 'react-i18next'

interface ChannelTagParams {
    channel: ChannelType
    showIcon?: boolean
}

export function ChannelIcon({ channel }: Pick<ChannelTagParams, 'channel'>) {
    const Icon = channel === 'email'
        ? EmailIcon
        : channel === 'text'
            ? TextIcon
            : channel === 'push' || channel === 'in_app'
                ? PushIcon
                : WebhookIcon
    return <Icon />
}

export default function ChannelTag({ channel, showIcon = true, ...params }: ChannelTagParams & TagProps) {
    const { t } = useTranslation()

    const title: Record<ChannelType, string> = {
        email: t('email'),
        text: t('text'),
        push: t('push'),
        webhook: t('webhook'),
    }

    return Tag({
        ...params,
        children: <>{showIcon && <ChannelIcon channel={channel} />}{title[channel]}</>,
        variant: 'plain',
    })
}
