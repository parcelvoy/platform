import { snakeToTitle } from '../../utils'
import TextInput from './TextInput'
import './SchemaFields.css'
import SwitchField from './SwitchField'

interface Schema {
    type: 'string' | 'number' | 'boolean' | 'object'
    properties?: Record<string, Schema>
    required?: string[]
}

interface SchemaProps {
    title?: string
    parent: string
    schema: Schema
    form: any
}

export default function SchemaFields({ title, parent, form, schema }: SchemaProps) {
    if (!schema?.properties) {
        return <></>
    }

    const props = schema.properties
    const keys = Object.keys(schema.properties)
    return <div className="ui-schema-form">
        {title && <h5>{snakeToTitle(title)}</h5>}
        <div className="ui-schema-fields">
            {keys.map(key => {
                const item = props[key]
                const required = schema.required?.includes(key)
                if (item.type === 'string' || item.type === 'number') {
                    return <TextInput.Field
                        key={key}
                        form={form}
                        name={`${parent}.${key}`}
                        label={snakeToTitle(key)}
                        required={required}
                    />
                } else if (item.type === 'boolean') {
                    return <SwitchField
                        key={key}
                        form={form}
                        name={`${parent}.${key}`}
                        label={snakeToTitle(key)}
                        required={required}
                    />
                } else if (item.type === 'object') {
                    return SchemaFields({ title: key, form, parent: `${parent}.${key}`, schema: item })
                }
                return 'no key'
            })}
        </div>
    </div>
}
