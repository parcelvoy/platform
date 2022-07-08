import Handlebars from 'handlebars'
import * as StrHelpers from './Helpers/String'

export interface TemplateUser {
    id: string
    email?: string
    phone?: string
}

export interface Variables {
    user: TemplateUser
    event?: Record<string, any>
}

const keys = Object.keys(StrHelpers)
const values = Object.values(StrHelpers)
for (const [i, v] of keys.entries()) {
    Handlebars.registerHelper(keys[i], values[i])
}

/**
 * Additional helpers that we should have:
 * 
 * lt
 * gt
 * lte
 * gte
 * defaultIfEmpty
 * replace
 * truncate
 * concat (use plus sign)
 * urlEncode
 * numberFormat - Take into account I18N | value, type (currency, percent), locale, digits, rounding mode
 * math - addition, subtraction, multiplication
 * join - Concatenate values in an array
 * ifContains - Check if array contains
 * first - First item in array
 * last - Last item in array
 * dateFormat - date, format (full, long, medium, short, string), tz
 * dateMath - date, math string | Operands +1y-1M+3w-17d+7h+1m-50s | "now" corresponds to current date <-- hate this, can we just use math?
 * now - current date
 */

export default (template: string, variables: Variables) => {
    return Handlebars.compile(template)(variables)
}