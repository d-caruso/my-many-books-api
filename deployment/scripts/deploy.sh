#!/bin/bash

# ==============================================================================
# My Many Books API Deployment Script
# ==============================================================================
# This script deploys the My Many Books API to AWS using CloudFormation and Serverless
# Usage: ./deploy.sh [environment] [options]
# ==============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
SKIP_TESTS=false
SKIP_INFRASTRUCTURE=false
SKIP_APPLICATION=false
FORCE_DEPLOY=false
DRY_RUN=false
VERBOSE=false

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [environment] [options]

Environments:
  dev       Deploy to development environment (default)
  staging   Deploy to staging environment
  prod      Deploy to production environment

Options:
  --skip-tests          Skip running tests before deployment
  --skip-infrastructure Skip infrastructure deployment
  --skip-application    Skip application deployment
  --force               Force deployment even if checks fail
  --dry-run            Show what would be deployed without actually deploying
  --verbose            Enable verbose output
  -h, --help           Show this help message

Examples:
  $0 dev                           # Deploy to dev with all steps
  $0 prod --skip-tests             # Deploy to prod skipping tests
  $0 staging --dry-run             # Show what would be deployed to staging
  $0 dev --skip-infrastructure     # Deploy only application to dev

EOF
}

# Function to validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_info "Deploying to environment: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("node" "npm" "aws" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_node="18.0.0"
    if ! printf '%s\n%s\n' "$required_node" "$node_version" | sort -C -V; then
        print_error "Node.js version $node_version is too old. Required: $required_node or higher"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        print_error "package.json not found. Are you in the right directory?"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests (--skip-tests flag provided)"
        return 0
    fi
    
    print_info "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        print_info "Installing dependencies..."
        npm ci
    fi
    
    # Run linting
    print_info "Running linting..."
    npm run lint
    
    # Run type checking
    print_info "Running type checking..."
    npm run build
    
    # Run unit tests
    print_info "Running unit tests..."
    npm run test
    
    print_success "All tests passed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    if [[ "$SKIP_INFRASTRUCTURE" == true ]]; then
        print_warning "Skipping infrastructure deployment"
        return 0
    fi
    
    print_info "Deploying infrastructure for environment: $ENVIRONMENT"
    
    local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
    local template_file="${DEPLOYMENT_DIR}/cloudformation/infrastructure.yml"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would deploy CloudFormation stack: $stack_name"
        return 0
    fi
    
    # Check if stack exists
    local stack_exists=false
    if aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        stack_exists=true
        print_info "Stack $stack_name exists, updating..."
    else
        print_info "Stack $stack_name does not exist, creating..."
    fi
    
    # Set parameters based on environment
    local parameters=(
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    )
    
    case "$ENVIRONMENT" in
        prod)
            parameters+=(
                "ParameterKey=DatabaseInstanceClass,ParameterValue=db.t3.small"
                "ParameterKey=DatabaseAllocatedStorage,ParameterValue=50"
                "ParameterKey=EnableMultiAZ,ParameterValue=true"
            )
            ;;
        staging)
            parameters+=(
                "ParameterKey=DatabaseInstanceClass,ParameterValue=db.t3.micro"
                "ParameterKey=DatabaseAllocatedStorage,ParameterValue=20"
                "ParameterKey=EnableMultiAZ,ParameterValue=false"
            )
            ;;
        dev)
            parameters+=(
                "ParameterKey=DatabaseInstanceClass,ParameterValue=db.t3.micro"
                "ParameterKey=DatabaseAllocatedStorage,ParameterValue=20"
                "ParameterKey=EnableMultiAZ,ParameterValue=false"
            )
            ;;
    esac
    
    # Deploy stack
    local cmd_args=(
        "--template-body" "file://$template_file"
        "--stack-name" "$stack_name"
        "--parameters" "${parameters[@]}"
        "--capabilities" "CAPABILITY_IAM" "CAPABILITY_NAMED_IAM"
        "--region" "${AWS_REGION:-us-east-1}"
    )
    
    if [[ "$stack_exists" == true ]]; then
        aws cloudformation update-stack "${cmd_args[@]}" || {
            local exit_code=$?
            if [[ $exit_code -eq 255 ]]; then
                print_warning "No updates to perform for infrastructure stack"
            else
                print_error "Failed to update infrastructure stack"
                exit $exit_code
            fi
        }
    else
        aws cloudformation create-stack "${cmd_args[@]}"
    fi
    
    # Wait for stack operation to complete
    print_info "Waiting for stack operation to complete..."
    local wait_cmd="stack-$(if [[ "$stack_exists" == true ]]; then echo "update"; else echo "create"; fi)-complete"
    
    if ! aws cloudformation wait "$wait_cmd" --stack-name "$stack_name" --region "${AWS_REGION:-us-east-1}"; then
        print_error "Stack operation failed"
        
        # Show stack events for debugging
        print_info "Recent stack events:"
        aws cloudformation describe-stack-events \
            --stack-name "$stack_name" \
            --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
            --output table \
            --region "${AWS_REGION:-us-east-1}" || true
        
        exit 1
    fi
    
    print_success "Infrastructure deployment completed"
}

