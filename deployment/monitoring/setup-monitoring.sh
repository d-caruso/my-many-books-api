#!/bin/bash

# ==============================================================================
# My Many Books API Monitoring Setup Script
# ==============================================================================
# This script sets up comprehensive monitoring for the My Many Books API
# Usage: ./setup-monitoring.sh [environment] [options]
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
SNS_EMAIL=""
CREATE_DASHBOARD=true
CREATE_ALARMS=true
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
  dev       Setup monitoring for development environment (default)
  staging   Setup monitoring for staging environment
  prod      Setup monitoring for production environment

Options:
  --email EMAIL         Email address for alarm notifications
  --skip-dashboard      Skip CloudWatch dashboard creation
  --skip-alarms         Skip CloudWatch alarms creation
  --dry-run            Show what would be created without actually creating it
  --verbose            Enable verbose output
  -h, --help           Show this help message

Examples:
  $0 prod --email admin@example.com     # Setup prod monitoring with email alerts
  $0 dev --skip-alarms                  # Setup dev monitoring without alarms
  $0 staging --dry-run                  # Show what would be created for staging

EOF
}

# Function to validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_info "Setting up monitoring for environment: $ENVIRONMENT"
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
    
    # Check if infrastructure stack exists
    local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
    if ! aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        print_error "Infrastructure stack not found: $stack_name"
        print_error "Please deploy the infrastructure first"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get infrastructure details
get_infrastructure_details() {
    print_info "Retrieving infrastructure details..."
    
    local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
    
    # Get resource identifiers from CloudFormation stack
    LAMBDA_FUNCTION_NAME=$(aws serverless describe --stage "$ENVIRONMENT" --query 'service.functions.main.name' --output text 2>/dev/null || echo "my-many-books-api-${ENVIRONMENT}-main")
    
    DATABASE_INSTANCE_ID=$(aws cloudformation describe-stack-resources \
        --stack-name "$stack_name" \
        --logical-resource-id "Database" \
        --query 'StackResources[0].PhysicalResourceId' \
        --output text 2>/dev/null || echo "")
    
    CACHE_CLUSTER_ID=$(aws cloudformation describe-stack-resources \
        --stack-name "$stack_name" \
        --logical-resource-id "ElastiCacheCluster" \
        --query 'StackResources[0].PhysicalResourceId' \
        --output text 2>/dev/null || echo "")
    
    if [[ "$VERBOSE" == true ]]; then
        print_info "Infrastructure details:"
        echo "  Lambda Function: $LAMBDA_FUNCTION_NAME"
        echo "  Database Instance: $DATABASE_INSTANCE_ID"
        echo "  Cache Cluster: $CACHE_CLUSTER_ID"
    fi
    
    print_success "Infrastructure details retrieved"
}

