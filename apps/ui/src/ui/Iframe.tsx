interface IframeProps {
    content: string
    fullHeight?: boolean
}

export default function Iframe({ content, fullHeight = false }: IframeProps) {
    const writeHTML = (frame: HTMLIFrameElement | null) => {
        if (!frame?.contentDocument || !frame?.contentWindow) {
            return
        }
        const doc = frame.contentDocument

        doc.open()
        doc.write(content)
        doc.close()

        if (fullHeight) {
            frame.style.minHeight = `${frame.contentWindow.document.documentElement.scrollHeight}px`
        }
    }

    return (
        <iframe
            src="about:blank"
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin"
            ref={writeHTML}
            style={{ width: '100%' }} />
    )
}