# Function to run database migrations
run_database_migrations() {
    print_info "Running database migrations for environment: $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would run database migrations"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for database connection
    export NODE_ENV="$ENVIRONMENT"
    
    # Get database connection details from CloudFormation stack
    local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
    local db_endpoint
    local db_port
    
    db_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    db_port=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    if [[ -z "$db_endpoint" || -z "$db_port" ]]; then
        print_error "Could not retrieve database connection details from CloudFormation"
        exit 1
    fi
    
    export DB_HOST="$db_endpoint"
    export DB_PORT="$db_port"
    export DB_NAME="my_many_books"
    export DB_SSL="true"
    
    # Run migrations
    print_info "Running Sequelize migrations..."
    npm run db:migrate
    
    print_success "Database migrations completed"
}

# Function to deploy application
deploy_application() {
    if [[ "$SKIP_APPLICATION" == true ]]; then
        print_warning "Skipping application deployment"
        return 0
    fi
    
    print_info "Deploying application for environment: $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would deploy application using Serverless"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Build application
    print_info "Building application..."
    npm run build
    
    # Deploy with Serverless
    print_info "Deploying with Serverless..."
    local serverless_args=(
        "deploy"
        "--stage" "$ENVIRONMENT"
        "--region" "${AWS_REGION:-us-east-1}"
    )
    
    if [[ "$VERBOSE" == true ]]; then
        serverless_args+=("--verbose")
    fi
    
    npx serverless "${serverless_args[@]}"
    
    print_success "Application deployment completed"
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_info "Running post-deployment tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would run post-deployment tests"
        return 0
    fi
    
    # Get API endpoint from Serverless output
    local api_url
    api_url=$(npx serverless info --stage "$ENVIRONMENT" --verbose | grep "https://" | head -1 | awk '{print $2}')
    
    if [[ -z "$api_url" ]]; then
        print_warning "Could not determine API URL, skipping health check"
        return 0
    fi
    
    print_info "Testing API endpoint: $api_url"
    
    # Wait for API to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "${api_url}/health" > /dev/null; then
            print_success "API health check passed"
            break
        fi
        
        print_info "Waiting for API to be ready (attempt $attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        print_error "API health check failed after $max_attempts attempts"
        exit 1
    fi
    
    print_success "Post-deployment tests completed"
}

# Function to show deployment summary
show_deployment_summary() {
    print_info "Deployment Summary"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "AWS Region: ${AWS_REGION:-us-east-1}"
    
    if [[ "$DRY_RUN" == false ]]; then
        # Get stack outputs
        local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
        
        echo ""
        echo "Infrastructure:"
        aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint` || OutputKey==`RedisEndpoint`].[OutputKey,OutputValue]' \
            --output table \
            --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "  Could not retrieve infrastructure details"
        
        echo ""
        echo "Application:"
        npx serverless info --stage "$ENVIRONMENT" 2>/dev/null || echo "  Could not retrieve application details"
    fi
    
    echo ""
    print_success "Deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-infrastructure)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        --skip-application)
            SKIP_APPLICATION=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    print_info "Starting deployment of My Many Books API"
    print_info "=========================================="
    
    # Validate inputs
    validate_environment
    
    # Pre-deployment checks
    check_prerequisites
    
    # Run tests
    run_tests
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Run database migrations
    if [[ "$SKIP_INFRASTRUCTURE" == false ]]; then
        run_database_migrations
    fi
    
    # Deploy application
    deploy_application
    
    # Post-deployment tests
    run_post_deployment_tests
    
    # Show summary
    show_deployment_summary
}

# Set error handling
trap 'print_error "Deployment failed on line $LINENO"' ERR

# Run main function
main "$@"