module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        es2022: true
    },
    extends: [
        'standard'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        indent: ['error', 4],
        'padded-blocks:': 'off',
        'no-use-before-define': 'off'
    },
    globals: {
        NodeJS: true
    }
}
