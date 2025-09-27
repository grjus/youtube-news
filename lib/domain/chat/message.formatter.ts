import {
    AcceptableLlmResponse,
    PoliticsSummaryResults,
    ScienceSummaryResults,
    SoftwareEngineeringSummaryResults,
    TinfoilSummaryResults,
    VideoSummary
} from '../main.types'
import { assertNever } from '../client/lambda.utils'

export const toTinfoilMarkdown = (message: VideoSummary<TinfoilSummaryResults>) => {
    const { shortSummary, absurdityLevel, summary } = message.summary

    return `
<b>&#128293; ${message.channelTitle} &#128293;</b>
<b>${message.videoTitle}</b>

<b>TL;DR</b>
${shortSummary}

<b>W dzisiejszym odcinku</b>
${summary.join('\n\n')}

<b>&#128541; Poziom odklejki:</b> ${absurdityLevel}/10

https://youtu.be/${message.videoId}
    `
}

const toSoftwareEngineeringMarkdown = (message: VideoSummary<SoftwareEngineeringSummaryResults>) => {
    const { shortSummary, topics, summary, technologies, codePresent, languagesMentioned, difficulty, audience } =
        message.summary

    return `
<b>&#128293; ${message.channelTitle} &#128293;</b>
<b>${message.videoTitle}</b>

<b>TL;DR</b>
${shortSummary}
<b>&#128073; Topics</b>
${topics.join(', ')}
<b>&#128073; Technologies</b>
${technologies.join(', ')}
<b>&#128073; Code samples avaiable ?</b>
${codePresent ? 'YES' : 'NO'}
<b>&#128073; Languages mentioned</b>
${languagesMentioned.join(', ')}
<b>&#128073; Difficulty</b>
${difficulty}
<b>&#128073; Audience</b>
${audience}

<b>&#128052; Summary</b>
${summary.join('\n\n')}

https://youtu.be/${message.videoId}
    `
}

const toPoliticsMarkdown = (message: VideoSummary<PoliticsSummaryResults>) => {
    const { shortSummary, summary, keyActors, mainIssues, tone, impactAssessment } = message.summary

    return `
<b>&#128293; ${message.channelTitle} &#128293;</b>
<b>${message.videoTitle}</b>

<b>TL;DR</b>
${shortSummary}

<b>Podsumowanie</b>
${summary.join('\n\n')}

<b>&#129333; </b> ${keyActors.join(', ')}
<b>&#128204; Główne tematy: </b> ${mainIssues.join(', ')}
<b>&#x1F4C8; Ton wypowiedzi: </b> ${tone}

<b>Wnioski końcowe</b>
<i>${impactAssessment}</i>

https://youtu.be/${message.videoId}
    `
}

const toScienceMarkdown = (message: VideoSummary<ScienceSummaryResults>) => {
    const { shortSummary, summary, keywords, complexityLevel } = message.summary

    return `
<b>&#128293; ${message.channelTitle} &#128293;</b>
<b>${message.videoTitle}</b>

<b>TL;DR</b>
${shortSummary}

<b>Summary</b>
${summary.join('\n\n')}

<b>&#128204; Main topics: </b> ${keywords.join(', ')}
<b>&#x1F4C8; Complexity level: </b> ${complexityLevel}

https://youtu.be/${message.videoId}
    `
}

export const toChatMessageMarkdown = (message: VideoSummary<AcceptableLlmResponse>) => {
    switch (message.genre) {
        case 'TINFOIL':
            return toTinfoilMarkdown(message as VideoSummary<TinfoilSummaryResults>)
        case 'SOFTWARE_ENGINEERING':
            return toSoftwareEngineeringMarkdown(message as VideoSummary<SoftwareEngineeringSummaryResults>)
        case 'POLITICS':
            return toPoliticsMarkdown(message as VideoSummary<PoliticsSummaryResults>)
        case 'SCIENCE':
            return toScienceMarkdown(message as VideoSummary<ScienceSummaryResults>)

        default:
            return assertNever(message.genre)
    }
}

export const toAlarmMessage = (message: string) => {
    return `
    <pre>
    ${message}
    </pre>
    `
}
