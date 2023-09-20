import { useCallback, useContext } from 'react'
import { JourneyContext, ProjectContext } from '../../contexts'
import { SearchTable, useSearchTableQueryState } from '../../ui/SearchTable'
import api from '../../api'

export default function JourneyUserEntrances() {

    const [project] = useContext(ProjectContext)
    const [journey] = useContext(JourneyContext)

    const projectId = project.id
    const journeyId = journey.id

    const state = useSearchTableQueryState(useCallback(async params => await api.journeys.entrances.search(projectId, journeyId, params), [projectId, journeyId]))

    return (
        <SearchTable
            {...state}
            columns={[
                {
                    key: 'user.external_id',
                },
            ]}
        />
    )
}