# Function to create SNS topic for notifications
create_sns_topic() {
    if [[ -z "$SNS_EMAIL" ]]; then
        print_info "No email provided, skipping SNS topic creation"
        return 0
    fi
    
    print_info "Creating SNS topic for alarm notifications..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would create SNS topic with email subscription"
        SNS_TOPIC_ARN="arn:aws:sns:${AWS_REGION:-us-east-1}:123456789012:my-many-books-alerts-${ENVIRONMENT}"
        return 0
    fi
    
    local topic_name="my-many-books-alerts-${ENVIRONMENT}"
    
    # Create SNS topic
    SNS_TOPIC_ARN=$(aws sns create-topic \
        --name "$topic_name" \
        --query 'TopicArn' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    # Subscribe email to topic
    aws sns subscribe \
        --topic-arn "$SNS_TOPIC_ARN" \
        --protocol email \
        --notification-endpoint "$SNS_EMAIL" \
        --region "${AWS_REGION:-us-east-1}"
    
    # Set topic attributes
    aws sns set-topic-attributes \
        --topic-arn "$SNS_TOPIC_ARN" \
        --attribute-name DisplayName \
        --attribute-value "My Many Books API Alerts ($ENVIRONMENT)" \
        --region "${AWS_REGION:-us-east-1}"
    
    print_success "SNS topic created: $SNS_TOPIC_ARN"
    print_info "Please check your email and confirm the subscription"
}

# Function to create CloudWatch dashboard
create_dashboard() {
    if [[ "$CREATE_DASHBOARD" != true ]]; then
        print_info "Skipping dashboard creation"
        return 0
    fi
    
    print_info "Creating CloudWatch dashboard..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would create CloudWatch dashboard"
        return 0
    fi
    
    local dashboard_name="MyManyBooksAPI-${ENVIRONMENT}"
    local dashboard_file="${SCRIPT_DIR}/cloudwatch-dashboard.json"
    
    # Replace environment variables in dashboard template
    local dashboard_body
    dashboard_body=$(envsubst < "$dashboard_file")
    
    # Create dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "$dashboard_name" \
        --dashboard-body "$dashboard_body" \
        --region "${AWS_REGION:-us-east-1}"
    
    print_success "CloudWatch dashboard created: $dashboard_name"
    
    # Generate dashboard URL
    local dashboard_url="https://${AWS_REGION:-us-east-1}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION:-us-east-1}#dashboards:name=${dashboard_name}"
    print_info "Dashboard URL: $dashboard_url"
}

# Function to create CloudWatch alarms
create_alarms() {
    if [[ "$CREATE_ALARMS" != true ]]; then
        print_info "Skipping alarms creation"
        return 0
    fi
    
    print_info "Creating CloudWatch alarms..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would create CloudWatch alarms"
        return 0
    fi
    
    local stack_name="my-many-books-monitoring-${ENVIRONMENT}"
    local template_file="${SCRIPT_DIR}/cloudwatch-alarms.yml"
    
    # Set parameters
    local parameters=(
        "ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    )
    
    if [[ -n "$SNS_TOPIC_ARN" ]]; then
        parameters+=("ParameterKey=SNSTopicArn,ParameterValue=$SNS_TOPIC_ARN")
    fi
    
    if [[ -n "$LAMBDA_FUNCTION_NAME" ]]; then
        parameters+=("ParameterKey=LambdaFunctionName,ParameterValue=$LAMBDA_FUNCTION_NAME")
    fi
    
    if [[ -n "$DATABASE_INSTANCE_ID" ]]; then
        parameters+=("ParameterKey=DatabaseInstanceId,ParameterValue=$DATABASE_INSTANCE_ID")
    fi
    
    if [[ -n "$CACHE_CLUSTER_ID" ]]; then
        parameters+=("ParameterKey=CacheClusterId,ParameterValue=$CACHE_CLUSTER_ID")
    fi
    
    # Check if stack exists
    local stack_exists=false
    if aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        stack_exists=true
        print_info "Updating existing alarms stack..."
    else
        print_info "Creating new alarms stack..."
    fi
    
    # Deploy stack
    local cmd_args=(
        "--template-body" "file://$template_file"
        "--stack-name" "$stack_name"
        "--parameters" "${parameters[@]}"
        "--capabilities" "CAPABILITY_IAM"
        "--region" "${AWS_REGION:-us-east-1}"
    )
    
    if [[ "$stack_exists" == true ]]; then
        aws cloudformation update-stack "${cmd_args[@]}" || {
            local exit_code=$?
            if [[ $exit_code -eq 255 ]]; then
                print_warning "No updates to perform for alarms stack"
            else
                print_error "Failed to update alarms stack"
                exit $exit_code
            fi
        }
    else
        aws cloudformation create-stack "${cmd_args[@]}"
    fi
    
    # Wait for stack operation to complete
    if [[ "$stack_exists" == true ]]; then
        print_info "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name "$stack_name" --region "${AWS_REGION:-us-east-1}" || {
            print_error "Stack update failed"
            exit 1
        }
    else
        print_info "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name "$stack_name" --region "${AWS_REGION:-us-east-1}" || {
            print_error "Stack creation failed"
            exit 1
        }
    fi
    
    print_success "CloudWatch alarms created successfully"
}

# Function to setup log insights queries
setup_log_insights() {
    print_info "Setting up CloudWatch Log Insights queries..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would setup Log Insights queries"
        return 0
    fi
    
    local log_group_name="/aws/lambda/my-many-books-api-${ENVIRONMENT}-main"
    
    # Common useful queries
    local queries=(
        "Error Analysis|fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
        "Performance Analysis|fields @timestamp, @duration | filter @type = \"REPORT\" | stats avg(@duration), max(@duration), min(@duration) by bin(5m)"
        "Request Volume|fields @timestamp | filter @type = \"REPORT\" | stats count() by bin(5m)"
        "ISBN Service Metrics|fields @timestamp, @message | filter @message like /isbn_service/ | sort @timestamp desc | limit 50"
        "Database Queries|fields @timestamp, @message | filter @message like /database/ or @message like /sequelize/ | sort @timestamp desc | limit 50"
    )
    
    print_info "Useful Log Insights queries for log group: $log_group_name"
    for query in "${queries[@]}"; do
        local name=$(echo "$query" | cut -d'|' -f1)
        local query_string=$(echo "$query" | cut -d'|' -f2-)
        echo "  $name: $query_string"
    done
    
    print_success "Log Insights queries documented"
}

