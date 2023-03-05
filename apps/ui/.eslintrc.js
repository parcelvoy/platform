const path = require('path')
module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'plugin:react/recommended',
        'standard-with-typescript',
    ],
    overrides: [
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: path.join(__dirname, 'tsconfig.json'),
    },
    plugins: [
        'react',
    ],
    rules: {
        indent: ['error', 4],
        'padded-blocks': 'off',
        camelcase: 'off',
        'no-use-before-define': 'off',
        'jsx-quotes': ['warn', 'prefer-double'],
        'comma-dangle': 'off',
        'space-before-function-paren': ['error', {
            anonymous: 'never',
            named: 'never',
            asyncArrow: 'always',
        }],
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        'operator-linebreak': ['error', 'before'],
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/space-before-function-paren': ['error', {
            anonymous: 'never', named: 'never', asyncArrow: 'always',
        }],
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/triple-slash-reference': 'off',
        'react/jsx-indent': ['error', 4],
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
    },
}
