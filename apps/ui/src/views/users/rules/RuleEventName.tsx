import { Combobox } from '@headlessui/react'
import { Rule } from '../../../types'
import { highlightSearch, usePopperSelectDropdown } from '../../../ui/utils'
import { useContext } from 'react'
import { VariablesContext } from './RuleHelpers'
import { ButtonGroup } from '../../../ui'
import { ChevronUpDownIcon } from '../../../ui/icons'
import clsx from 'clsx'

export default function RuleEventName<T extends Rule>({ rule, setRule }: {
    rule: T
    setRule: (rule: T) => void
}) {
    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()

    const { suggestions } = useContext(VariablesContext)
    return (
        <Combobox onChange={(value: string) => setRule({ ...rule, value })}>
            <ButtonGroup>
                <span className="ui-text-input">
                    <Combobox.Input
                        value={rule.value ?? ''}
                        onChange={e => setRule({ ...rule, value: e.target.value })}
                        required
                        className="small"
                        ref={setReferenceElement}
                    />
                </span>
                <Combobox.Button className="ui-button secondary small">
                    <ChevronUpDownIcon />
                </Combobox.Button>
            </ButtonGroup>
            <Combobox.Options
                className="select-options nowheel"
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
            >
                {
                    Object.keys(suggestions.eventPaths)
                        .sort()
                        .filter(eventName => !rule.value || eventName.toLowerCase().startsWith(rule.value.toLowerCase()))
                        .map(eventName => (
                            <Combobox.Option
                                key={eventName}
                                value={eventName}
                                className={({ active, selected }) => clsx('select-option', active && 'active', selected && 'selected')}
                            >
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: highlightSearch(eventName, rule.value ?? ''),
                                    }}
                                />
                            </Combobox.Option>
                        ))
                }
            </Combobox.Options>
        </Combobox>
    )
}
