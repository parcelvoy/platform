const crypto = require('crypto')

exports.up = async function(knex) {
    await knex.schema.createTable('rules', function(table) {
        table.increments()
        table.integer('project_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('projects')
            .onDelete('CASCADE')
        table.string('uuid').index()
        table.string('root_uuid')
            .nullable()
            .references('uuid')
            .inTable('rules')
            .onDelete('CASCADE')
        table.string('parent_uuid')
            .nullable()
            .references('uuid')
            .inTable('rules')
            .onDelete('CASCADE')
        table.string('type').index()
        table.string('group').index()
        table.string('path')
        table.string('operator')
        table.string('value').index()
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
    })

    await knex.schema.createTable('rule_evaluations', function(table) {
        table.increments()
        table.integer('rule_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('rules')
            .onDelete('CASCADE')
        table.integer('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE')
        table.boolean('result')
        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())
        table.unique(['user_id', 'rule_id'])
    })

    await knex.schema.alterTable('lists', function(table) {
        table.integer('rule_id')
            .unsigned()
            .references('id')
            .inTable('rules')
            .onDelete('SET NULL')
            .after('rule')
    })

    const lists = await knex('lists').select('*')
    const decompile = (json) => {
        const rules = []
        const root_uuid = crypto.randomUUID()
        const build = ({ children, ...rule }) => {
            const newRule = {
                ...rule,
                project_id: 1,
            }
            rules.push(newRule)
            if (children) {
                for (const child of children) {
                    build({
                        ...child,
                        parent_uuid: newRule.uuid,
                        root_uuid,
                        uuid: crypto.randomUUID(),
                    })
                }
            }
        }
        build({ ...json, uuid: root_uuid })
        return rules
    }

    for (const list of lists) {
        const [rule, ...rules] = decompile(list.rule)
        if (rule) {
            const id = await knex('rules').insert(rule)
            if (rules && rules.length) await knex('rules').insert(rules)
            await knex('lists').where('id', list.id).update({ rule_id: id, rule: null })
        }
    }
}

exports.down = async function(knex) {
    await knex.schema.dropTable('rules')
    await knex.schema.dropTable('rule_evaluations')
}
