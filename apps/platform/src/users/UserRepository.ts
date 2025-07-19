import { RuleTree } from '../rules/Rule'
import { ClientAliasParams, ClientIdentity } from '../client/Client'
import { PageParams } from '../core/searchParams'
import { RetryError } from '../queue/Job'
import { User, UserInternalParams } from '../users/User'
import { deepEqual, pick, uuid } from '../utilities'
import { getRuleEventParams } from '../rules/RuleHelpers'
import { UserEvent } from './UserEvent'
import { Context } from 'koa'
import { EventPostJob } from '../jobs'
import { Transaction } from '../core/Model'
import App from '../app'
import { Device, DeviceParams } from './Device'
import { getDeviceFromIdOrToken, markDevicesAsPushDisabled, userHasPushDevice } from './DeviceRepository'
import Project from '../projects/Project'

export const getUser = async (id: number, projectId?: number, trx?: Transaction): Promise<User | undefined> => {
    return await User.find(id, qb => {
        if (projectId) {
            qb.where('project_id', projectId)
        }
        return qb
    }, trx)
}

export const getUserFromContext = async (ctx: Context): Promise<User | undefined> => {
    return ctx.state.scope === 'secret'
        ? await getUserFromClientId(ctx.state.project.id, { external_id: ctx.params.userId })
        : await getUser(parseInt(ctx.params.userId), ctx.state.project.id)
}

export const getUsersFromIdentity = async (projectId: number, identity: ClientIdentity, trx?: Transaction) => {
    const externalId = `${identity.external_id}`
    const anonymousId = `${identity.anonymous_id}`

    const users = await User.all(
        qb => {
            qb.where(sqb => {
                if (identity.external_id) {
                    sqb.where('external_id', externalId)
                }
                if (identity.anonymous_id) {
                    sqb.orWhere('anonymous_id', anonymousId)
                }
            })
                .where('project_id', projectId)
                .limit(2)
            if (trx) {
                qb.forUpdate()
            }
            return qb
        },
        trx,
    )

    // Map each ID to a key so they are both available
    return {
        anonymous: users.find(user => user.anonymous_id === anonymousId),
        external: users.find(user => user.external_id === externalId),
    }
}

export const getUserFromClientId = async (projectId: number, identity: ClientIdentity, trx?: Transaction): Promise<User | undefined> => {
    const users = await getUsersFromIdentity(projectId, identity, trx)

    // There are circumstances in which both the external ID and
    // the anonymous ID match but match different records in
    // those cases, default to the one matching the external ID
    return users.external ?? users.anonymous
}

export const getUserFromPhone = async (projectId: number, phone: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('phone', phone)
            .where('project_id', projectId),
    )
}

export const getUserFromEmail = async (projectId: number, email: string): Promise<User | undefined> => {
    return await User.first(
        qb => qb.where('email', email)
            .where('project_id', projectId),
    )
}

export const pagedUsers = async (params: PageParams, projectId: number) => {
    return await User.search(
        {
            ...params,
            fields: ['external_id', 'email', 'phone'],
            mode: 'exact',
        },
        b => b.where('project_id', projectId),
    )
}

export const aliasUser = async (projectId: number, {
    external_id,
    anonymous_id,
    previous_id,
}: ClientAliasParams): Promise<User | undefined> => {

    // Previous is the one merging into userId
    const previous = await getUserFromClientId(projectId, {
        external_id: previous_id,
        anonymous_id,
    } as ClientIdentity)
    if (!previous) return

    // Look up if there is a separate profile with the new ID
    // If there is one, update that clients anonymous ID
    const current = await getUserFromClientId(projectId, {
        external_id,
    } as ClientIdentity)
    if (current) return

    return await User.updateAndFetch(previous.id, { external_id })
}

export const createUser = async (projectId: number, { external_id, anonymous_id, data, locale, created_at, ...fields }: UserInternalParams, trx?: Transaction) => {
    const project = await Project.find(projectId)
    const user = await User.insertAndFetch({
        project_id: projectId,
        anonymous_id: anonymous_id ?? uuid(),
        external_id,
        data: data ?? {},
        devices: [],
        locale: locale ?? project?.locale,
        created_at: created_at ? new Date(created_at) : new Date(),
        ...fields,
        version: Date.now(),
    }, trx)

    // Send user to ClickHouse as well
    await User.clickhouse().upsert(user)

    // Create an event for the user creation
    await EventPostJob.from({
        project_id: projectId,
        user_id: user.id,
        event: {
            name: 'user_created',
            external_id: user.external_id,
            anonymous_id,
            data: { ...data, ...fields, external_id, anonymous_id },
        },
    }).queue()

    return user
}

