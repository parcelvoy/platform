import jsonpath from 'jsonpath'
import Rule, { AnyJson } from './Rule'
import { RuleEvalException } from './RuleEngine'
import { compileTemplate } from '../render'
import { visit } from '../utilities'

export const queryValue = <T>(value: Record<string, unknown>, rule: Rule, cast: (item: any) => T): T[] => {
    let path = rule.path
    if (!value || !path) return []
    if (!path.startsWith('$.')) path = '$.' + path
    return jsonpath.query(value, path).map(v => cast(v))
}

// TODO: rule tree "compile step"... we shouldn't do this once per user
// it would be nice if JSON path also supported a parsed/compiled intermediate format too
export const compile = <Y>(rule: Rule, cast: (item: AnyJson) => Y): Y => {
    const value = rule.value
    if (!value) {
        throw new RuleEvalException(rule, 'value required for operator')
    }
    const compiledValue = typeof value === 'string' && value.includes('{')
        ? compileTemplate(value)({})
        : value
    return cast(compiledValue)
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

export const isEventWrapper = (rule: Rule) => {
    return rule.group === 'event'
        && (rule.path === '$.name' || rule.path === 'name')
}

export const getRuleEventNames = (rule: Rule) => {
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
