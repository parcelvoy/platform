import Button from '../../ui/Button'
import PageContent from '../../ui/PageContent'
import { Outlet, useNavigate } from 'react-router'
import { NavigationTabs } from '../../ui/Tabs'
import { useContext, useState } from 'react'
import { CampaignContext, ProjectContext } from '../../contexts'
import { checkProjectRole } from '../../utils'
import api from '../../api'
import { CampaignTag } from './Campaigns'
import LaunchCampaign from './launch/LaunchCampaign'
import { ArchiveIcon, DuplicateIcon, ForbiddenIcon, RestartIcon, SendIcon } from '../../ui/icons'
import { useTranslation } from 'react-i18next'
import { Menu, MenuItem } from '../../ui'
import { TemplateContextProvider } from './TemplateContextProvider'

export default function CampaignDetail() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [campaign, setCampaign] = useContext(CampaignContext)
    const { name, state, send_at, progress } = campaign
    const [isLaunchOpen, setIsLaunchOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleDuplicate = async (id: number) => {
        const campaign = await api.campaigns.duplicate(project.id, id)
        await navigate(`/projects/${project.id}/campaigns/${campaign.id}`)
    }

    const handleArchive = async (id: number) => {
        await api.campaigns.delete(project.id, id)
        await navigate(`/projects/${project.id}/campaigns`)
    }

    const handleAbort = async () => {
        setIsLoading(true)
        const value = await api.campaigns.update(project.id, campaign.id, { state: 'aborted' })
        setCampaign(value)
        setIsLoading(false)
    }

    const tabs = [
        {
            key: 'details',
            to: '',
            children: t('details'),
        },
        {
            key: 'design',
            to: 'design',
            children: t('design'),
        },
        {
            key: 'preview',
            to: 'preview',
            children: t('preview'),
        },
        {
            key: 'delivery',
            to: 'delivery',
            children: t('delivery'),
        },
    ]

    const action = {
        draft: (
            <Button
                icon={<SendIcon />}
                onClick={() => setIsLaunchOpen(true)}
            >{t('launch_campaign')}</Button>
        ),
        aborted: (
            <Button
                icon={<RestartIcon />}
                onClick={() => setIsLaunchOpen(true)}
            >{t('restart_campaign')}</Button>
        ),
        aborting: send_at
            ? (
                <Button
                    icon={<SendIcon />}
                    isLoading={true}
                >{t('rescheduling')}</Button>
            )
            : (
                <Button
                    icon={<ForbiddenIcon />}
                    isLoading={true}
                >{t('abort_campaign')}</Button>
            ),
        loading: (
            <Button
                icon={<ForbiddenIcon />}
                isLoading={isLoading}
                onClick={async () => await handleAbort()}
            >{t('abort_campaign')}</Button>
        ),
        scheduled: (
            <>
                <Button
                    icon={<SendIcon />}
                    onClick={() => setIsLaunchOpen(true)}
                >{t('change_schedule')}</Button>
                <Button
                    icon={<ForbiddenIcon />}
                    isLoading={isLoading}
                    onClick={async () => await handleAbort()}
                >{t('abort_campaign')}</Button>
            </>
        ),
        running: (
            <Button
                icon={<ForbiddenIcon />}
                isLoading={isLoading}
                onClick={async () => await handleAbort()}
            >{t('abort_campaign')}</Button>
        ),
        finished: <></>,
    }

    return (
        <PageContent
            title={name}
            desc={state !== 'draft' && <CampaignTag
                state={state}
                progress={progress}
                send_at={send_at}
            />}
            actions={
                <>
                    {checkProjectRole('publisher', project.role) && (
                        campaign.type !== 'trigger' && action[state]
                    )}
                    <Menu size="regular">
                        <MenuItem onClick={async () => await handleDuplicate(campaign.id)}>
                            <DuplicateIcon />{t('duplicate')}
                        </MenuItem>
                        <MenuItem onClick={async () => await handleArchive(campaign.id)}>
                            <ArchiveIcon />{t('archive')}
                        </MenuItem>
                    </Menu>
                </>
            }
            fullscreen={true}>
            <NavigationTabs tabs={tabs} />
            <TemplateContextProvider campaign={campaign} setCampaign={setCampaign}>
                <Outlet />
                <LaunchCampaign open={isLaunchOpen} onClose={setIsLaunchOpen} />
            </TemplateContextProvider>
        </PageContent>
    )
}
