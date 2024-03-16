module.exports = function override(config) {
    return {
        ...config,
        ignoreWarnings: [
            {
                message: /source-map-loader/,
                module: /node_modules\/rrule/,
            },
        ],
    }
}
