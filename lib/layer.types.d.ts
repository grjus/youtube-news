declare module 'axios-client' {
    import type { AxiosRequestConfig, AxiosResponse } from 'axios'

    export const get: <T = any>(url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>

    export const post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>
}

declare module 'gemini-client' {
    import { Batches, Caches, Chats, Files, GoogleGenAIOptions, Live, Models, Operations, Tokens } from '@google/genai'

    export class GoogleGenAI {
        readonly vertexai: boolean
        readonly models: Models
        readonly live: Live
        readonly batches: Batches
        readonly chats: Chats
        readonly caches: Caches
        readonly files: Files
        readonly operations: Operations
        readonly authTokens: Tokens
        readonly tunings: any
        protected readonly apiClient: any
        private readonly apiKey?
        private readonly googleAuthOptions?
        private readonly project?
        private readonly location?
        private readonly apiVersion?

        constructor(options: GoogleGenAIOptions)
    }
}
