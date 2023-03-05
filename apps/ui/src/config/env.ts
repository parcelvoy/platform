declare global {
    interface Window { API_BASE_URL: string }
}

export const env = {
    api: {
        baseURL: process.env.REACT_APP_API_BASE_URL ?? window.API_BASE_URL,
    },
}
