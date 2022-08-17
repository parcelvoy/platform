module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.ts'],
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
