import toast from 'react-hot-toast'
import Button from './Button'
import { CopyIcon } from './icons'
import './CodeExample.css'
import { ReactNode } from 'react'
import Heading from './Heading'

interface CodeExampleProps {
    code: string
    title?: ReactNode
    description?: ReactNode
}

export default function CodeExample({ code, description, title }: CodeExampleProps) {

    const handleCopy = async (value: string) => {
        await navigator.clipboard.writeText(value)
        toast.success('Copied code sample')
    }

    return (
        <>
            {
                Boolean(title ?? description) && (
                    <Heading title={title} size="h4">
                        {description}
                    </Heading>
                )
            }
            <div className="code-example">
                <pre>
                    <code>
                        {code}
                    </code>
                </pre>
                <div className="copy-button">
                    <Button
                        icon={<CopyIcon />}
                        variant="secondary"
                        size="small"
                        onClick={async () => await handleCopy(code)}
                    />
                </div>
            </div>
        </>
    )
}
