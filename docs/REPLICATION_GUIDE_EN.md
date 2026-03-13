# 🚀 Lambda-Cron — Spike Replication Guide

> Step-by-step guide to create scheduled Lambda functions (cron jobs) and HTTP endpoints with Serverless Framework v3, TypeScript, and GitHub Actions.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Project Initialization](#4-project-initialization)
5. [Folder Structure](#5-folder-structure)
6. [serverless.yml Configuration](#6-serverlessyml-configuration)
7. [AWS IAM Configuration](#7-aws-iam-configuration)
8. [GitHub Actions Setup](#8-github-actions-setup)
9. [Local Development](#9-local-development)
10. [Deployment & Monitoring](#10-deployment--monitoring)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Overview

This project is a **spike/proof-of-concept** demonstrating how to:

- **Schedule Lambda functions (cron jobs)** using EventBridge/CloudWatch Events
- **Create HTTP endpoints** triggered manually via API Gateway
- **Automate CI/CD** with GitHub Actions using OIDC authentication (no AWS access keys needed)

Each Lambda function lives in its own folder under `src/lambdas/` and deploys independently.

---

## 2. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **AWS Lambda** | - | Serverless function execution |
| **Amazon EventBridge** | - | Cron job scheduling |
| **Amazon API Gateway** | - | HTTP endpoints for manual triggers |
| **Serverless Framework** | v3.40.0 | Infrastructure deployment framework |
| **Node.js** | 20.x | Runtime |
| **TypeScript** | ^5.7.0 | Programming language |
| **esbuild** | ^0.27.4 | Bundler/compiler (via serverless-esbuild plugin) |
| **serverless-esbuild** | ^1.57.0 | Plugin to integrate esbuild with Serverless v3 |
| **serverless-offline** | v13.9.0 | Local development and testing |
| **GitHub Actions** | - | CI/CD with OIDC for AWS |

> **Important note**: Serverless Framework v3 requires the `serverless-esbuild` plugin to compile TypeScript. The esbuild configuration is defined in the `custom.esbuild` section of `serverless.yml`.

---

## 3. Prerequisites

Before starting, make sure you have:

- [ ] **AWS account** with admin or IAM permissions
- [ ] **Node.js 20** installed (`node --version`)
- [ ] **npm** as package manager
- [ ] **GitHub repository** for the project

### Install Node.js 20

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
```

---

## 4. Project Initialization

### 4.1. Create the project

```bash
mkdir lambda-cron
cd lambda-cron
npm init -y
```

### 4.2. Install dependencies

```bash
npm install --save-dev \
  serverless@^3.0.0 \
  serverless-esbuild@^1.0.0 \
  serverless-offline@^13.0.0 \
  typescript@^5.7.0 \
  esbuild@^0.27.0 \
  @types/node@^22.0.0
```

### 4.3. Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4.4. Create `package.json` scripts

```json
{
  "scripts": {
    "dev": "serverless offline",
    "lint": "eslint src/",
    "test": "jest"
  }
}
```

### 4.5. Create `.gitignore`

```
# Logs
logs
*.log

# Dependencies
node_modules/

# Build output
dist/
.esbuild/
.serverless/

# Environment variables
.env

# OS
.DS_Store
```

---

## 5. Folder Structure

```
lambda-cron/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   └── lambdas/
│       ├── everyMinute/
│       │   └── handler.ts      # Every-minute cron
│       ├── daily/
│       │   └── handler.ts      # Daily cron
│       └── manual/
│           └── handler.ts      # HTTP endpoint
├── .env                        # Local variables (not committed)
├── .gitignore
├── package.json
├── serverless.yml              # Infrastructure configuration
└── tsconfig.json
```

### Handler example (`src/lambdas/everyMinute/handler.ts`)

```typescript
export async function handler(event: unknown) {
  console.log("Every minute cron executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Every minute cron done" }) };
}
```

> Each function exports `handler` as the standard name. Serverless Framework maps the function to the file via the `serverless.yml` configuration.

---

## 6. serverless.yml Configuration

```yaml
service: lambda-cron

provider:
  name: aws
  runtime: nodejs20.x
  region: ${env:REGION, 'us-east-1'}
  stage: ${env:STAGE, 'dev'}
  memorySize: 128
  timeout: 30

plugins:
  - serverless-esbuild
  - serverless-offline

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true

functions:
  # Cron that runs every minute
  everyMinute:
    handler: src/lambdas/everyMinute/handler.handler
    description: Runs every minute
    events:
      - schedule:
          rate: rate(1 minute)
          enabled: true

  # Cron that runs daily at midnight UTC
  daily:
    handler: src/lambdas/daily/handler.handler
    description: Runs every day at midnight UTC
    events:
      - schedule:
          rate: cron(0 0 * * ? *)
          enabled: true

  # HTTP endpoint for manual trigger
  manual:
    handler: src/lambdas/manual/handler.handler
    description: Triggered manually via HTTP
    events:
      - http:
          path: /trigger
          method: get
```

### Schedule Syntax

| Type | Syntax | Example |
|---|---|---|
| **rate** | `rate(value unit)` | `rate(1 minute)`, `rate(5 hours)`, `rate(1 day)` |
| **cron** | `cron(min hour day month day-of-week year)` | `cron(0 0 * * ? *)` = daily at midnight UTC |

---

## 7. AWS IAM Configuration

This is the most critical section. You need to set up OIDC so GitHub Actions can deploy without AWS access keys.

### 7.1. Create the OIDC Identity Provider

1. Go to **AWS Console → IAM → Identity providers**
2. Click **Add provider**
3. Select **OpenID Connect**
4. **Provider URL**: `https://token.actions.githubusercontent.com`
5. Click **Get thumbprint**
6. **Audience**: `sts.amazonaws.com`
7. Click **Add provider**

### 7.2. Create the IAM Role

1. Go to **IAM → Roles → Create role**
2. Select **Custom trust policy**
3. Paste the following JSON (replace `YOUR_ACCOUNT_ID` and `YOUR_ORG/YOUR_REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

4. Click **Next** → Don't select any policy for now → **Next**
5. **Role name**: `lambda_permision`
6. Click **Create role**

### 7.3. Add Permissions — Main Policy

1. Open the `lambda_permision` role
2. **Permissions** → **Add permissions** → **Create inline policy**
3. Click on the **JSON** tab
4. Paste this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ServerlessDeployPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResource",
        "cloudformation:DescribeStackResources",
        "cloudformation:ListStackResources",
        "cloudformation:ValidateTemplate",
        "cloudformation:GetTemplate"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/lambda-cron-*/*"
    },
    {
      "Sid": "S3DeploymentBucket",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicy",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
        "s3:PutBucketAcl",
        "s3:GetEncryptionConfiguration",
        "s3:PutEncryptionConfiguration"
      ],
      "Resource": [
        "arn:aws:s3:::lambda-cron-*",
        "arn:aws:s3:::lambda-cron-*/*"
      ]
    },
    {
      "Sid": "LambdaFunctions",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:DeleteFunction",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:ListFunctions",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:InvokeFunction",
        "lambda:PublishVersion",
        "lambda:CreateAlias",
        "lambda:TagResource",
        "lambda:ListTags",
        "lambda:ListVersionsByFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:lambda-cron-*"
    },
    {
      "Sid": "IAMRoles",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:PassRole",
        "iam:DeleteRole",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/lambda-cron-*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups",
        "logs:PutRetentionPolicy",
        "logs:TagResource"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/lambda-cron-*"
    },
    {
      "Sid": "EventBridgeSchedules",
      "Effect": "Allow",
      "Action": [
        "events:PutRule",
        "events:DeleteRule",
        "events:DescribeRule",
        "events:PutTargets",
        "events:RemoveTargets",
        "events:ListRules",
        "events:ListTargetsByRule"
      ],
      "Resource": "arn:aws:events:*:*:rule/lambda-cron-*"
    },
    {
      "Sid": "APIGateway",
      "Effect": "Allow",
      "Action": [
        "apigateway:GET",
        "apigateway:POST",
        "apigateway:PUT",
        "apigateway:DELETE",
        "apigateway:PATCH"
      ],
      "Resource": "arn:aws:apigateway:*::*"
    }
  ]
}
```

5. Click **Next** → name: `serverless-deploy-permissions` → **Create policy**

---

## 8. GitHub Actions Setup

### 8.1. Create Environments in GitHub

1. Go to your repo → **Settings → Environments**
2. Create environment **`development`**
3. Create environment **`prod`**

### 8.2. Configure Secrets (per environment)

In each environment, add these **Secrets**:

| Secret | Value | Where to get it |
|---|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda_permision` | AWS IAM → Roles → lambda_permision → copy ARN |

### 8.3. Configure Variables (per environment)

| Variable | Value (development) | Value (prod) |
|---|---|---|
| `REGION` | `us-east-1` | `us-east-1` |
| `STAGE` | `dev` | `prod` |

### 8.4. Create the Workflow

File `.github/workflows/deploy.yml`:

```yaml
name: Deploy Lambda Cron
on:
  push:
    branches:
      - development
      - master

jobs:
  deploy-development-job:
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/development'
    environment: development
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.REGION }}

      - name: Deploy with Serverless Framework
        env:
          REGION: ${{ vars.REGION }}
          STAGE: ${{ vars.STAGE }}
        run: npx serverless deploy --force

  deploy-prod-job:
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/master'
    environment: prod
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ vars.REGION }}

      - name: Deploy with Serverless Framework
        env:
          REGION: ${{ vars.REGION }}
          STAGE: ${{ vars.STAGE }}
        run: npx serverless deploy --force
```

---

## 9. Local Development

### 9.1. Configure `.env`

```env
AWS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda_permision
REGION=us-east-1
STAGE=dev
```

### 9.2. Start the local server

```bash
npm run dev
```

This runs `serverless offline` which:
- Starts an HTTP server at `http://localhost:3000`
- **Cron schedules execute automatically** (serverless-offline v13)
- HTTP endpoints are available at `http://localhost:3000/dev/<path>`

### 9.3. Test endpoints

```bash
# Manual HTTP endpoint
curl http://localhost:3000/dev/trigger

# Expected response:
# {"message":"Manual trigger done"}
```

### 9.4. Invoke specific functions

```bash
# Invoke a cron manually (without running the server)
npx serverless invoke local -f everyMinute
npx serverless invoke local -f daily
npx serverless invoke local -f manual
```

---

## 10. Deployment & Monitoring

### Deployment

Deployment is **automatic** on push:
- Push to `development` → deploys to `dev` stage
- Push to `master` → deploys to `prod` stage

### Monitoring with CloudWatch

1. Go to **AWS Console → CloudWatch → Log groups**
2. Log groups follow the pattern:

| Function | Log group |
|---|---|
| everyMinute | `/aws/lambda/lambda-cron-dev-everyMinute` |
| daily | `/aws/lambda/lambda-cron-dev-daily` |
| manual | `/aws/lambda/lambda-cron-dev-manual` |

3. Click on the log group → select the most recent **Log stream** to view logs

---

## 11. Troubleshooting

### ❌ "unsupported runtime 'nodejsXX.x'"
**Cause**: The runtime specified in `serverless.yml` is not compatible with the installed Serverless Framework version.
**Solution**: Use `nodejs20.x` as runtime with Serverless Framework v3.

### ❌ "Cannot find module 'serverless-esbuild'"
**Cause**: The `serverless-esbuild` plugin is missing. Serverless v3 requires it to compile TypeScript.
**Solution**: Install with `npm install --save-dev serverless-esbuild` and verify it's listed in the `plugins` section of `serverless.yml`.

### ⚠️ "url.parse() behavior is not standardized"
**Cause**: Node.js deprecation warning from an internal dependency.
**Solution**: Cosmetic only, does not affect functionality. Safe to ignore.

---

> 📅 Documentation created as a result of the spike — March 2026
