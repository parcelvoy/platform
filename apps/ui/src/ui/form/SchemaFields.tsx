import { snakeToTitle } from '../../utils'
import TextInput from './TextInput'
import './SchemaFields.css'
import SwitchField from './SwitchField'
import RadioInput from './RadioInput'

interface Schema {
    type: 'string' | 'number' | 'boolean' | 'object'
    enum?: string[]
    title?: string
    description?: string
    properties?: Record<string, Schema>
    required?: string[]
    minLength?: number
}

interface SchemaProps {
    title?: string
    description?: string
    parent: string
    schema: Schema
    form: any
}

export default function SchemaFields({ title, description, parent, form, schema }: SchemaProps) {
    if (!schema?.properties) {
        return <></>
    }

    const props = schema.properties
    const keys = Object.keys(schema.properties)
    return <div className="ui-schema-form">
        {title && <h5>{snakeToTitle(title)}</h5>}
        {description && <p>{description}</p> }
        <div className="ui-schema-fields">
            {keys.map(key => {
                const item = props[key]
                const required = schema.required?.includes(key)
                const title = item.title ?? snakeToTitle(key)
                if (item.enum) {
                    return <RadioInput.Field
                        key={key}
                        form={form}
                        name={`${parent}.${key}`}
                        label={title}
                        subtitle={item.description}
                        required={required}
                        options={item.enum.map((value: string) => ({ key: value, label: snakeToTitle(value) }))}
                    />
                } else if (item.type === 'string' || item.type === 'number') {
                    return <TextInput.Field
                        key={key}
                        form={form}
                        name={`${parent}.${key}`}
                        type={item.type === 'number' ? 'number' : 'text'}
                        label={title}
                        subtitle={item.description}
                        required={required}
                        textarea={(item.minLength ?? 0) >= 80}
                        minLength={item.minLength}
                    />
                } else if (item.type === 'boolean') {
                    return <SwitchField
                        key={key}
                        form={form}
                        name={`${parent}.${key}`}
                        label={title}
                        subtitle={item.description}
                        required={required}
                    />
                } else if (item.type === 'object') {
                    return <SchemaFields
                        key={key}
                        form={form}
                        title={title}
                        description={item.description}
                        parent={`${parent}.${key}`}
                        schema={item}
                    />
                }
                return 'no key'
            })}
        </div>
    </div>
}
