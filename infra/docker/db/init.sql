-- Herman AI Database Initialization
-- This is run on first MySQL container startup

CREATE DATABASE IF NOT EXISTS herman_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE herman_ai;

-- Tables are created by SQLAlchemy/Alembic migrations
-- This file exists for reference and manual setup

-- Indexes for performance
ALTER TABLE users ADD INDEX idx_users_email (email);
ALTER TABLE users ADD INDEX idx_users_username (username);
ALTER TABLE conversations ADD INDEX idx_conv_user (user_id);
ALTER TABLE conversations ADD INDEX idx_conv_updated (updated_at);
ALTER TABLE messages ADD INDEX idx_msg_conversation (conversation_id);
ALTER TABLE messages ADD INDEX idx_msg_created (created_at);
ALTER TABLE ai_memories ADD INDEX idx_memory_user (user_id);
ALTER TABLE ai_memories ADD INDEX idx_memory_key (user_id, key);
