#!/bin/bash

# ==============================================================================
# My Many Books API Rollback Script
# ==============================================================================
# This script rolls back the My Many Books API deployment to a previous version
# Usage: ./rollback.sh [environment] [options]
# ==============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
TARGET_VERSION=""
DRY_RUN=false
FORCE=false
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
  dev       Rollback development environment (default)
  staging   Rollback staging environment
  prod      Rollback production environment

Options:
  --version VERSION     Target version to rollback to (required)
  --dry-run            Show what would be rolled back without actually doing it
  --force              Force rollback even if safety checks fail
  --verbose            Enable verbose output
  -h, --help           Show this help message

Examples:
  $0 dev --version v1.2.3              # Rollback dev to version v1.2.3
  $0 prod --version latest-1 --force   # Rollback prod to previous version
  $0 staging --dry-run --version v1.1.0 # Show what would be rolled back

EOF
}

# Function to validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_info "Rolling back environment: $ENVIRONMENT"
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
    local required_commands=("aws" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check target version is specified
    if [[ -z "$TARGET_VERSION" ]]; then
        print_error "Target version must be specified with --version option"
        show_usage
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get current deployment info
get_current_deployment_info() {
    print_info "Getting current deployment information..."
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    local current_version
    local current_alias
    
    # Get current version
    current_version=$(aws lambda get-function \
        --function-name "$function_name" \
        --query 'Configuration.Version' \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "unknown")
    
    # Get current alias info
    current_alias=$(aws lambda get-alias \
        --function-name "$function_name" \
        --name "LIVE" \
        --query 'FunctionVersion' \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "unknown")
    
    echo "Current deployment:"
    echo "  Function: $function_name"
    echo "  Version: $current_version"
    echo "  Live Alias Version: $current_alias"
    echo ""
}

# Function to list available versions
list_available_versions() {
    print_info "Available versions for rollback:"
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    
    aws lambda list-versions-by-function \
        --function-name "$function_name" \
        --query 'Versions[?Version!=`$LATEST`].[Version,LastModified,Description]' \
        --output table \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || {
        print_warning "Could not retrieve version list"
        return 1
    }
    
    echo ""
}

# Function to validate target version
validate_target_version() {
    print_info "Validating target version: $TARGET_VERSION"
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    
    # Handle special version identifiers
    case "$TARGET_VERSION" in
        "latest-1"|"previous")
            print_info "Resolving 'previous' version..."
            
            # Get the version before the current live version
            local current_live_version
            current_live_version=$(aws lambda get-alias \
                --function-name "$function_name" \
                --name "LIVE" \
                --query 'FunctionVersion' \
                --output text \
                --region "${AWS_REGION:-us-east-1}")
            
            if [[ "$current_live_version" == "unknown" || "$current_live_version" == "1" ]]; then
                print_error "Cannot determine previous version or already at earliest version"
                exit 1
            fi
            
            TARGET_VERSION=$((current_live_version - 1))
            print_info "Resolved target version: $TARGET_VERSION"
            ;;
        *)
            # Remove 'v' prefix if present
            TARGET_VERSION="${TARGET_VERSION#v}"
            
            # Check if version exists
            if ! aws lambda get-function \
                --function-name "$function_name" \
                --qualifier "$TARGET_VERSION" \
                --query 'Configuration.Version' \
                --output text \
                --region "${AWS_REGION:-us-east-1}" &> /dev/null; then
                
                print_error "Version $TARGET_VERSION does not exist for function $function_name"
                list_available_versions
                exit 1
            fi
            ;;
    esac
    
    print_success "Target version $TARGET_VERSION is valid"
}

# Function to perform safety checks
perform_safety_checks() {
    print_info "Performing safety checks..."
    
    # Check if rolling back to production
    if [[ "$ENVIRONMENT" == "prod" && "$FORCE" != true ]]; then
        print_warning "Rolling back production environment!"
        print_warning "This action will affect live users."
        
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
        if [[ "$confirmation" != "yes" ]]; then
            print_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Check rollback window (only for production)
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        local current_hour=$(date +%H)
        if [[ $current_hour -ge 9 && $current_hour -le 17 ]]; then
            print_warning "Rolling back during business hours (9 AM - 5 PM)"
            if [[ "$FORCE" != true ]]; then
                print_error "Use --force to rollback during business hours"
                exit 1
            fi
        fi
    fi
    
    print_success "Safety checks passed"
}

