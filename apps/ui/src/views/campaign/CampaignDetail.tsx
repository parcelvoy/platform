import Button from '../../ui/Button'
import PageContent from '../../ui/PageContent'
import { Outlet, useNavigate } from 'react-router'
import { NavigationTabs } from '../../ui/Tabs'
import { useContext, useEffect, useState } from 'react'
import { CampaignContext, LocaleContext, LocaleSelection, ProjectContext, TemplateContext } from '../../contexts'
import { checkProjectRole, languageName } from '../../utils'
import { Campaign, LocaleOption, Template } from '../../types'
import api from '../../api'
import { CampaignTag } from './Campaigns'
import LaunchCampaign from './LaunchCampaign'
import { ArchiveIcon, DuplicateIcon, ForbiddenIcon, RestartIcon, SendIcon } from '../../ui/icons'
import { useTranslation } from 'react-i18next'
import { Menu, MenuItem } from '../../ui'

export interface LocaleParams {
    locale: string
    data: {
        editor: string
    }
}

export const localeOption = (locale: string): LocaleOption => {
    const language = languageName(locale)
    return {
        key: locale,
        label: language ? `${language} (${locale})` : locale,
    }
}

export const locales = (templates: Template[]) => {
    const locales = [...new Set(templates.map(item => item.locale))]
    return locales.map(locale => localeOption(locale))
}

export const localeState = (templates: Template[]) => {
    const allLocales = locales(templates)

    const url: URL = new URL(window.location.href)
    const searchParams: URLSearchParams = url.searchParams
    const queryLocale = searchParams.get('locale')
    return {
        currentLocale: allLocales.find(item => item.key === queryLocale) ?? allLocales[0],
        allLocales: locales(templates ?? []),
    }
}

export const createLocale = async ({ locale, data }: LocaleParams, campaign: Campaign): Promise<Template> => {
    const baseLocale = 'en'
    const template = campaign.templates.find(template => template.locale === baseLocale) ?? campaign.templates[0]
    return await api.templates.create(campaign.project_id, {
        campaign_id: campaign.id,
        type: campaign.channel,
        locale,
        data: template?.data || data ? { ...template?.data, ...data } : undefined,
    })
}

export default function CampaignDetail() {
    const [project] = useContext(ProjectContext)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [campaign, setCampaign] = useContext(CampaignContext)
    const { name, templates, state, send_at, progress } = campaign

    const [template, setTemplate] = useState<Template | undefined>()

    const [locale, setLocale] = useState<LocaleSelection>(localeState(templates ?? []))
    useEffect(() => {
        setLocale(localeState(templates ?? []))
        setTemplate(templates[0])
    }, [campaign.id])
    const [isLaunchOpen, setIsLaunchOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const templateManager = {
        currentTemplate: template,
        templates: campaign.templates,
        currentLocale: template?.locale ? localeOption(template?.locale) : undefined,
        locales: locales(campaign.templates),
        variants: campaign.templates.filter(t => t.locale === template?.locale),
        setTemplate,
    }

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
            <LocaleContext.Provider value={[locale, setLocale]}>
                <TemplateContext.Provider value={templateManager}>
                    <Outlet />
                </TemplateContext.Provider>
            </LocaleContext.Provider>

            <LaunchCampaign open={isLaunchOpen} onClose={setIsLaunchOpen} />
        </PageContent>
    )
}
