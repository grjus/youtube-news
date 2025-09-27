import { ContentBlock, SystemContentBlock } from '@aws-sdk/client-bedrock-runtime'
import {
    getPrompt,
    POLITICS_SYSTEM_PROMPT_TEXT,
    SCIENCE_SYSTEM_PROMPT_TEXT,
    SOFTWARE_ENGINEERING_SYSTEM_PROMPT_TEXT,
    TINFOIL_SYSTEM_PROMPT_TEXT
} from '../prompts'
import { VideoGenre } from '../../../main.types'
import {
    politicsSummaryToolConfiguration,
    scienceSummaryToolConfiguration,
    softwareEngineeringSummaryToolConfiguration,
    tinfoilSummaryToolConfiguration
} from './tool.configuration'
import { assertNever } from '../../lambda.utils'

export const TINFOIL_BEDROCK_SYSTEM_PROMPT: SystemContentBlock[] = [
    {
        text: `
<content>
${TINFOIL_SYSTEM_PROMPT_TEXT}
</content>
`
    }
]

export const SOFTWARE_ENGINEERING_BEDROCK_SYSTEM_PROMPT: SystemContentBlock[] = [
    {
        text: `
<content>
${SOFTWARE_ENGINEERING_SYSTEM_PROMPT_TEXT}
</content>
`
    }
]

export const POLITICS_BEDROCK_SYSTEM_PROMPT: SystemContentBlock[] = [
    {
        text: `
<content>
${POLITICS_SYSTEM_PROMPT_TEXT}
</content>
`
    }
]

export const SCIENCE_BEDROCK_SYSTEM_PROMPT: SystemContentBlock[] = [
    {
        text: `
<content>
${SCIENCE_SYSTEM_PROMPT_TEXT}
</content>
`
    }
]

export const getSummaryPromptContentBlock = (
    genre: Exclude<VideoGenre, 'ALARM'>,
    transcription: string
): ContentBlock[] => {
    const prompt = getPrompt(genre, transcription)

    return [
        {
            text: `
<content>
${prompt}
</content>`
        }
    ]
}

export const getBedrockToolConfiguration = (genre: Exclude<VideoGenre, 'ALARM'>) => {
    switch (genre) {
        case 'TINFOIL':
            return tinfoilSummaryToolConfiguration
        case 'SOFTWARE_ENGINEERING':
            return softwareEngineeringSummaryToolConfiguration
        case 'POLITICS':
            return politicsSummaryToolConfiguration
        case 'SCIENCE':
            return scienceSummaryToolConfiguration
        default:
            return assertNever(genre)
    }
}

export const getBedrockSystemPrompt = (genre: Exclude<VideoGenre, 'ALARM'>) => {
    switch (genre) {
        case 'TINFOIL':
            return TINFOIL_BEDROCK_SYSTEM_PROMPT
        case 'SOFTWARE_ENGINEERING':
            return SOFTWARE_ENGINEERING_BEDROCK_SYSTEM_PROMPT
        case 'POLITICS':
            return POLITICS_BEDROCK_SYSTEM_PROMPT
        case 'SCIENCE':
            return SCIENCE_BEDROCK_SYSTEM_PROMPT
        default:
            return assertNever(genre)
    }
}
