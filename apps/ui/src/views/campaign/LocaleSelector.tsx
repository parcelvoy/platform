import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocaleContext } from '../../contexts'
import { Campaign, UseStateContext } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import { SingleSelect } from '../../ui/form/SingleSelect'
import CreateLocaleModal from './CreateLocaleModal'

interface LocaleSelectorParams {
    campaignState: UseStateContext<Campaign>
    openState: UseStateContext<boolean>
}

export default function LocaleSelector({ campaignState, openState }: LocaleSelectorParams) {
    const [open, setOpen] = openState
    const [campaign, setCampaign] = campaignState

    const navigate = useNavigate()
    const [{ currentLocale, allLocales }, setLocale] = useContext(LocaleContext)

    const handleCampaignCreate = (campaign: Campaign) => {
        setCampaign(campaign)
        if (campaign.templates.length === 1 && campaign.channel === 'email') {
            navigate('editor')
        }
    }

    return <>
        <ButtonGroup>
            {
                currentLocale && (
                    <SingleSelect
                        options={allLocales}
                        size="small"
                        value={currentLocale}
                        onChange={(currentLocale) => setLocale({ currentLocale, allLocales })}
                    />
                )
            }
            {
                campaign.state !== 'finished' && (
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setOpen(true)}
                    >
                        {'Add Locale'}
                    </Button>
                )
            }
        </ButtonGroup>
        <CreateLocaleModal
            open={open}
            setIsOpen={setOpen}
            campaign={campaign}
            setCampaign={handleCampaignCreate}
        />
    </>
}
