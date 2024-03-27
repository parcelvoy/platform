import { DataTable, PageContent, Tag } from '../../ui'
import { TagProps } from '../../ui/Tag'
import { camelToTitle, formatDate } from '../../utils'
import { useLoaderData } from 'react-router-dom'
import { JourneyEntranceDetail } from '../../types'
import { useContext } from 'react'
import { PreferencesContext } from '../../ui/PreferencesContext'
import * as stepTypes from './steps'
import clsx from 'clsx'
import { stepCategoryColors } from './JourneyEditor'
import { useTranslation } from 'react-i18next'

export const typeVariants: Record<string, TagProps['variant']> = {
    completed: 'success',
    error: 'error',
    action: 'info',
    delay: 'warn',
    pending: 'plain',
}

export default function EntranceDetails() {

    const { t } = useTranslation()
    const [preferences] = useContext(PreferencesContext)

    const { journey, user, userSteps } = useLoaderData() as JourneyEntranceDetail

    const entrance = userSteps[0]
    const error = userSteps.find(s => s.type === 'error')

    return (
        <PageContent
            title={`${user.full_name} - ${journey.name}`}
            desc={
                <>
                    <Tag variant={error ? 'error' : entrance.ended_at ? 'success' : 'info'}>
                        {
                            error ? 'Error' : entrance.ended_at ? 'Completed' : 'Running'
                        }
                    </Tag>
                    {
                        entrance.ended_at && ` at ${formatDate(preferences, new Date())}`
                    }
                </>
            }
        >
            <DataTable
                items={userSteps ?? []}
                isLoading={!userSteps}
                columns={[
                    {
                        key: 'step',
                        cell: ({ item }) => {

                            const stepType = stepTypes[item.step!.type as keyof typeof stepTypes]

                            return (
                                <div className="multi-cell">
                                    <div className={clsx('icon-box', stepCategoryColors[stepType.category])}>
                                        {stepType?.icon}
                                    </div>
                                    <div className="text">
                                        <div className="title">{item.step!.name || 'Untitled'}</div>
                                        <div className="subtitle">{t(item.step!.type)}</div>
                                    </div>
                                </div>
                            )
                        },
                    },
                    {
                        key: 'type',
                        title: 'Type',
                        cell: ({ item }) => (
                            <Tag variant={typeVariants[item.type]}>
                                {camelToTitle(item.type)}
                            </Tag>
                        ),
                    },
                    { key: 'created_at', title: t('created_at') },
                    { key: 'delay_until', title: t('delay_until') },
                ]}
            />
        </PageContent>
    )
}
