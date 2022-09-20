import http from 'http'
import Busboy from 'busboy'
import { Stream } from 'stream'

export interface ImageStream {
    file: Stream
    filename: string
}

export default function parse(req: http.IncomingMessage): Promise<ImageStream> {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: req.headers,
            limits: {
                files: 1, // allow only a single upload at a time.
            },
        })

        busboy.once('file', onFile)
        busboy.once('error', onError)
        req.pipe(busboy)

        function cleanup() {
            busboy.removeListener('file', onFile)
            busboy.removeListener('error', onError)
        }

        function onFile(_: string, file: Stream, filename: string) {
            cleanup()
            resolve({ file, filename })
        }

        function onError(error: Error) {
            cleanup()
            reject(error)
        }
    })
}
