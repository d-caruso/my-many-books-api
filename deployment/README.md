# My Many Books API - Deployment Infrastructure

This directory contains comprehensive deployment infrastructure for the My Many Books API, including CI/CD pipelines, infrastructure as code, containerization, and monitoring configurations.

## 📁 Directory Structure

```
deployment/
├── cloudformation/          # AWS CloudFormation templates
│   ├── infrastructure.yml   # Core infrastructure (VPC, RDS, ElastiCache)
│   └── api-gateway.yml     # API Gateway configuration
├── docker/                 # Docker configurations
│   ├── Dockerfile          # Multi-stage Dockerfile
│   ├── docker-compose.yml  # Development environment
│   ├── docker-compose.prod.yml # Production environment
│   ├── mysql/              # MySQL configuration files
│   └── redis/              # Redis configuration files
├── monitoring/             # Monitoring and alerting
│   ├── cloudwatch-dashboard.json
│   ├── cloudwatch-alarms.yml
│   └── setup-monitoring.sh
├── scripts/                # Deployment automation scripts
│   ├── deploy.sh           # Main deployment script
│   ├── rollback.sh         # Rollback script
│   └── backup.sh           # Database backup script
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Node.js** 18.x or higher
3. **Docker** and Docker Compose (for local development)
4. **Serverless Framework** installed globally

### Environment Setup

1. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

2. **Set environment variables:**
   ```bash
   export AWS_REGION=us-east-1
   export ENVIRONMENT=dev  # or staging, prod
   ```

3. **Deploy infrastructure:**
   ```bash
   ./deployment/scripts/deploy.sh dev
   ```

## 🏗️ Infrastructure Components

### Core Infrastructure (CloudFormation)

**`cloudformation/infrastructure.yml`**
- **VPC** with public and private subnets across 2 AZs
- **RDS MySQL** database with automated backups
- **ElastiCache Redis** for caching
- **Security Groups** with least-privilege access
- **NAT Gateway** for private subnet internet access
- **S3 Bucket** for deployment artifacts
- **IAM Roles** and policies
- **Systems Manager Parameters** for configuration

**`cloudformation/api-gateway.yml`**
- **API Gateway** with regional endpoints
- **Custom domain** support with SSL certificates
- **Usage plans** and API keys
- **WAF** protection for production
- **CloudWatch** logging and monitoring
- **CORS** configuration

### Container Infrastructure (Docker)

**Multi-stage Dockerfile:**
- **Development** stage with hot reloading
- **Production** stage with optimized build
- **Lambda** stage for AWS Lambda deployment
- **Testing** stage for CI/CD pipelines

**Docker Compose configurations:**
- **Development** environment with MySQL and Redis
- **Production** environment with enhanced security
- **Monitoring** stack with Prometheus and Grafana
- **Log aggregation** with Fluentd

## 🔄 CI/CD Pipelines

### GitHub Actions Workflows

**`.github/workflows/ci.yml`** - Continuous Integration:
- **Test Suite** with MySQL service container
- **Security Scanning** with dependency audits
- **Code Quality** checks with ESLint and Prettier
- **Build Process** for multiple environments
- **Docker Image** building and publishing
- **API Testing** with Postman collections

**`.github/workflows/cd.yml`** - Continuous Deployment:
- **Environment Detection** based on branch/tag
- **Pre-deployment Checks** and validations
- **Database Migrations** with rollback support
- **Infrastructure Deployment** with CloudFormation
- **Application Deployment** with Serverless
- **Post-deployment Testing** and monitoring
- **Automatic Rollback** on failure

### Deployment Strategies

**Development (develop branch):**
- Automatic deployment on push
- Comprehensive testing
- Database migrations
- Monitoring setup

**Production (main branch):**
- Manual approval gates
- Database backups
- Blue-green deployment
- Extensive monitoring
- Automatic rollback capabilities

## 📋 Deployment Scripts

### Main Deployment Script

```bash
./deployment/scripts/deploy.sh [environment] [options]
```

**Options:**
- `--skip-tests` - Skip test execution
- `--skip-infrastructure` - Deploy only application
- `--skip-application` - Deploy only infrastructure
- `--force` - Force deployment with warnings
- `--dry-run` - Show deployment plan without executing

**Examples:**
```bash
# Full deployment to development
./deployment/scripts/deploy.sh dev

# Production deployment with all checks
./deployment/scripts/deploy.sh prod

# Infrastructure-only deployment
./deployment/scripts/deploy.sh staging --skip-application

# Dry run for production
./deployment/scripts/deploy.sh prod --dry-run
```

### Rollback Script

```bash
./deployment/scripts/rollback.sh [environment] --version [version]
```

**Examples:**
```bash
# Rollback to specific version
./deployment/scripts/rollback.sh prod --version v1.2.3

# Rollback to previous version
./deployment/scripts/rollback.sh staging --version previous

