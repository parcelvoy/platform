const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function(app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: process.env.REACT_APP_PROXY_URL,
            changeOrigin: true,
        }),
    )
    app.use(
        '/unsubscribe',
        createProxyMiddleware({
            pathRewrite: (path) => {
                return path.replace('/unsubscribe', '/api/unsubscribe')
            },
            target: process.env.REACT_APP_PROXY_URL,
            changeOrigin: true,
        }),
    )
}
