import { ReactNode, useContext } from 'react'
import { Link } from 'react-router'
import { Tag } from '../../../ui'
import { Journey, List } from '../../../types'
import { ProjectContext } from '../../../contexts'

interface DelimitedItemParams {
    items?: any[]
    delimiter?: ReactNode
    mapper: (item: any) => { id: string | number, title: string, url: string }
}
const DelimitedItems = ({ items, delimiter = ' ', mapper }: DelimitedItemParams) => {
    if (!items || items?.length === 0) return <>&#8211;</>
    return <div className="tag-list">
        {items?.map<ReactNode>(
            item => {
                const { id, title, url } = mapper(item)
                return (
                    <Tag variant="plain" key={id}><Link to={url}>{title}</Link></Tag>
                )
            },
        )?.reduce((prev, curr) => prev ? [prev, delimiter, curr] : curr, '')}
    </div>
}

export const DelimitedJourneys = ({ journeys }: { journeys?: Journey[] }) => {
    const [project] = useContext(ProjectContext)
    return DelimitedItems({
        items: journeys,
        mapper: (journey) => ({
            id: journey.id,
            title: journey.name,
            url: `/projects/${project.id}/journeys/${journey.id}`,
        }),
    })
}

export const DelimitedLists = ({ lists }: { lists?: List[] }) => {
    const [project] = useContext(ProjectContext)
    return DelimitedItems({
        items: lists,
        mapper: (list) => ({
            id: list.id,
            title: list.name,
            url: `/projects/${project.id}/lists/${list.id}`,
        }),
    })
}