# Function to create backup
create_backup() {
    print_info "Creating backup of current deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would create backup"
        return 0
    fi
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    local backup_description="Backup before rollback to version $TARGET_VERSION - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Create a new version as backup
    local backup_version
    backup_version=$(aws lambda publish-version \
        --function-name "$function_name" \
        --description "$backup_description" \
        --query 'Version' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    print_success "Created backup version: $backup_version"
    echo "Backup description: $backup_description"
}

# Function to rollback Lambda function
rollback_lambda_function() {
    print_info "Rolling back Lambda function to version $TARGET_VERSION..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would rollback Lambda function"
        return 0
    fi
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    
    # Update the LIVE alias to point to the target version
    aws lambda update-alias \
        --function-name "$function_name" \
        --name "LIVE" \
        --function-version "$TARGET_VERSION" \
        --description "Rolled back to version $TARGET_VERSION on $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --region "${AWS_REGION:-us-east-1}"
    
    print_success "Lambda function rollback completed"
}

# Function to rollback API Gateway (if needed)
rollback_api_gateway() {
    print_info "Checking API Gateway rollback requirements..."
    
    # For this application, API Gateway configuration is typically deployed with Lambda
    # So rolling back Lambda should be sufficient
    # This function is here for potential future enhancements
    
    print_info "API Gateway rollback not required for this deployment type"
}

# Function to verify rollback
verify_rollback() {
    print_info "Verifying rollback..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would verify rollback"
        return 0
    fi
    
    local function_name="my-many-books-api-${ENVIRONMENT}-main"
    
    # Check current alias version
    local current_version
    current_version=$(aws lambda get-alias \
        --function-name "$function_name" \
        --name "LIVE" \
        --query 'FunctionVersion' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    if [[ "$current_version" == "$TARGET_VERSION" ]]; then
        print_success "Rollback verification passed - version is now $current_version"
    else
        print_error "Rollback verification failed - expected $TARGET_VERSION, got $current_version"
        exit 1
    fi
    
    # Test API endpoint
    local max_attempts=10
    local attempt=1
    
    # Get API endpoint
    local api_url
    api_url=$(aws apigateway get-rest-apis \
        --query "items[?name=='my-many-books-api-${ENVIRONMENT}'].id" \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || true)
    
    if [[ -n "$api_url" ]]; then
        api_url="https://${api_url}.execute-api.${AWS_REGION:-us-east-1}.amazonaws.com/${ENVIRONMENT}/health"
        
        print_info "Testing API endpoint: $api_url"
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s "$api_url" > /dev/null 2>&1; then
                print_success "API health check passed"
                break
            fi
            
            print_info "Waiting for API to respond (attempt $attempt/$max_attempts)..."
            sleep 5
            ((attempt++))
        done
        
        if [[ $attempt -gt $max_attempts ]]; then
            print_warning "API health check failed, but rollback completed"
        fi
    else
        print_info "Could not determine API URL for testing"
    fi
}

# Function to send notifications
send_notifications() {
    print_info "Sending rollback notifications..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would send notifications"
        return 0
    fi
    
    # This function can be extended to send notifications to Slack, email, etc.
    # For now, just log the rollback
    
    local message="🔄 My Many Books API rollback completed
Environment: $ENVIRONMENT
Target Version: $TARGET_VERSION
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Initiated by: $(aws sts get-caller-identity --query 'Arn' --output text 2>/dev/null || echo 'unknown')"
    
    print_info "Rollback notification:"
    echo "$message"
    
    # Future: Send to monitoring systems
    # aws sns publish --topic-arn "$SNS_TOPIC" --message "$message"
}

# Function to show rollback summary
show_rollback_summary() {
    print_info "Rollback Summary"
    echo "=================="
    echo "Environment: $ENVIRONMENT"
    echo "Target Version: $TARGET_VERSION"
    echo "Timestamp: $(date)"
    echo "AWS Region: ${AWS_REGION:-us-east-1}"
    
    if [[ "$DRY_RUN" == false ]]; then
        echo ""
        get_current_deployment_info
    fi
    
    print_success "Rollback completed successfully!"
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        print_warning "Production rollback completed. Monitor the application closely."
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --version)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
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

# Main rollback flow
main() {
    print_info "Starting rollback of My Many Books API"
    print_info "======================================"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    # Validate inputs
    validate_environment
    
    # Pre-rollback checks
    check_prerequisites
    
    # Get current state
    get_current_deployment_info
    list_available_versions
    
    # Validate target version
    validate_target_version
    
    # Safety checks
    perform_safety_checks
    
    # Create backup
    create_backup
    
    # Perform rollback
    rollback_lambda_function
    rollback_api_gateway
    
    # Verify rollback
    verify_rollback
    
    # Send notifications
    send_notifications
    
    # Show summary
    show_rollback_summary
}

# Set error handling
trap 'print_error "Rollback failed on line $LINENO"' ERR

# Run main function
main "$@"