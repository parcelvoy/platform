import Handlebars from 'handlebars'
import * as StrHelpers from './Helpers/String'
import * as NumHelpers from './Helpers/Number'
import * as UrlHelpers from './Helpers/Url'
import * as ArrayHelpers from './Helpers/Array'
import { User } from '../models/User'

export interface Variables {
    user: User
    event?: Record<string, any>
}

const loadHelper = (helper: Record<string, any>) => {
    const keys = Object.keys(helper)
    const values = Object.values(helper)
    for (const [i] of keys.entries()) {
        Handlebars.registerHelper(keys[i], values[i])
    }
}

loadHelper(StrHelpers)
loadHelper(NumHelpers)
loadHelper(UrlHelpers)
loadHelper(ArrayHelpers)

/**
 * Additional helpers that we should have:
 * 
 * lt
 * gt
 * lte
 * gte
 * defaultIfEmpty
 * replace
 * concat (use plus sign)
 * math - addition, subtraction, multiplication
 * ifContains - Check if array contains
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