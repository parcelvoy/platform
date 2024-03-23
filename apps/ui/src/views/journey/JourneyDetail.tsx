import { useState, useContext } from 'react'
import { JourneyContext } from '../../contexts'
import Button from '../../ui/Button'
import PageContent from '../../ui/PageContent'
import JourneyEditor from './JourneyEditor'
import { useTranslation } from 'react-i18next'

export default function JourneyDetail() {

    const { t } = useTranslation()
    const [journey] = useContext(JourneyContext)
    const [open, setOpen] = useState<null | 'edit-steps'>(null)

    return (
        <PageContent
            title={journey.name}
            actions={
                <Button onClick={() => setOpen('edit-steps')}>{t('edit_journey_steps')}</Button>
            }
        >
            {
                open === 'edit-steps' && <JourneyEditor />
            }
        </PageContent>
    )
}
