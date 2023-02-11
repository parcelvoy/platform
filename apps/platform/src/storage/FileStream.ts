import { Context } from 'koa'
import Busboy from 'busboy'
import { Stream } from 'stream'
import { RequestError } from '../core/errors'
import StorageError from './StorageError'

export interface FileMetadata {
    fieldName: string
    fileName: string
    mimeType: string
    size: number
}

export interface FileStream {
    file: Stream
    metadata: FileMetadata
}

export default function parse(ctx: Context): Promise<FileStream> {
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

        function onFile(fieldName: string, file: Stream, info: { filename: string, mimeType: string }) {
            cleanup()
            resolve({
                file,
                metadata: {
                    fieldName,
                    fileName: info.filename,
                    mimeType: info.mimeType,
                    size: parseInt(ctx.req.headers['content-length'] ?? '0'),
                },
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
