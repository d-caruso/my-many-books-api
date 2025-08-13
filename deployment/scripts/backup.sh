#!/bin/bash

# ==============================================================================
# My Many Books API Database Backup Script
# ==============================================================================
# This script creates backups of the MySQL database for the My Many Books API
# Usage: ./backup.sh [environment] [options]
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
BACKUP_TYPE="full"
RETENTION_DAYS=7
S3_BUCKET=""
DRY_RUN=false
VERBOSE=false
COMPRESS=true

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
  dev       Backup development database (default)
  staging   Backup staging database
  prod      Backup production database

Options:
  --type TYPE          Backup type: full, schema, data (default: full)
  --retention DAYS     Retention period in days (default: 7)
  --s3-bucket BUCKET   S3 bucket for backup storage (optional)
  --no-compress        Disable compression
  --dry-run           Show what would be backed up without actually doing it
  --verbose           Enable verbose output
  -h, --help          Show this help message

Examples:
  $0 prod                                    # Full backup of production
  $0 dev --type schema                       # Schema-only backup of dev
  $0 staging --s3-bucket my-backups         # Backup to S3
  $0 prod --retention 30 --verbose          # Production backup with 30-day retention

EOF
}

# Function to validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_info "Creating backup for environment: $ENVIRONMENT"
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
    local required_commands=("aws" "mysql" "mysqldump")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check compression tools if needed
    if [[ "$COMPRESS" == true ]]; then
        if ! command -v "gzip" &> /dev/null; then
            print_warning "gzip not found, disabling compression"
            COMPRESS=false
        fi
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get database connection details
get_database_details() {
    print_info "Retrieving database connection details..."
    
    local stack_name="my-many-books-infrastructure-${ENVIRONMENT}"
    
    # Get database endpoint
    DB_HOST=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "")
    
    # Get database port
    DB_PORT=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "3306")
    
    # Get database credentials from Secrets Manager
    local secret_arn
    secret_arn=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
        --output text \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null || echo "")
    
    if [[ -z "$DB_HOST" || -z "$secret_arn" ]]; then
        print_error "Could not retrieve database connection details from CloudFormation"
        print_error "Make sure the infrastructure stack exists: $stack_name"
        exit 1
    fi
    
    # Get credentials from Secrets Manager
    local secret_json
    secret_json=$(aws secretsmanager get-secret-value \
        --secret-id "$secret_arn" \
        --query 'SecretString' \
        --output text \
        --region "${AWS_REGION:-us-east-1}")
    
    DB_USER=$(echo "$secret_json" | jq -r '.username')
    DB_PASSWORD=$(echo "$secret_json" | jq -r '.password')
    DB_NAME="my_many_books"
    
    if [[ "$VERBOSE" == true ]]; then
        print_info "Database details:"
        echo "  Host: $DB_HOST"
        echo "  Port: $DB_PORT"
        echo "  Database: $DB_NAME"
        echo "  User: $DB_USER"
        echo "  Password: [HIDDEN]"
    fi
    
    print_success "Database connection details retrieved"
}

# Function to test database connection
test_database_connection() {
    print_info "Testing database connection..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would test database connection"
        return 0
    fi
    
    if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" &> /dev/null; then
        print_error "Failed to connect to database"
        print_error "Host: $DB_HOST:$DB_PORT"
        print_error "Database: $DB_NAME"
        print_error "User: $DB_USER"
        exit 1
    fi
    
    print_success "Database connection test passed"
}

# Function to create backup directory
create_backup_directory() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/tmp/my-many-books-backup-${ENVIRONMENT}-${timestamp}"
    BACKUP_FILENAME="my-many-books-${ENVIRONMENT}-${BACKUP_TYPE}-${timestamp}.sql"
    
    if [[ "$COMPRESS" == true ]]; then
        BACKUP_FILENAME="${BACKUP_FILENAME}.gz"
    fi
    
    if [[ "$DRY_RUN" == false ]]; then
        mkdir -p "$BACKUP_DIR"
        print_info "Created backup directory: $BACKUP_DIR"
    else
        print_info "DRY RUN: Would create backup directory: $BACKUP_DIR"
    fi
}

