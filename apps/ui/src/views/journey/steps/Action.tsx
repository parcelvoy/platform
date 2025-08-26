import { useCallback, useContext } from 'react'
import api from '../../../api'
import { Campaign, JourneyStepType } from '../../../types'
import { EntityIdPicker } from '../../../ui/form/EntityIdPicker'
import { ActionStepIcon } from '../../../ui/icons'
import { CampaignForm } from '../../campaign/CampaignForm'
import { useResolver } from '../../../hooks'
import { useTranslation } from 'react-i18next'
import { ChannelIcon } from '../../campaign/ChannelTag'
import Preview from '../../../ui/Preview'
import { SingleSelect } from '../../../ui/form/SingleSelect'
import { Heading, LinkButton } from '../../../ui'
import { TemplateContextProvider } from '../../campaign/TemplateContextProvider'
import { TemplateContext } from '../../../contexts'

interface ActionConfig {
    campaign_id: number
}

const JourneyTemplatePreview = ({ campaign }: { campaign: Campaign }) => {
    const { t } = useTranslation()
    const { variants, locales, currentLocale, currentTemplate, setTemplate, setLocale } = useContext(TemplateContext)
    return <>
        <Heading
            title={t('preview')}
            size="h4"
            actions={
                <>
                    {variants.length > 1 && <SingleSelect
                        options={variants}
                        size="small"
                        value={currentTemplate}
                        onChange={(variant) => setTemplate(variant)}
                    />}
                    <SingleSelect
                        options={locales}
                        size="small"
                        value={currentLocale}
                        onChange={(locale) => setLocale(locale)}
                    />
                    <LinkButton
                        to={`/projects/${campaign.project_id}/campaigns/${campaign.id}`}
                        size="small"
                        target="_blank"
                    >
                        {t('edit_campaign')}
                    </LinkButton>
                </>
            }
        />
        {currentTemplate && <Preview template={currentTemplate} />}
    </>
}

export const actionStep: JourneyStepType<ActionConfig> = {
    name: 'send',
    icon: <ActionStepIcon />,
    category: 'action',
    description: 'send_desc',
    Describe({
        project: { id: projectId },
        value: {
            campaign_id,
        },
    }) {
        const { t } = useTranslation()
        const [campaign] = useResolver(useCallback(async () => {
            if (campaign_id) {
                return await api.campaigns.get(projectId, campaign_id)
            }
            return null
        }, [projectId, campaign_id]))
        const template = campaign?.templates?.[0]

        return (
            <>
                <div className="journey-step-body-name">
                    <div className="journey-step-action-type">
                        {campaign && <ChannelIcon channel={campaign.channel} />}
                    </div>
                    {campaign?.name ?? <>&#8211;</>}
                </div>
                <div className="journey-step-action-preview">
                    { campaign && template
                        ? <Preview template={template} size="small" />
                        : (
                            <div className="journey-step-action-preview-placeholder">{t('journey_campaign_create_preview')}</div>
                        )}
                </div>
            </>
        )
    },
    newData: async () => ({
        campaign_id: 0,
    }),
    Edit({
        project: { id: projectId },
        onChange,
        value,
    }) {
        const [campaign] = useResolver(useCallback(async () => {
            if (value) {
                return await api.campaigns.get(projectId, value.campaign_id)
            }
            return null
        }, [projectId, value]))

        const { t } = useTranslation()
        return (
            <>
                <EntityIdPicker
                    label={t('campaign')}
                    subtitle={t('send_campaign_desc')}
                    get={useCallback(async id => await api.campaigns.get(projectId, id), [projectId])}
                    search={useCallback(async q => await api.campaigns.search(projectId, { q, limit: 50, filter: { type: 'trigger' } }), [projectId])}
                    value={value.campaign_id}
                    onChange={campaign_id => onChange({ ...value, campaign_id })}
                    required
                    createModalSize="large"
                    renderCreateForm={onCreated => (
                        <CampaignForm
                            type="trigger"
                            onSave={onCreated}
                        />
                    )}
                />

                {campaign && <TemplateContextProvider campaign={campaign} setCampaign={() => {}}>
                    <JourneyTemplatePreview campaign={campaign} />
                </TemplateContextProvider>}
            </>
        )
    },
    hasDataKey: true,
}
