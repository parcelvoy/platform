interface IframeProps {
    content: string
    fullHeight?: boolean
}

export default function Iframe({ content, fullHeight = true }: IframeProps) {
    const writeHTML = (frame: HTMLIFrameElement | null) => {
        if (!frame?.contentDocument || !frame?.contentWindow) {
            return
        }
        const doc = frame.contentDocument

        doc.open()
        doc.write(content)
        doc.close()

        if (fullHeight) {
            frame.style.height = `${frame.contentWindow.document.documentElement.scrollHeight}px`
        }
    }

    return (
        <iframe src="about:blank" scrolling="no" frameBorder="0" ref={writeHTML}
        />
    )
}
