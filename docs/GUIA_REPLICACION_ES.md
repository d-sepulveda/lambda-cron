# 🚀 Lambda-Cron — Guía de Replicación del Spike

> Guía paso a paso para crear funciones Lambda programadas (cron jobs) y endpoints HTTP con Serverless Framework v3, TypeScript y GitHub Actions.

---

## 📋 Tabla de Contenidos

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Tecnologías Utilizadas](#2-tecnologías-utilizadas)
3. [Prerequisitos](#3-prerequisitos)
4. [Inicialización del Proyecto](#4-inicialización-del-proyecto)
5. [Estructura de Carpetas](#5-estructura-de-carpetas)
6. [Configuración de serverless.yml](#6-configuración-de-serverlessyml)
7. [Configuración de IAM en AWS](#7-configuración-de-iam-en-aws)
8. [Configuración de GitHub Actions](#8-configuración-de-github-actions)
9. [Desarrollo Local](#9-desarrollo-local)
10. [Deploy y Monitoreo](#10-deploy-y-monitoreo)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Resumen del Proyecto

Este proyecto es un **spike/prueba de concepto** que demuestra cómo crear:

- **Funciones Lambda programadas (cron jobs)** usando EventBridge/CloudWatch Events
- **Endpoints HTTP** disparados manualmente vía API Gateway
- **CI/CD automatizado** con GitHub Actions usando autenticación OIDC (sin access keys de AWS)

Cada función Lambda vive en su propia carpeta dentro de `src/lambdas/` y se despliega de forma independiente.

---

## 2. Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|---|---|---|
| **AWS Lambda** | - | Ejecución de funciones serverless |
| **Amazon EventBridge** | - | Programación de cron jobs (schedules) |
| **Amazon API Gateway** | - | Endpoints HTTP para triggers manuales |
| **Serverless Framework** | v3.40.0 | Framework de despliegue de infraestructura |
| **Node.js** | 20.x | Runtime de ejecución |
| **TypeScript** | ^5.7.0 | Lenguaje de programación |
| **esbuild** | ^0.27.4 | Bundler/compilador (vía plugin serverless-esbuild) |
| **serverless-esbuild** | ^1.57.0 | Plugin para integrar esbuild con Serverless v3 |
| **serverless-offline** | v13.9.0 | Desarrollo y pruebas locales |
| **GitHub Actions** | - | CI/CD con OIDC para AWS |

> **Nota importante**: Serverless Framework v3 requiere el plugin `serverless-esbuild` para compilar TypeScript. La configuración de esbuild se define en la sección `custom.esbuild` de `serverless.yml`.

---

## 3. Prerequisitos

Antes de comenzar, asegúrate de tener:

- [ ] **Cuenta de AWS** con permisos de administrador o IAM
- [ ] **Node.js 20** instalado (`node --version`)
- [ ] **npm** como gestor de paquetes
- [ ] **Repositorio en GitHub** para el proyecto

### Instalar Node.js 20

```bash
# Con nvm (recomendado)
nvm install 20
nvm use 20
```

---

## 4. Inicialización del Proyecto

### 4.1. Crear el proyecto

```bash
mkdir lambda-cron
cd lambda-cron
npm init -y
```

### 4.2. Instalar dependencias

```bash
npm install --save-dev \
  serverless@^3.0.0 \
  serverless-esbuild@^1.0.0 \
  serverless-offline@^13.0.0 \
  typescript@^5.7.0 \
  esbuild@^0.27.0 \
  @types/node@^22.0.0
```

### 4.3. Crear `tsconfig.json`

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

### 4.4. Crear `package.json` scripts

```json
{
  "scripts": {
    "dev": "serverless offline",
    "lint": "eslint src/",
    "test": "jest"
  }
}
```

### 4.5. Crear `.gitignore`

```
# Logs
logs
*.log

# Dependencias
node_modules/

# Build output
dist/
.esbuild/
.serverless/

# Variables de entorno
.env

# OS
.DS_Store
```

---

## 5. Estructura de Carpetas

```
lambda-cron/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/
│   └── lambdas/
│       ├── everyMinute/
│       │   └── handler.ts      # Cron cada minuto
│       ├── daily/
│       │   └── handler.ts      # Cron diario
│       └── manual/
│           └── handler.ts      # Endpoint HTTP
├── .env                        # Variables locales (no se sube a git)
├── .gitignore
├── package.json
├── serverless.yml              # Configuración de infraestructura
└── tsconfig.json
```

### Ejemplo de handler (`src/lambdas/everyMinute/handler.ts`)

```typescript
export async function handler(event: unknown) {
  console.log("Every minute cron executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Every minute cron done" }) };
}
```

> Cada función exporta `handler` como nombre estándar. Serverless Framework mapea la función al archivo vía la configuración en `serverless.yml`.

---

## 6. Configuración de serverless.yml

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
  # Cron que se ejecuta cada minuto
  everyMinute:
    handler: src/lambdas/everyMinute/handler.handler
    description: Runs every minute
    events:
      - schedule:
          rate: rate(1 minute)
          enabled: true

  # Cron que se ejecuta todos los días a medianoche UTC
  daily:
    handler: src/lambdas/daily/handler.handler
    description: Runs every day at midnight UTC
    events:
      - schedule:
          rate: cron(0 0 * * ? *)
          enabled: true

  # Endpoint HTTP para trigger manual
  manual:
    handler: src/lambdas/manual/handler.handler
    description: Triggered manually via HTTP
    events:
      - http:
          path: /trigger
          method: get
```

### Sintaxis de Schedule

| Tipo | Sintaxis | Ejemplo |
|---|---|---|
| **rate** | `rate(valor unidad)` | `rate(1 minute)`, `rate(5 hours)`, `rate(1 day)` |
| **cron** | `cron(min hora dia mes dia-sem año)` | `cron(0 0 * * ? *)` = medianoche UTC diario |

---

## 7. Configuración de IAM en AWS

Esta es la sección más crítica. Necesitas configurar OIDC para que GitHub Actions pueda desplegar sin access keys.

### 7.1. Crear el Identity Provider OIDC

1. Ve a **AWS Console → IAM → Identity providers**
2. Click **Add provider**
3. Selecciona **OpenID Connect**
4. **Provider URL**: `https://token.actions.githubusercontent.com`
5. Click **Get thumbprint**
6. **Audience**: `sts.amazonaws.com`
7. Click **Add provider**

### 7.2. Crear el Rol IAM

1. Ve a **IAM → Roles → Create role**
2. Selecciona **Custom trust policy**
3. Pega el siguiente JSON (reemplaza `TU_ACCOUNT_ID` y `TU_ORG/TU_REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::TU_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:TU_ORG/TU_REPO:*"
        }
      }
    }
  ]
}
```

4. Click **Next** → No selecciones ninguna policy por ahora → **Next**
5. **Role name**: `lambda_permision`
6. Click **Create role**

### 7.3. Agregar Permisos — Policy Principal

1. Abre el rol `lambda_permision`
2. **Permissions** → **Add permissions** → **Create inline policy**
3. Click en pestaña **JSON**
4. Pega este JSON:

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

5. Click **Next** → nombre: `serverless-deploy-permissions` → **Create policy**

---

## 8. Configuración de GitHub Actions

### 8.1. Crear Environments en GitHub

1. Ve a tu repo → **Settings → Environments**
2. Crear environment **`development`**
3. Crear environment **`prod`**

### 8.2. Configurar Secrets (por environment)

En cada environment, agregar estos **Secrets**:

| Secret | Valor | Dónde obtenerlo |
|---|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::TU_ACCOUNT_ID:role/lambda_permision` | AWS IAM → Roles → lambda_permision → copiar ARN |

### 8.3. Configurar Variables (por environment)

| Variable | Valor (development) | Valor (prod) |
|---|---|---|
| `REGION` | `us-east-1` | `us-east-1` |
| `STAGE` | `dev` | `prod` |

### 8.4. Crear el Workflow

Archivo `.github/workflows/deploy.yml`:

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

## 9. Desarrollo Local

### 9.1. Configurar `.env`

```env
AWS_ROLE_ARN=arn:aws:iam::TU_ACCOUNT_ID:role/lambda_permision
REGION=us-east-1
STAGE=dev
```

### 9.2. Levantar servidor local

```bash
npm run dev
```

Esto ejecuta `serverless offline` que:
- Levanta un servidor HTTP en `http://localhost:3000`
- **Los cron schedules se ejecutan automáticamente** (serverless-offline v13)
- Los endpoints HTTP están disponibles en `http://localhost:3000/dev/<path>`

### 9.3. Probar endpoints

```bash
# Endpoint HTTP manual
curl http://localhost:3000/dev/trigger

# Respuesta esperada:
# {"message":"Manual trigger done"}
```

### 9.4. Invocar funciones específicas

```bash
# Invocar un cron manualmente (sin servidor corriendo)
npx serverless invoke local -f everyMinute
npx serverless invoke local -f daily
npx serverless invoke local -f manual
```

---

## 10. Deploy y Monitoreo

### Deploy

El deploy es **automático** al hacer push:
- Push a `development` → despliega al stage `dev`
- Push a `master` → despliega al stage `prod`

### Monitoreo en CloudWatch

1. Ve a **AWS Console → CloudWatch → Log groups**
2. Los log groups siguen el patrón:

| Función | Log group |
|---|---|
| everyMinute | `/aws/lambda/lambda-cron-dev-everyMinute` |
| daily | `/aws/lambda/lambda-cron-dev-daily` |
| manual | `/aws/lambda/lambda-cron-dev-manual` |

3. Click en el log group → selecciona el **Log stream** más reciente para ver los logs

---

## 11. Troubleshooting

### ❌ "unsupported runtime 'nodejsXX.x'"
**Causa**: El runtime especificado en `serverless.yml` no es compatible con la versión de Serverless Framework instalada.
**Solución**: Usar `nodejs20.x` como runtime con Serverless Framework v3.

### ❌ "Cannot find module 'serverless-esbuild'"
**Causa**: Falta el plugin `serverless-esbuild` que Serverless v3 necesita para compilar TypeScript.
**Solución**: Instalar con `npm install --save-dev serverless-esbuild` y verificar que esté en la sección `plugins` de `serverless.yml`.

### ⚠️ "url.parse() behavior is not standardized"
**Causa**: Warning de Node.js por una dependencia interna.
**Solución**: Es cosmético, no afecta funcionalidad. Se puede ignorar.

---

> 📅 Documentación creada como resultado del spike — Marzo 2026
