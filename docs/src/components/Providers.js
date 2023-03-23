import React from 'react'
import { useDocsSidebar } from '@docusaurus/theme-common/internal'
import Card from './Card'
import Cards from './Cards'

export default function Providers() {
    const sidebar = useDocsSidebar()
    const items = sidebar.items.filter((item) => item.label === 'Providers')[0].items

    return (
        <div className="providers">
            <Cards>
                {items.map((item) => <Card
                    image={`https://parcelvoy.com/${item.docId}.svg`}
                    key={item.docId}
                    title={item.label}
                    href={item.href}></Card>)}
            </Cards>
        </div>
    )
}