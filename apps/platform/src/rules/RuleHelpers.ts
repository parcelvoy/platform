import jsonpath from 'jsonpath'
import { AnyJson, RuleTree } from './Rule'
import { compileTemplate } from '../render'
import { visit } from '../utilities'

export const queryValue = <T>(
    value: Record<string, unknown>,
    rule: RuleTree,
    cast: (item: any) => T = v => v,
): T[] => {
    let path = rule.path
    if (!value || !path) return []
    if (!path.startsWith('$.') && !path.startsWith('$[')) path = '$.' + path
    return jsonpath.query(value, path).map(v => cast(v))
}

// TODO: rule tree "compile step"... we shouldn't do this once per user
// it would be nice if JSON path also supported a parsed/compiled intermediate format too
export const compile = <Y>(rule: RuleTree, cast: (item: AnyJson) => Y): Y => {
    let value = rule.value as AnyJson
    if (typeof value === 'string' && value.includes('{')) {
        value = compileTemplate(value)({})
    }
    return cast(value)
}

export const reservedPaths = {
    user: [
        'external_id',
        'email',
        'phone',
        'timezone',
        'locale',
        'created_at',
    ],
    event: [
        'name',
        'created_at',
    ],
}

export const isEventWrapper = (rule: RuleTree) => {
    return rule.group === 'event'
        && (rule.path === '$.name' || rule.path === 'name')
}

export const getRuleEventNames = (rule: RuleTree) => {
    const names: string[] = []
    visit(rule, r => r.children, r => {
        if (isEventWrapper(r)) {
            const name = r.value
            if (typeof name === 'string' && !names.includes(name)) {
                names.push(name)
            }
        }
    })
    return names
}
