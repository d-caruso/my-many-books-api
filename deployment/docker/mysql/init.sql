-- Development database initialization script
-- This script sets up the initial database structure and data for development

-- Ensure we're using the correct database
USE my_many_books_dev;

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create additional indexes for better performance in development
-- Note: The main schema is created by Sequelize migrations

-- Create additional development-specific configurations
-- Add any development-specific database configurations here

-- Grant additional permissions for development
GRANT ALL PRIVILEGES ON my_many_books_dev.* TO 'api_user'@'%';
FLUSH PRIVILEGES;

-- Create test database if it doesn't exist
CREATE DATABASE IF NOT EXISTS my_many_books_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON my_many_books_test.* TO 'api_user'@'%';

-- Log the initialization
INSERT INTO mysql.general_log (event_time, user_host, thread_id, server_id, command_type, argument) 
VALUES (NOW(), 'init@localhost', CONNECTION_ID(), @@server_id, 'Init', 'Development database initialized');

-- Show database information
SELECT 
    'Development database initialized successfully' AS status,
    DATABASE() AS current_database,
    VERSION() AS mysql_version,
    USER() AS current_user;