export const updateUser = async (existing: User, params: Partial<User>, anonymous?: User, trx?: Transaction): Promise<User> => {
    const { external_id, anonymous_id, data, ...fields } = params
    const hasChanges = isUserDirty(existing, params)
    if (hasChanges) {
        const after = await User.updateAndFetch(existing.id, {
            data: data ? { ...existing.data, ...data } : undefined,
            ...fields,
            ...!anonymous ? { anonymous_id } : {},
            version: Date.now(),
        }, trx)
        await User.clickhouse().upsert(after, existing)
        return after
    }
    return existing
}

export const deleteUser = async (projectId: number, externalId: string): Promise<void> => {
    const user = await getUserFromClientId(projectId, { external_id: externalId } as ClientIdentity)
    if (!user) return

    // Delete the user events from the database
    await UserEvent.delete(qb => qb.where('project_id', projectId)
        .where('user_id', user.id),
    )

    // Delete the user from the database
    await User.delete(qb => qb.where('project_id', projectId)
        .where('id', user.id),
    )

    // Delete the user from ClickHouse
    await User.clickhouse().delete('project_id = {projectId: UInt32} AND id = {id: UInt32}', {
        projectId,
        id: user.id,
    })

    // Delete the user events from ClickHouse
    await UserEvent.clickhouse().delete('project_id = {projectId: UInt32} AND user_id = {userId: UInt32}', {
        projectId,
        userId: user.id,
    })
}

export const saveDevice = async (projectId: number, { external_id, anonymous_id, ...params }: DeviceParams, trx?: Transaction): Promise<number | undefined> => {

    const user = await getUserFromClientId(projectId, { external_id, anonymous_id } as ClientIdentity, trx)
    if (!user) throw new RetryError()

    const { device_id, token } = params
    const device = await getDeviceFromIdOrToken(projectId, device_id, token, trx)

    // If we have a device, move it to the new user and update both users
    // in the DB to reflect their current push state
    if (device) {

        const oldParams = pick(device, ['os', 'os_version', 'model', 'app_build', 'app_version', 'token'])
        const newParams = pick(params, ['os', 'os_version', 'model', 'app_build', 'app_version', 'token'])

        // If nothing has changed on the device, just return the ID
        const isDirty = !deepEqual(oldParams, newParams) || device.user_id !== user.id
        if (!isDirty) return device.id

        // Update the device, combining the old and new params
        await Device.update(qb => qb.where('id', device.id), {
            ...oldParams,
            ...newParams,
            user_id: user.id,
        }, trx)

        // If this user had no previous push device, update the db
        if (!user.has_push_device && !!token) {
            await updateUserDeviceState(user, true, trx)
        }

        // Update the user we stole the device from
        const previousUser = await getUser(device.user_id, projectId, trx)
        const hasPushDevice = await userHasPushDevice(user.project_id, device.user_id, trx)
        if (previousUser) {
            await updateUserDeviceState(previousUser, hasPushDevice, trx)
        }

        return device.id
    } else {
        // If no device found, create a new one
        const newDevice = {
            ...params,
            project_id: projectId,
            device_id: device_id ?? uuid(),
            token,
            user_id: user.id,
        }
        const deviceId = await Device.insert(newDevice, trx)

        // If user previously had another device, no need to update
        if (user.has_push_device || !token) return deviceId
        await updateUserDeviceState(user, true, trx)

        return deviceId
    }
}

export const disableNotifications = async (user: User, tokens: string[]): Promise<boolean> => {

    await App.main.db.transaction(async (trx) => {

        // Wipe the token from all devices provided
        await markDevicesAsPushDisabled(user.project_id, tokens, trx)

        // Check if the user has any push devices left
        const hasPushDevice = await userHasPushDevice(user.project_id, user.id, trx)

        // If the push state has changed for a user, update the record
        if (hasPushDevice === user.has_push_device) return
        await updateUserDeviceState(user, hasPushDevice, trx)
    })
    return true
}

const updateUserDeviceState = async (user: User, hasPushDevice: boolean, trx?: Transaction): Promise<void> => {
    const after = await User.updateAndFetch(user.id, {
        has_push_device: hasPushDevice,
        version: Date.now(),
    }, trx)
    await User.clickhouse().upsert(after, user)
}

export const getUserEventsForRules = async (
    userId: number,
    rule: RuleTree,
) => {
    const params = getRuleEventParams(rule)
    if (!params.length) return []

    return UserEvent.all(
        qb => qb.where('user_id', userId)
            .where(eqb => {
                for (const { name, since } of params) {
                    eqb.orWhere(sbq =>
                        sbq.where('name', name)
                            .where('created_at', '>=', since ?? new Date(0)),
                    )
                }
            }),
    )
}

const isUserDirty = (existing: User, patch: Partial<User>) => {
    const newData = { ...existing.data, ...patch.data }
    const fields: Array<keyof UserInternalParams> = ['external_id', 'anonymous_id', 'email', 'phone', 'timezone', 'locale']
    const hasDataChanged = !deepEqual(existing.data, newData)
    const haveFieldsChanged = !deepEqual(pick(existing, fields), pick(patch, fields))
    return hasDataChanged || haveFieldsChanged
}
