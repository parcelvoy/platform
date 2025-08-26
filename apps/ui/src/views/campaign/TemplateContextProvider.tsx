import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import { TemplateContext } from '../../contexts'
import { Campaign, LocaleOption, Template } from '../../types'
import { languageName } from '../../utils'
import { useSearchParams } from 'react-router'

export const localeOption = (locale: string): LocaleOption => {
    const language = languageName(locale)
    return {
        key: locale,
        label: language ? `${language} (${locale})` : locale,
        shortLabel: language ? `${language}` : locale,
    }
}

export const locales = (templates: Template[]) => {
    const locales = [...new Set(templates.map(item => item.locale))]
    return locales.map(locale => localeOption(locale))
}

interface TemplateContextProviderParams {
    children: ReactNode
    campaign: Campaign
    setCampaign: Dispatch<SetStateAction<Campaign>>
}

export const TemplateContextProvider = ({ campaign, setCampaign, children }: TemplateContextProviderParams) => {
    const { templates } = campaign
    const [template, setTemplate] = useState<Template | undefined>()
    const [searchParams] = useSearchParams()
    const templateId = searchParams.get('template')

    useEffect(() => {
        setTemplate(templates.find(t => `${t.id}` === templateId) ?? templates[0])
    }, [campaign.id, searchParams])

    const templateManager = {
        campaign,
        setCampaign,
        currentTemplate: template,
        templates,
        currentLocale: template?.locale ? localeOption(template?.locale) : undefined,
        locales: locales(templates),
        variants: templates.filter(t => t.locale === template?.locale),
        variantMap: templates.reduce<Record<string, Template[]>>((map, template) => {
            if (!map[template.locale]) {
                map[template.locale] = []
            }
            map[template.locale].push(template)
            return map
        }, {}),
        setTemplate,
        setLocale: (locale: LocaleOption | string | undefined) => {
            const key = typeof locale === 'string'
                ? locale
                : locale?.key
            const newTemplate = templates.find(t => t.locale === key)
            if (newTemplate) setTemplate(newTemplate)
        },
    }

    return (
        <TemplateContext.Provider value={templateManager}>
            {children}
        </TemplateContext.Provider>
    )
}
