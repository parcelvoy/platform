import fs from 'fs/promises'
import path from 'path'
import { StorageTypeConfig } from './Storage'
import { ImageUploadTask, StorageProvider } from './StorageProvider'

export interface LocalConfig extends StorageTypeConfig {
    driver: 'local'
}

export class LocalStorageProvider implements StorageProvider {

    path(filename: string) {
        return path.join(process.cwd(), 'public', 'uploads', filename)
    }

    async upload(task: ImageUploadTask) {
        await fs.writeFile(
            task.url,
            task.stream,
        )
    }

    async delete(filename: string): Promise<void> {
        await fs.unlink(filename)
    }
}
