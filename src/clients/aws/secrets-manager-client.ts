import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'

type SecretValue = Readonly<{
    YOUTUBE_API_KEY: string
    TRANSCRIPT_API_KEY: string
    WEBSUB_SECRET: string
    GEMINI_API_KEY: string
    BOT_API_KEY: string
}>

const client = new SecretsManagerClient()

export async function getSecretValue(secretName: string): Promise<SecretValue> {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: secretName
        })
    )
    if (!response.SecretString) {
        throw new Error(`Empty secret value for ${secretName}`)
    }
    return JSON.parse(response.SecretString) as SecretValue
}