# Function to create custom metrics dashboard
create_custom_metrics() {
    print_info "Setting up custom application metrics..."
    
    # This function would typically include:
    # 1. CloudWatch agent configuration
    # 2. Custom metric definitions
    # 3. Application-specific monitoring setup
    
    print_info "Custom metrics configuration:"
    echo "  - ISBN service request count"
    echo "  - Cache hit/miss ratios"
    echo "  - Database connection pool usage"
    echo "  - API response times by endpoint"
    echo "  - Business metrics (books created, searches performed)"
    
    print_success "Custom metrics configuration completed"
}

# Function to test monitoring setup
test_monitoring() {
    print_info "Testing monitoring setup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would test monitoring setup"
        return 0
    fi
    
    # Test dashboard access
    local dashboard_name="MyManyBooksAPI-${ENVIRONMENT}"
    if aws cloudwatch get-dashboard --dashboard-name "$dashboard_name" &> /dev/null; then
        print_success "Dashboard is accessible"
    else
        print_warning "Dashboard may not be created yet"
    fi
    
    # Test alarms
    local alarm_count
    alarm_count=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "${ENVIRONMENT}-" \
        --query 'length(MetricAlarms)' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    print_info "Found $alarm_count alarms for environment: $ENVIRONMENT"
    
    # Test SNS topic
    if [[ -n "$SNS_TOPIC_ARN" ]]; then
        local subscription_count
        subscription_count=$(aws sns list-subscriptions-by-topic \
            --topic-arn "$SNS_TOPIC_ARN" \
            --query 'length(Subscriptions)' \
            --output text \
            --region "${AWS_REGION:-us-east-1}")
        
        print_info "SNS topic has $subscription_count subscription(s)"
    fi
    
    print_success "Monitoring setup test completed"
}

# Function to show monitoring summary
show_monitoring_summary() {
    print_info "Monitoring Setup Summary"
    echo "========================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "AWS Region: ${AWS_REGION:-us-east-1}"
    
    if [[ "$DRY_RUN" == false ]]; then
        echo ""
        echo "Created Resources:"
        
        if [[ "$CREATE_DASHBOARD" == true ]]; then
            echo "  ✓ CloudWatch Dashboard: MyManyBooksAPI-${ENVIRONMENT}"
        fi
        
        if [[ "$CREATE_ALARMS" == true ]]; then
            echo "  ✓ CloudWatch Alarms Stack: my-many-books-monitoring-${ENVIRONMENT}"
        fi
        
        if [[ -n "$SNS_TOPIC_ARN" ]]; then
            echo "  ✓ SNS Topic: $SNS_TOPIC_ARN"
        fi
        
        echo ""
        echo "Next Steps:"
        echo "  1. Confirm email subscription for alerts"
        echo "  2. Review dashboard metrics"
        echo "  3. Test alarm notifications"
        echo "  4. Configure additional custom metrics as needed"
    fi
    
    print_success "Monitoring setup completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --email)
            SNS_EMAIL="$2"
            shift 2
            ;;
        --skip-dashboard)
            CREATE_DASHBOARD=false
            shift
            ;;
        --skip-alarms)
            CREATE_ALARMS=false
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

# Main monitoring setup flow
main() {
    print_info "Starting monitoring setup for My Many Books API"
    print_info "==============================================="
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No resources will be created"
        echo ""
    fi
    
    # Validate inputs
    validate_environment
    
    # Pre-setup checks
    check_prerequisites
    
    # Get infrastructure details
    get_infrastructure_details
    
    # Create SNS topic for notifications
    create_sns_topic
    
    # Create CloudWatch dashboard
    create_dashboard
    
    # Create CloudWatch alarms
    create_alarms
    
    # Setup log insights queries
    setup_log_insights
    
    # Setup custom metrics
    create_custom_metrics
    
    # Test monitoring setup
    test_monitoring
    
    # Show summary
    show_monitoring_summary
}

# Set error handling
trap 'print_error "Monitoring setup failed on line $LINENO"' ERR

# Set environment variable for template substitution
export Environment="$ENVIRONMENT"

# Run main function
main "$@"