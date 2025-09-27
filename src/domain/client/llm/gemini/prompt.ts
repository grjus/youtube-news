import {
    POLITICS_SYSTEM_PROMPT_TEXT,
    SCIENCE_SYSTEM_PROMPT_TEXT,
    SOFTWARE_ENGINEERING_SYSTEM_PROMPT_TEXT,
    TINFOIL_SYSTEM_PROMPT_TEXT
} from '../prompts'
import { VideoGenre } from '../../../main-types'
import {
    POLITICS_RESPONSE_SCHEMA,
    SCIENCE_RESPONSE_SCHEMA,
    SOFTWARE_ENGINEERING_RESPONSE_SCHEMA,
    TINFOIL_RESPONSE_SCHEMA
} from '../response-schema'
import { assertNever } from '../../lambda-utils'

export const TINFOIL_SYSTEM_PROMPT = TINFOIL_SYSTEM_PROMPT_TEXT
export const SOFTWARE_ENGINEERING_SYSTEM_PROMPT = SOFTWARE_ENGINEERING_SYSTEM_PROMPT_TEXT
export const POLITICS_SYSTEM_PROMPT = POLITICS_SYSTEM_PROMPT_TEXT
export const SCIENCE_SYSTEM_PROMPT = SCIENCE_SYSTEM_PROMPT_TEXT

export const getGeminiSystemPrompt = (genre: Exclude<VideoGenre, 'ALARM'>) => {
    switch (genre) {
        case 'TINFOIL':
            return TINFOIL_SYSTEM_PROMPT
        case 'SOFTWARE_ENGINEERING':
            return SOFTWARE_ENGINEERING_SYSTEM_PROMPT
        case 'POLITICS':
            return POLITICS_SYSTEM_PROMPT
        case 'SCIENCE':
            return SCIENCE_SYSTEM_PROMPT
        default:
            return assertNever(genre)
    }
}
export const getGeminiResponseSchema = (genre: Exclude<VideoGenre, 'ALARM'>) => {
    switch (genre) {
        case 'TINFOIL':
            return TINFOIL_RESPONSE_SCHEMA
        case 'SOFTWARE_ENGINEERING':
            return SOFTWARE_ENGINEERING_RESPONSE_SCHEMA
        case 'POLITICS':
            return POLITICS_RESPONSE_SCHEMA
        case 'SCIENCE':
            return SCIENCE_RESPONSE_SCHEMA
        default:
            return assertNever(genre)
    }
}
