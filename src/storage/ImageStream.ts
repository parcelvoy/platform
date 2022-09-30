import { Context } from 'koa'
import Busboy from 'busboy'
import { Stream } from 'stream'
import { RequestError } from '../core/errors'
import StorageError from './StorageError'

export interface ImageStream {
    file: Stream
    fieldname: string
    filename: string
    size: number
}

export default function parse(ctx: Context): Promise<ImageStream> {
    return new Promise((resolve, reject) => {
        if (!ctx.is('multipart')) {
            reject(new RequestError(StorageError.BadFormType))
            return
        }

        const busboy = Busboy({
            headers: ctx.req.headers,
            limits: {
                files: 1, // Allow only a single upload at a time.
            },
        })

        busboy.once('file', onFile)
        busboy.once('error', onError)
        busboy.once('close', onClose)
        ctx.req.pipe(busboy)

        function cleanup() {
            busboy.removeListener('file', onFile)
            busboy.removeListener('error', onError)
            busboy.removeListener('close', onClose)
        }

        function onFile(fieldname: string, file: Stream, info: { filename: string, mimeType: string }) {
            cleanup()
            resolve({
                file,
                fieldname,
                filename: info.filename,
                size: parseInt(ctx.req.headers['content-length'] ?? '0'),
            })
        }

        function onError(error: Error) {
            cleanup()
            reject(error)
        }

        function onClose() {
            cleanup()
            reject(new RequestError(StorageError.NoFilesUploaded))
        }
    })
}
