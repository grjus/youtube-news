# Youtube News

Youtube News ingests YouTube WebSub notifications, enriches them with video metadata, and publishes summarised updates
to Telegram. The project is defined with AWS CDK in TypeScript and runs entirely on serverless services.

## What It Does

- Receives YouTube notifications through API Gateway and validates WebSub signatures.
- Stores notifications, videos, transcripts, summaries, and subscriptions in a single DynamoDB table.
- Pulls video details, transcribes content, generates AI summaries, and posts formatted messages to Telegram.
- Renew subscriptions automatically and handles live or upcoming videos with a scheduled poller.

## Architecture

API Gateway ➜ Lambda receivers ➜ DynamoDB ➜ Step Functions pipeline ➜ Telegram. Supporting pieces include EventBridge
for scheduled tasks, SQS for subscription renewals, SNS for alarms, and Secrets Manager for credentials.


