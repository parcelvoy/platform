import { ReactNode } from 'react'
import { Operator, Preferences, Rule } from '../../../types'
import { GroupedRule, isEventWrapper, isWrapper, operatorTypes, trimPathDisplay } from './RuleHelpers'
import { formatDate } from '../../../utils'

export function ruleDescription(preferences: Preferences, rule: Rule | GroupedRule, nodes: ReactNode[] = [], wrapperOperator?: Operator): ReactNode {
    const root = nodes.length === 0
    if (isWrapper(rule)) {
        if (isEventWrapper(rule)) {
            if (!root) {
                nodes.push(
                    'has user done ',
                    <strong key={nodes.length}>
                        {rule.value ?? ''}
                    </strong>,
                )
            } else {
                nodes.push(
                    <strong key={nodes.length}>
                        {rule.value ?? ''}
                    </strong>,
                )
            }
            if (rule.children?.length) {
                nodes.push(' where ')
            }
        }
        if (rule.children?.length) {
            const grouped: GroupedRule[] = []
            for (const child of rule.children) {
                if (child.type === 'wrapper') {
                    grouped.push(child)
                    continue
                }
                const path = trimPathDisplay(child.path)
                const prev = grouped.find(g => trimPathDisplay(g.path) === path && g.operator === child.operator)
                if (prev) {
                    if (Array.isArray(prev.value)) {
                        prev.value.push(child.value ?? '')
                    } else {
                        prev.value = [prev.value ?? '', child.value ?? '']
                    }
                } else {
                    grouped.push({ ...child }) // copy so we don't modify original
                }
            }
            grouped.forEach((g, i) => {
                if (i > 0) {
                    nodes.push(', ')
                    if (wrapperOperator) {
                        nodes.push(rule.operator === 'and' ? 'and ' : 'or ')
                    }
                }
                ruleDescription(preferences, g, nodes, rule.operator)
            })
        }
        if (isEventWrapper(rule) && rule.frequency) {
            nodes.push(` ${rule.frequency.operator} ${rule.frequency.count} times`)
        }
    } else {
        if (rule.group === 'event' && (rule.path === '$.name' || rule.path === 'name')) {
            nodes.push('event ')
        }
        if (rule.group === 'user') {
            nodes.push('user property ')
        }

        nodes.push(
            <code key={nodes.length}>
                {trimPathDisplay(rule.path)}
            </code>,
        )

        nodes.push(' ' + (operatorTypes[rule.type]?.find(ot => ot.key === rule.operator)?.label ?? rule.operator))

        if (rule.operator !== 'empty' && rule.operator !== 'is set' && rule.operator !== 'is not set') {
            nodes.push(' ')
            const values = Array.isArray(rule.value) ? rule.value : [rule.value ?? '']
            values.forEach((value, i, a) => {
                if (i > 0) {
                    nodes.push(', ')
                    if (i === a.length - 1 && wrapperOperator) {
                        nodes.push(wrapperOperator === 'and' ? 'and ' : 'or ')
                    }
                }
                if (value.includes('{{')) {
                    nodes.push(
                        <code key={nodes.length}>
                            {value}
                        </code>,
                    )
                } else {
                    value = value.trim()
                    if (rule.type === 'boolean') value = 'true'
                    if (rule.type === 'number') {
                        try {
                            if (value.includes('.')) {
                                value = parseFloat(value).toLocaleString()
                            } else {
                                value = parseInt(value, 10).toLocaleString()
                            }
                        } catch {}
                    }
                    if (rule.type === 'date') {
                        try {
                            value = formatDate(preferences, value, 'Ppp')
                        } catch {}
                    }
                    nodes.push(
                        <strong key={nodes.length}>
                            {value}
                        </strong>,
                    )
                }
            })
        }
    }
    if (root) {
        return (
            <span className="rule-describe">
                {nodes}
            </span>
        )
    }
    return nodes
}
