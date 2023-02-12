import NavLink from './NavLink'
import './Tabs.css'
import { Tab } from '@headlessui/react'
import { NavLinkProps } from 'react-router-dom'
import { Fragment, ReactNode } from 'react'
import clsx from 'clsx'

interface NavigationTabProps {
    tabs?: Array<NavLinkProps & { key: string }>
}

export function NavigationTabs({ tabs }: NavigationTabProps) {
    return (
        <div className="ui-tabs">
            {
                tabs?.map(({ key, ...props }) => (
                    <NavLink className="tab" {...props} key={key} end />
                ))
            }
        </div>
    )
}

interface TabType {
    children: ReactNode
    key: string
    label: ReactNode
}

interface TabProps {
    tabs: TabType[]
    append?: ReactNode
    selectedIndex?: number
    onChange?: (index: number) => void
}

export default function Tabs({ tabs, append, selectedIndex, onChange }: TabProps) {
    return (
        <Tab.Group selectedIndex={selectedIndex} onChange={onChange}>
            <Tab.List className="ui-tabs">
                {tabs.map(({ key, label }) => (
                    <Tab as={Fragment} key={key}>
                        {({ selected }) => (
                            <button className={clsx('tab', selected ? 'selected' : undefined)}>{label}</button>
                        )}
                    </Tab>
                ))}
                {append}
            </Tab.List>
            <Tab.Panels className="ui-tabs-panels">
                {tabs.map(({ key, children }) => <Tab.Panel className="panel" key={key}>{children}</Tab.Panel>)}
            </Tab.Panels>
        </Tab.Group>
    )
}
