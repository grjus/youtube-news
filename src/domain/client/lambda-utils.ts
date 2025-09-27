import { APIGatewayProxyResult } from 'aws-lambda'

export const createdResponse = (message: string): APIGatewayProxyResult => {
    return {
        statusCode: 201,
        body: JSON.stringify({ message: `Created: ${message}` })
    }
}

export const conflictResponse = (message: string): APIGatewayProxyResult => {
    return {
        statusCode: 409,
        body: JSON.stringify({ message: `Conflict: ${message}` })
    }
}

export const badRequestResponse = (message: string): APIGatewayProxyResult => {
    return {
        statusCode: 400,
        body: JSON.stringify({ message: `Bad Request: ${message}` })
    }
}

export const assertNever = (x: never): never => {
    throw new Error(`Unexpected value: ${x}`)
}
