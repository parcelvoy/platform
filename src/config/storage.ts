import Storage, { StorageConfig } from '../storage/Storage'

export default (config: StorageConfig) => {
    return new Storage(config)
}
