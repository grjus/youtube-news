import { getGeminiSystemPrompt } from '../../src/domain/client/llm/gemini/prompt'
import {
    getBedrockSystemPrompt,
    ON_DEMAND_BASE_BEDROCK_SYSTEM_PROMPT,
    ON_DEMAND_BEDROCK_SYSTEM_PROMPT
} from '../../src/domain/client/llm/bedrock/prompt'
import { ON_DEMAND_SYSTEM_PROMPT } from '../../src/domain/client/llm/gemini/prompt'

test('getGeminiSystemPrompt returns default ON_DEMAND prompt when no instruction provided', () => {
    const result = getGeminiSystemPrompt('ON_DEMAND')
    expect(result).toBe(ON_DEMAND_SYSTEM_PROMPT)
})

test('getGeminiSystemPrompt returns default ON_DEMAND prompt when instruction is empty', () => {
    const result = getGeminiSystemPrompt('ON_DEMAND', '')
    expect(result).toBe(ON_DEMAND_SYSTEM_PROMPT)
})

test('getGeminiSystemPrompt returns default ON_DEMAND prompt when instruction is whitespace only', () => {
    const result = getGeminiSystemPrompt('ON_DEMAND', '   ')
    expect(result).toBe(ON_DEMAND_SYSTEM_PROMPT)
})

test('getGeminiSystemPrompt returns minimal prompt when user instruction is provided', () => {
    const result = getGeminiSystemPrompt('ON_DEMAND', 'focus on AI topics')
    expect(result).not.toBe(ON_DEMAND_SYSTEM_PROMPT)
    expect(result).toBe('You are a helpful assistant.')
})

test('getBedrockSystemPrompt returns default ON_DEMAND prompt when no instruction provided', () => {
    const result = getBedrockSystemPrompt('ON_DEMAND')
    expect(result).toBe(ON_DEMAND_BEDROCK_SYSTEM_PROMPT)
})

test('getBedrockSystemPrompt returns default ON_DEMAND prompt when instruction is empty', () => {
    const result = getBedrockSystemPrompt('ON_DEMAND', '')
    expect(result).toBe(ON_DEMAND_BEDROCK_SYSTEM_PROMPT)
})

test('getBedrockSystemPrompt returns default ON_DEMAND prompt when instruction is whitespace only', () => {
    const result = getBedrockSystemPrompt('ON_DEMAND', '   ')
    expect(result).toBe(ON_DEMAND_BEDROCK_SYSTEM_PROMPT)
})

test('getBedrockSystemPrompt returns minimal prompt when user instruction is provided', () => {
    const result = getBedrockSystemPrompt('ON_DEMAND', 'summarize in Polish')
    expect(result).toBe(ON_DEMAND_BASE_BEDROCK_SYSTEM_PROMPT)
    expect(result).not.toBe(ON_DEMAND_BEDROCK_SYSTEM_PROMPT)
})
