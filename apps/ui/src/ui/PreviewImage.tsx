import { ReactNode, useRef, useState } from 'react'
import './PreviewImage.css'

interface PreviewImageProps {
    url: string
    width?: number
    height?: number
    iframeWidth?: number
    children?: ReactNode
}

export default function PreviewImage({
    url,
    width = 100,
    height = 100,
    iframeWidth = 600,
    children,
}: PreviewImageProps) {
    const ref = useRef<HTMLIFrameElement>(null)
    const iframeHeight = height * (iframeWidth / width)
    const [loaded, setLoaded] = useState(false)

    const handleLoad = (event: React.SyntheticEvent<HTMLIFrameElement, Event> | undefined) => {
        const state = (event?.target as any).contentWindow?.document.body.innerHTML.length > 0
        setLoaded(state)
    }

    return (
        <section className="preview-image" style={{ width, height }}>
            <iframe
                ref={ref}
                frameBorder="0"
                scrolling="no"
                src={url}
                width={iframeWidth}
                height={iframeHeight}
                style={{
                    transform: `scale(${width / iframeWidth})`,
                    display: loaded ? 'block' : 'none',
                }}
                onLoad={handleLoad} />
            {!loaded && children }
        </section>
    )
}
