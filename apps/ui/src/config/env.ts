declare global {
    interface Window { API_BASE_URL: string }
}

export const env = {
    api: {
        baseURL: window.API_BASE_URL
            || (process.env.REACT_APP_API_BASE_URL ?? '/api'),
    },
}
