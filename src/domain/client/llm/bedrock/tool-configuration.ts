import { ToolConfiguration, ToolInputSchema, ToolSpecification } from '@aws-sdk/client-bedrock-runtime'
import {
    POLITICS_RESPONSE_SCHEMA,
    SCIENCE_RESPONSE_SCHEMA,
    SOFTWARE_ENGINEERING_RESPONSE_SCHEMA,
    TINFOIL_RESPONSE_SCHEMA
} from '../response-schema'

const TINFOIL_SUMMARY_TOOL_NAME = 'tinfoil-summary-tool'
const SOFTWARE_ENGINEERING_SUMMARY_TOOL_NAME = 'software-engineering-summary-tool'
const POLITICS_SUMMARY_TOOL_NAME = 'politics-summary-tool'
const SCIENCE_SUMMARY_TOOL_NAME = 'science-summary-tool'

export const TINFOIL_SUMMARY_SPEC: ToolSpecification = {
    name: TINFOIL_SUMMARY_TOOL_NAME,
    inputSchema: {
        json: JSON.stringify(TINFOIL_RESPONSE_SCHEMA)
    } satisfies ToolInputSchema.JsonMember
}

export const SOFTWARE_ENGINEERING_SUMMARY_SPEC: ToolSpecification = {
    name: SOFTWARE_ENGINEERING_SUMMARY_TOOL_NAME,
    inputSchema: {
        json: JSON.stringify(SOFTWARE_ENGINEERING_RESPONSE_SCHEMA)
    } satisfies ToolInputSchema.JsonMember
}
export const POLITICS_SUMMARY_SPEC: ToolSpecification = {
    name: POLITICS_SUMMARY_TOOL_NAME,
    inputSchema: {
        json: JSON.stringify(POLITICS_RESPONSE_SCHEMA)
    } satisfies ToolInputSchema.JsonMember
}

export const SCIENCE_SUMMARY_SPEC: ToolSpecification = {
    name: SCIENCE_SUMMARY_TOOL_NAME,
    inputSchema: {
        json: JSON.stringify(SCIENCE_RESPONSE_SCHEMA)
    } satisfies ToolInputSchema.JsonMember
}

export const tinfoilSummaryToolConfiguration: ToolConfiguration = {
    tools: [
        {
            toolSpec: TINFOIL_SUMMARY_SPEC
        }
    ],
    toolChoice: {
        tool: {
            name: TINFOIL_SUMMARY_TOOL_NAME
        }
    }
}

export const softwareEngineeringSummaryToolConfiguration: ToolConfiguration = {
    tools: [
        {
            toolSpec: SOFTWARE_ENGINEERING_SUMMARY_SPEC
        }
    ],
    toolChoice: {
        tool: {
            name: SOFTWARE_ENGINEERING_SUMMARY_TOOL_NAME
        }
    }
}

export const politicsSummaryToolConfiguration: ToolConfiguration = {
    tools: [
        {
            toolSpec: POLITICS_SUMMARY_SPEC
        }
    ],
    toolChoice: {
        tool: {
            name: POLITICS_SUMMARY_TOOL_NAME
        }
    }
}

export const scienceSummaryToolConfiguration: ToolConfiguration = {
    tools: [
        {
            toolSpec: SCIENCE_SUMMARY_SPEC
        }
    ],
    toolChoice: {
        tool: {
            name: SCIENCE_SUMMARY_TOOL_NAME
        }
    }
}
