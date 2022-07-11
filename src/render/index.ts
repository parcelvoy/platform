import Handlebars from 'handlebars'
import * as StrHelpers from './Helpers/String'
import { User } from '../models/User'

export interface Variables {
    user: User
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

export const flattenUser = (user: User) => {
    return { 
        ...user.data, 
        email: user.email, 
        phone: user.phone, 
        id: user.external_id
    }
}

export default (template: string, { user, event }: Variables) => {
    return Handlebars.compile(template)({
        user: flattenUser(user),
        event
    })
}