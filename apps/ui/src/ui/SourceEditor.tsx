import { useState } from 'react'
import MEditor, { Monaco, EditorProps } from '@monaco-editor/react'
import { editor as Editor } from 'monaco-editor'
import './SourceEditor.css'

export interface SourceEditorProps extends EditorProps {
    onMount?: (editor: Editor.IStandaloneCodeEditor, instance: Monaco) => void
}

export default function SourceEditor({ onMount, ...props }: SourceEditorProps) {

    const [monaco, setMonaco] = useState<Editor.IStandaloneCodeEditor | undefined>()

    function handleMount(editor: Editor.IStandaloneCodeEditor, instance: Monaco) {
        instance.editor.defineTheme('default', {
            base: 'vs-dark',
            inherit: true,
            rules: [{
                background: '#0d121e',
                token: '',
            }],
            colors: {
                'editor.background': '#0d121e',
            },
        })
        instance.editor.setTheme('default')
        if (!monaco) setMonaco(editor)
        onMount?.(editor, instance)
    }

    return (
        <MEditor
            {...props}
            onMount={handleMount}
            options={{ wordWrap: 'on' }}
        />
    )
}
