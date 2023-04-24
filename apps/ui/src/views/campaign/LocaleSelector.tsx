import { useContext } from 'react'
import { LocaleContext } from '../../contexts'
import { Campaign, UseStateContext } from '../../types'
import Button from '../../ui/Button'
import ButtonGroup from '../../ui/ButtonGroup'
import { SingleSelect } from '../../ui/form/SingleSelect'
import EditLocalesModal from './EditLocalesModal'

interface LocaleSelectorParams {
    campaignState: UseStateContext<Campaign>
    openState: UseStateContext<boolean>
}

export default function LocaleSelector({ campaignState, openState }: LocaleSelectorParams) {
    const [open, setOpen] = openState
    const [campaign, setCampaign] = campaignState

    const [{ currentLocale, allLocales }, setLocale] = useContext(LocaleContext)

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
                        {'View Locales'}
                    </Button>
                )
            }
        </ButtonGroup>
        <EditLocalesModal
            open={open}
            setIsOpen={setOpen}
            campaign={campaign}
            setCampaign={setCampaign} />
    </>
}
