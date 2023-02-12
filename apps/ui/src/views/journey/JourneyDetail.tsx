import { useState, useContext } from 'react'
import { JourneyContext } from '../../contexts'
import Button from '../../ui/Button'
import PageContent from '../../ui/PageContent'
import JourneyEditor from './JourneyEditor'

export default function JourneyDetail() {

    const [journey] = useContext(JourneyContext)
    const [open, setOpen] = useState<null | 'edit-steps'>(null)

    return (
        <PageContent
            title={journey.name}
            actions={
                <Button onClick={() => setOpen('edit-steps')}>
                    Edit Journey Steps
                </Button>
            }
        >
            {
                open === 'edit-steps' && <JourneyEditor />
            }
        </PageContent>
    )
}