# Dry run rollback
./deployment/scripts/rollback.sh prod --version v1.2.3 --dry-run
```

### Database Backup Script

```bash
./deployment/scripts/backup.sh [environment] [options]
```

**Options:**
- `--type [full|schema|data]` - Backup type
- `--s3-bucket [bucket]` - Upload to S3
- `--retention [days]` - Retention period
- `--no-compress` - Disable compression

## 📊 Monitoring and Alerting

### CloudWatch Dashboard

Comprehensive dashboard with:
- **Lambda Performance** metrics
- **API Gateway** request/response metrics
- **Database Performance** monitoring
- **Cache Performance** metrics
- **Custom Application** metrics
- **Error Tracking** and logs

### CloudWatch Alarms

Production-ready alarms for:
- **Lambda Errors** and throttling
- **API Gateway** 4XX/5XX errors
- **Database** CPU, memory, and connections
- **Cache** performance and memory usage
- **Custom Application** metrics

### Monitoring Setup

```bash
# Setup monitoring with email alerts
./deployment/monitoring/setup-monitoring.sh prod --email admin@example.com

# Setup monitoring without alarms
./deployment/monitoring/setup-monitoring.sh dev --skip-alarms

# Dry run monitoring setup
./deployment/monitoring/setup-monitoring.sh staging --dry-run
```

## 🐳 Local Development

### Using Docker Compose

**Start development environment:**
```bash
cd deployment/docker
docker-compose up -d
```

**Access services:**
- **API**: http://localhost:3000
- **Database Admin**: http://localhost:8080 (Adminer)
- **Monitoring**: http://localhost:3001 (Grafana)

**Stop environment:**
```bash
docker-compose down
```

### Production-like Environment

```bash
# Start production-like stack
docker-compose -f docker-compose.prod.yml up -d

# Start with monitoring
docker-compose -f docker-compose.prod.yml --profile with-monitoring up -d
```

## 🔧 Configuration Management

### Environment Variables

**Development:**
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
API_KEYS_ENABLED=false
```

**Production:**
```bash
NODE_ENV=production
DB_HOST=<rds-endpoint>
DB_SSL=true
API_KEYS_ENABLED=true
COGNITO_ENABLED=true
```

### AWS Systems Manager Parameters

Configuration stored in SSM:
- `/my-many-books-${env}/database/host`
- `/my-many-books-${env}/database/port`
- `/my-many-books-${env}/redis/host`
- `/my-many-books-${env}/redis/port`

### Secrets Management

Sensitive data in AWS Secrets Manager:
- Database credentials
- API keys
- External service tokens

## 🔒 Security Considerations

### Network Security
- **VPC** with private subnets for databases
- **Security Groups** with minimal required access
- **NAT Gateway** for controlled internet access
- **SSL/TLS** encryption in transit

### Application Security
- **WAF** protection for production APIs
- **API Keys** and Cognito authentication
- **Rate Limiting** and throttling
- **Input validation** and sanitization

### Data Security
- **Encryption at rest** for RDS and S3
- **Encrypted backups** with retention policies
- **Secrets rotation** capabilities
- **Access logging** and monitoring

## 📈 Performance Optimization

### Caching Strategy
- **ElastiCache Redis** for application caching
- **API Gateway** response caching
- **CloudFront** CDN for static assets
- **Database query** optimization

### Scaling Configuration
- **Lambda** concurrent execution limits
- **RDS** connection pooling
- **Auto Scaling** for future container deployments
- **Load balancing** strategies

## 🚨 Disaster Recovery

### Backup Strategy
- **Automated RDS backups** with point-in-time recovery
- **Manual database snapshots** before deployments
- **S3 backup storage** with lifecycle policies
- **Cross-region replication** for production

### Recovery Procedures
1. **Database Recovery** from snapshots
2. **Application Rollback** to previous versions
3. **Infrastructure Recreation** from CloudFormation
4. **Data Restoration** from S3 backups

## 📖 Troubleshooting

### Common Issues

**Deployment Failures:**
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name my-many-books-infrastructure-prod

# Check Lambda logs
aws logs tail /aws/lambda/my-many-books-api-prod-main --follow
```

**Database Connection Issues:**
```bash
# Test database connectivity
./deployment/scripts/backup.sh prod --dry-run

# Check security group rules
aws ec2 describe-security-groups --group-names my-many-books-infrastructure-prod-db-sg
```

**Performance Issues:**
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Duration

# Analyze logs with CloudWatch Insights
```

### Debug Commands

**Infrastructure Status:**
```bash
# Check all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Get stack outputs
aws cloudformation describe-stacks --stack-name my-many-books-infrastructure-prod --query 'Stacks[0].Outputs'
```

**Application Status:**
```bash
# Check Lambda function
aws lambda get-function --function-name my-many-books-api-prod-main

# Check API Gateway
aws apigateway get-rest-apis
```

## 🤝 Contributing

When making changes to deployment infrastructure:

1. **Test in development** environment first
2. **Update documentation** as needed
3. **Validate CloudFormation** templates
4. **Test rollback procedures**
5. **Review security implications**

## 📚 Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🔗 Related Documentation

- [Main README](../README.md) - Project overview
- [API Documentation](../docs/api-specification.yml) - API specification
- [Postman Collection](../postman/README.md) - API testing
- [Database Guide](../database/README.md) - Database management