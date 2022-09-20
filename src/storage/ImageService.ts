// Handle upload
// Handle loading
// Methods for going from name to file
// Deletion
// Providers?

import App from '../app'
import Image from './Image'
import { ImageStream } from './ImageStream'

export const upload = async (stream: ImageStream): Promise<Image> => {
    const upload = await App.main.storage.upload(stream)
    return await Image.insertAndFetch(upload)
}
