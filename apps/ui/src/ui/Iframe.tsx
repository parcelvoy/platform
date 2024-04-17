import { useEffect, useRef } from 'react'

interface IframeProps {
    content: string
    fullHeight?: boolean
}

export default function Iframe({ content, fullHeight = false }: IframeProps) {
    const ref = useRef<HTMLIFrameElement>(null)

    const setBody = () => {
        const frame = ref.current
        if (frame) {
            if (frame.contentDocument?.body) {
                frame.contentDocument.body.innerHTML = content
            }
            if (fullHeight) {
                frame.style.minHeight = `${frame.contentWindow?.document.documentElement.scrollHeight}px`
            }
        }
    }

    useEffect(() => setBody(), [content])

    return (
        <iframe
            src="about:blank"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin"
            ref={ref}
            style={{ width: '100%' }}
            onLoad={() => setBody()} />
    )
}
