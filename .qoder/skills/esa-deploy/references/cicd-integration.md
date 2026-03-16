# CI/CD Integration for ESA Deployment

## GitHub Actions

### Basic Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to ESA

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json

      - name: Install Dependencies
        working-directory: ./app
        run: npm ci

      - name: Build
        working-directory: ./app
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_ENABLE_MSW: false
          VITE_LOG_LEVEL: info
        run: npm run build

      - name: Install ESA CLI
        run: npm install esa-cli@latest -g

      - name: Configure ESA Credentials
        env:
          ESA_ACCESS_KEY_ID: ${{ secrets.ESA_ACCESS_KEY_ID }}
          ESA_ACCESS_KEY_SECRET: ${{ secrets.ESA_ACCESS_KEY_SECRET }}
        run: |
          esa-cli config set accessKeyId $ESA_ACCESS_KEY_ID
          esa-cli config set accessKeySecret $ESA_ACCESS_KEY_SECRET

      - name: Deploy
        working-directory: ./app
        run: esa-cli deploy
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ESA_ACCESS_KEY_ID` | Alibaba Cloud AccessKey ID |
| `ESA_ACCESS_KEY_SECRET` | Alibaba Cloud AccessKey Secret |

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - deploy

deploy_esa:
  stage: deploy
  image: node:20
  only:
    - main
  script:
    - cd app
    - npm ci
    - npm run build
    - npm install esa-cli@latest -g
    - esa-cli config set accessKeyId $ESA_ACCESS_KEY_ID
    - esa-cli config set accessKeySecret $ESA_ACCESS_KEY_SECRET
    - esa-cli deploy
  variables:
    VITE_SUPABASE_URL: $VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY: $VITE_SUPABASE_ANON_KEY
    VITE_ENABLE_MSW: "false"
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent any

  environment {
    VITE_SUPABASE_URL = credentials('supabase-url')
    VITE_SUPABASE_ANON_KEY = credentials('supabase-anon-key')
    ESA_ACCESS_KEY_ID = credentials('esa-access-key-id')
    ESA_ACCESS_KEY_SECRET = credentials('esa-access-key-secret')
  }

  stages {
    stage('Install') {
      steps {
        dir('app') {
          sh 'npm ci'
        }
      }
    }

    stage('Build') {
      environment {
        VITE_ENABLE_MSW = 'false'
        VITE_LOG_LEVEL = 'info'
      }
      steps {
        dir('app') {
          sh 'npm run build'
        }
      }
    }

    stage('Deploy') {
      steps {
        sh 'npm install esa-cli@latest -g'
        sh "esa-cli config set accessKeyId ${ESA_ACCESS_KEY_ID}"
        sh "esa-cli config set accessKeySecret ${ESA_ACCESS_KEY_SECRET}"
        dir('app') {
          sh 'esa-cli deploy'
        }
      }
    }
  }
}
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy to staging environment first
2. Run smoke tests
3. Promote to production

```yaml
# GitHub Actions - Blue-Green
deploy-staging:
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - name: Deploy to Staging
      # ... deploy steps

deploy-production:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Deploy to Production
      # ... deploy steps
```

### Preview Deployments

Deploy pull requests to preview URLs:

```yaml
deploy-preview:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - name: Deploy Preview
      working-directory: ./app
      run: |
        esa-cli deploy --name "pr-${{ github.event.pull_request.number }}"
```

## Rollback

### Manual Rollback

```bash
# List deployments
esa-cli deployments

# Rollback to specific version
esa-cli deployments rollback <deployment-id>
```

### Automated Rollback

```yaml
# GitHub Actions with auto-rollback
- name: Health Check
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com)
    if [ "$response" != "200" ]; then
      esa-cli deployments rollback previous
      exit 1
    fi
```

## Security Considerations

1. **Use GitHub Environments** for production protection
2. **Limit AccessKey permissions** to ESA only
3. **Enable branch protection** for main branch
4. **Use OIDC** for cloud authentication (if supported)
5. **Rotate secrets** regularly