# Function to perform database backup
perform_backup() {
    print_info "Starting $BACKUP_TYPE backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would perform $BACKUP_TYPE backup"
        print_info "DRY RUN: Backup file would be: $BACKUP_DIR/$BACKUP_FILENAME"
        return 0
    fi
    
    local mysqldump_args=(
        "-h" "$DB_HOST"
        "-P" "$DB_PORT"
        "-u" "$DB_USER"
        "-p$DB_PASSWORD"
        "--single-transaction"
        "--routines"
        "--triggers"
        "--events"
        "--add-drop-table"
        "--create-options"
        "--disable-keys"
        "--extended-insert"
        "--quick"
        "--lock-tables=false"
    )
    
    # Set backup type specific options
    case "$BACKUP_TYPE" in
        "schema")
            mysqldump_args+=("--no-data")
            ;;
        "data")
            mysqldump_args+=("--no-create-info")
            ;;
        "full")
            # Default options are sufficient for full backup
            ;;
        *)
            print_error "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac
    
    # Add database name
    mysqldump_args+=("$DB_NAME")
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILENAME"
    
    # Perform backup with or without compression
    if [[ "$COMPRESS" == true ]]; then
        print_info "Creating compressed backup..."
        if ! mysqldump "${mysqldump_args[@]}" | gzip > "$backup_path"; then
            print_error "Backup failed"
            exit 1
        fi
    else
        print_info "Creating uncompressed backup..."
        if ! mysqldump "${mysqldump_args[@]}" > "$backup_path"; then
            print_error "Backup failed"
            exit 1
        fi
    fi
    
    # Get backup size
    local backup_size
    backup_size=$(du -h "$backup_path" | cut -f1)
    
    print_success "Backup completed successfully"
    print_info "Backup file: $backup_path"
    print_info "Backup size: $backup_size"
}

# Function to validate backup
validate_backup() {
    print_info "Validating backup file..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would validate backup file"
        return 0
    fi
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILENAME"
    
    # Check if file exists and is not empty
    if [[ ! -f "$backup_path" || ! -s "$backup_path" ]]; then
        print_error "Backup file is missing or empty: $backup_path"
        exit 1
    fi
    
    # Validate compressed file
    if [[ "$COMPRESS" == true ]]; then
        if ! gzip -t "$backup_path" &> /dev/null; then
            print_error "Backup file is corrupted (gzip test failed)"
            exit 1
        fi
    fi
    
    # Check for MySQL dump header
    local file_content
    if [[ "$COMPRESS" == true ]]; then
        file_content=$(zcat "$backup_path" | head -10)
    else
        file_content=$(head -10 "$backup_path")
    fi
    
    if ! echo "$file_content" | grep -q "MySQL dump"; then
        print_error "Backup file does not appear to be a valid MySQL dump"
        exit 1
    fi
    
    print_success "Backup validation passed"
}

# Function to upload to S3
upload_to_s3() {
    if [[ -z "$S3_BUCKET" ]]; then
        print_info "No S3 bucket specified, skipping upload"
        return 0
    fi
    
    print_info "Uploading backup to S3 bucket: $S3_BUCKET"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would upload to s3://$S3_BUCKET/backups/$ENVIRONMENT/$BACKUP_FILENAME"
        return 0
    fi
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILENAME"
    local s3_key="backups/$ENVIRONMENT/$BACKUP_FILENAME"
    
    # Upload with server-side encryption
    if ! aws s3 cp "$backup_path" "s3://$S3_BUCKET/$s3_key" \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA \
        --region "${AWS_REGION:-us-east-1}"; then
        print_error "Failed to upload backup to S3"
        exit 1
    fi
    
    print_success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
    
    # Set lifecycle policy if it doesn't exist
    set_s3_lifecycle_policy
}

