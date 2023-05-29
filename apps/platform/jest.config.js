module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.ts'],
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/build',
    ],
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
}
