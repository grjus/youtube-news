const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')

const tsOverrideConfig = tsPlugin.configs['eslint-recommended'].overrides[0]
const tsRecommendedConfig = tsPlugin.configs.recommended
const files = ['**/*.ts']
const ignores = ['**/*.js', '**/*.d.ts', 'node_modules/**', 'cdk.out']

module.exports = [
    { ignores },
    {
        files,
        linterOptions: {
            reportUnusedDisableDirectives: true
        },
        languageOptions: {
            parser: tsParser
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            ...tsOverrideConfig.rules,
            ...tsRecommendedConfig.rules,
            '@typescript-eslint/no-unused-vars': 'warn'
        }
    }
]