# Function to set S3 lifecycle policy
set_s3_lifecycle_policy() {
    print_info "Configuring S3 lifecycle policy for backup retention..."
    
    local lifecycle_config=$(cat << EOF
{
    "Rules": [
        {
            "ID": "my-many-books-backup-retention",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "backups/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 90,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": $((RETENTION_DAYS > 365 ? RETENTION_DAYS : 365))
            }
        }
    ]
}
EOF
)
    
    # Check if lifecycle policy already exists
    if aws s3api get-bucket-lifecycle-configuration --bucket "$S3_BUCKET" &> /dev/null; then
        print_info "S3 lifecycle policy already exists"
    else
        print_info "Creating S3 lifecycle policy..."
        echo "$lifecycle_config" | aws s3api put-bucket-lifecycle-configuration \
            --bucket "$S3_BUCKET" \
            --lifecycle-configuration file:///dev/stdin \
            --region "${AWS_REGION:-us-east-1}" || {
            print_warning "Failed to set lifecycle policy (permissions may be insufficient)"
        }
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    print_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would clean up old backups"
        return 0
    fi
    
    # Clean up local temporary files
    find /tmp -name "my-many-books-backup-${ENVIRONMENT}-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    
    # Clean up S3 backups if S3 bucket is specified
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        print_info "Removing S3 backups older than $cutoff_date..."
        
        # List and delete old backups
        aws s3 ls "s3://$S3_BUCKET/backups/$ENVIRONMENT/" --recursive \
            --region "${AWS_REGION:-us-east-1}" | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_path=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                print_info "Deleting old backup: $file_path"
                aws s3 rm "s3://$S3_BUCKET/$file_path" --region "${AWS_REGION:-us-east-1}" || true
            fi
        done
    fi
    
    print_success "Cleanup completed"
}

# Function to create RDS snapshot (for production)
create_rds_snapshot() {
    if [[ "$ENVIRONMENT" != "prod" ]]; then
        return 0
    fi
    
    print_info "Creating RDS snapshot for production database..."
    
    if [[ "$DRY_RUN" == true ]]; then
        print_info "DRY RUN: Would create RDS snapshot"
        return 0
    fi
    
    local db_instance_id="my-many-books-infrastructure-${ENVIRONMENT}-db"
    local snapshot_id="my-many-books-manual-$(date +%Y%m%d-%H%M%S)"
    
    # Create snapshot
    aws rds create-db-snapshot \
        --db-instance-identifier "$db_instance_id" \
        --db-snapshot-identifier "$snapshot_id" \
        --region "${AWS_REGION:-us-east-1}" || {
        print_warning "Failed to create RDS snapshot (instance may not exist)"
        return 0
    }
    
    print_success "RDS snapshot created: $snapshot_id"
    print_info "Snapshot will be available in a few minutes"
}

# Function to send backup notification
send_backup_notification() {
    print_info "Backup completed successfully"
    
    local message="📦 My Many Books API Database Backup Completed

Environment: $ENVIRONMENT
Backup Type: $BACKUP_TYPE
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
File: $BACKUP_FILENAME"

    if [[ -n "$S3_BUCKET" ]]; then
        message="$message
S3 Location: s3://$S3_BUCKET/backups/$ENVIRONMENT/$BACKUP_FILENAME"
    fi

    message="$message
Retention: $RETENTION_DAYS days"
    
    print_info "Backup notification:"
    echo "$message"
    
    # Future: Send to monitoring systems
    # aws sns publish --topic-arn "$SNS_TOPIC" --message "$message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --s3-bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        --no-compress)
            COMPRESS=false
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

# Main backup flow
main() {
    print_info "Starting database backup for My Many Books API"
    print_info "=============================================="
    
    if [[ "$DRY_RUN" == true ]]; then
        print_warning "DRY RUN MODE - No actual backup will be created"
        echo ""
    fi
    
    # Validate inputs
    validate_environment
    
    # Pre-backup checks
    check_prerequisites
    
    # Get database details
    get_database_details
    
    # Test connection
    test_database_connection
    
    # Create backup directory
    create_backup_directory
    
    # Create RDS snapshot for production
    create_rds_snapshot
    
    # Perform backup
    perform_backup
    
    # Validate backup
    validate_backup
    
    # Upload to S3
    upload_to_s3
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Send notification
    send_backup_notification
    
    # Cleanup temporary files
    if [[ "$DRY_RUN" == false && -d "$BACKUP_DIR" ]]; then
        if [[ -n "$S3_BUCKET" ]]; then
            print_info "Cleaning up local backup file..."
            rm -rf "$BACKUP_DIR"
        else
            print_info "Local backup preserved at: $BACKUP_DIR"
        fi
    fi
    
    print_success "Database backup process completed!"
}

# Set error handling
trap 'print_error "Backup failed on line $LINENO"' ERR

# Run main function
main "$@"