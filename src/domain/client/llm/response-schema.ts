export const TINFOIL_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: {
            type: 'array',
            description: 'List of bullet points  summarizing the transcript. Text must be in Polish.',
            minItems: 1,
            maxItems: 5,
            items: {
                type: 'string',
                description: 'Bullet point with summary. Polish only.'
            }
        },
        shortSummary: {
            type: 'string',
            description: 'Short summary (transcription keypoint) in one sentence, Polish only.'
        },
        absurdityLevel: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Level of absurdity on a scale from 1 (not absurd) to 10 (extremely absurd).'
        }
    }
} as const

export const SOFTWARE_ENGINEERING_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: {
            type: 'array',
            description: 'List of short bullet points summarizing the transcript.',
            minItems: 1,
            maxItems: 4,
            items: { type: 'string' }
        },
        shortSummary: {
            type: 'string',
            description: 'One-sentence key point.'
        },
        topics: {
            type: 'array',
            description: 'Key topics discussed (e.g., testing, CI/CD, microservices, performance).',
            items: { type: 'string' }
        },
        technologies: {
            type: 'array',
            description: 'Frameworks/libraries/tools mentioned (e.g., React, NestJS, Kubernetes).',
            items: { type: 'string' }
        },
        codePresent: {
            type: 'boolean',
            description: 'Whether code snippets/demos appear in the video.'
        },
        languagesMentioned: {
            type: 'array',
            description: 'Programming languages explicitly mentioned.',
            items: {
                type: 'string',
                enum: [
                    'typescript',
                    'javascript',
                    'python',
                    'go',
                    'rust',
                    'java',
                    'kotlin',
                    'csharp',
                    'bash',
                    'sql',
                    'other'
                ]
            }
        },
        difficulty: {
            type: 'string',
            description: 'Overall technical depth.',
            enum: ['beginner', 'intermediate', 'advanced']
        },
        audience: {
            type: 'string',
            description: 'Primary audience.',
            enum: ['frontend', 'backend', 'fullstack', 'devops', 'ml', 'mobile', 'data', 'qa', 'general']
        }
    },
    required: [
        'summary',
        'shortSummary',
        'topics',
        'technologies',
        'codePresent',
        'languagesMentioned',
        'difficulty',
        'audience'
    ]
} as const

export const POLITICS_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: {
            type: 'array',
            description: 'List of short paragraphs summarizing the transcript. Text must be in Polish.',
            minItems: 1,
            maxItems: 8,
            items: {
                type: 'string',
                description: 'Bullet point with summary. Polish only.'
            }
        },
        shortSummary: {
            type: 'string',
            description: 'One-sentence key point, Polish only.'
        },
        keyActors: {
            type: 'array',
            description: 'Main people/parties/institutions mentioned, Polish names; Polish text.',
            items: { type: 'string' }
        },
        mainIssues: {
            type: 'array',
            description: 'Key political issues/topics discussed, Polish text.',
            items: { type: 'string' }
        },
        tone: {
            type: 'string',
            enum: ['neutralny', 'krytyczny', 'popierający', 'emocjonalny', 'technokratyczny'],
            description: 'Dominant tone of the material (Polish enum values).'
        },
        impactAssessment: {
            type: 'string',
            description: '1–2 sentences assessing potential political/social impact, Polish only.'
        }
    },
    required: ['summary', 'shortSummary', 'keyActors', 'mainIssues', 'tone', 'impactAssessment']
} as const

export const SCIENCE_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        summary: {
            type: 'array',
            description:
                'List of 2–5 bullet points summarizing the scientific transcript. Each item must be concise and factual.',
            minItems: 2,
            maxItems: 5,
            items: {
                type: 'string',
                description: 'A single bullet point summary (1–2 sentences).'
            }
        },
        shortSummary: {
            type: 'string',
            description: 'One-sentence summary capturing the main idea of the transcript.'
        },
        keywords: {
            type: 'array',
            description: 'Key scientific terms or concepts mentioned in the transcript.',
            minItems: 3,
            maxItems: 7,
            items: {
                type: 'string',
                description: 'A single keyword or scientific term.'
            }
        },
        complexityLevel: {
            type: 'string',
            description: 'Indicates the difficulty level of the scientific material.',
            enum: ['basic', 'intermediate', 'advanced']
        }
    },
    required: ['summary', 'shortSummary']
} as const
