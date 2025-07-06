import '@maily-to/core/style.css'
import './MailyEditor.css'

import { useContext, useState } from 'react'
import { Editor } from '@maily-to/core'
import { text, heading1, heading2, heading3, bulletList, image, columns, section, divider, button, spacer } from '@maily-to/core/blocks'
import { ImageUploadExtension, VariableExtension, getVariableSuggestions } from '@maily-to/core/extensions'
import type { Editor as TiptapEditor, JSONContent } from '@tiptap/core'
import { Resource, Template } from '../../../types'
import { VariablesContext } from '../../users/rules/RuleHelpers'
import api from '../../../api'
import { ProjectContext } from '../../../contexts'

interface MailyEditorProps {
    template: Template
    setTemplate: (template: Template) => void
    resources: Resource[]
}

export default function MailyEditor({ template, setTemplate }: MailyEditorProps) {
    const [project] = useContext(ProjectContext)
    const contentJson = template.data.maily_json as JSONContent
    const [_, setEditor] = useState<TiptapEditor>()
    const { suggestions } = useContext(VariablesContext)

    const variables = (suggestions?.userPaths ?? []).map(variable => ({
        name: 'user' + variable.path.replace('$.', '.').replace('$[', '['),
    }))

    const handleUpdate = (editor: TiptapEditor) => {
        setEditor(editor)
        setTemplate({
            ...template,
            data: {
                ...template.data,
                maily_json: editor.getJSON(),
            },
        })
        console.log(editor.getJSON())
    }

    return (
        <Editor
            contentJson={contentJson}
            onCreate={setEditor}
            onUpdate={handleUpdate}
            blocks={[
                {
                    title: 'Blocks',
                    commands: [text, heading1, heading2, heading3, bulletList, image, columns, section, divider, button, spacer],
                },

            ]}
            config={{
                hasMenuBar: false,
                toolbarClassName: 'maily-editor-toolbar',
                contentClassName: 'maily-editor-content',
                bodyClassName: 'maily-editor-body',
            }}
            extensions={[
                ImageUploadExtension.configure({
                    onImageUpload: async (blob) => {
                        const file = new File([blob], 'image.jpg', {
                            type: blob.type,
                            lastModified: new Date().getTime(), // Optional: Set last modified date
                        })
                        const upload = await api.images.create(project.id, file)
                        console.log(upload.url)
                        return upload.url
                    },
                }),
                VariableExtension.configure({
                    suggestion: getVariableSuggestions('{{'),
                    variables: ({ query, from }) => {
                        // magic goes here
                        // query: the text after the trigger character
                        // from: the context from where the variables are requested (repeat, variable)
                        // editor: the editor instance
                        if (from === 'repeat-variable') {
                        // return variables for the Repeat block `each` key
                            return [
                                { name: 'notifications' },
                                { name: 'comments' },
                            ]
                        }

                        if (query) {
                            let search = query.toLowerCase()
                            if (search.startsWith('.')) search = '$' + search
                            if (!search.startsWith('$.')) search = '$.' + search
                            return variables.filter(p => p.name.toLowerCase().startsWith(search))
                        }

                        return variables
                    },
                }),
            ]}
        />
    )
}
