-- Snowflake table setup for Workflow Guardrail demo
-- Run this in Snowflake console before demo

-- Create database and schema if not exists
CREATE DATABASE IF NOT EXISTS POLICY_DB;
USE DATABASE POLICY_DB;
CREATE SCHEMA IF NOT EXISTS PUBLIC;
USE SCHEMA PUBLIC;

-- Create edit history table
CREATE OR REPLACE TABLE EDIT_HISTORY (
    EDIT_ID VARCHAR(50) PRIMARY KEY,
    CLIENT_NAME VARCHAR(100),
    REQUEST_TEXT VARCHAR(500),
    CATEGORY VARCHAR(50),
    SCOPE VARCHAR(50),
    ACTUAL_HOURS NUMBER(10,2),
    ACTUAL_COST NUMBER(10,2),
    AFFECTS_OTHER_ASSETS BOOLEAN
);

-- Insert sample edit history data
INSERT INTO EDIT_HISTORY VALUES
('edit-001', 'Marcus', 'Can we make the sky more blue?', 'color_change', 'single_element', 2, 100, FALSE),
('edit-002', 'Sarah', 'Change the overall color palette to warmer tones', 'color_change', 'global', 16, 800, TRUE),
('edit-003', 'David', 'Add a person sitting on the bench', 'add_element', 'single_element', 4, 200, FALSE),
('edit-004', 'Marcus', 'Remove the trees entirely and replace with buildings', 'composition_change', 'major', 24, 1200, TRUE),
('edit-005', 'Jennifer', 'Change the viewing angle from front to three-quarter view', 'angle_change', 'major', 20, 1000, FALSE),
('edit-006', 'Michael', 'Switch from realistic style to flat illustration', 'style_change', 'major', 32, 1600, TRUE),
('edit-007', 'Sarah', 'Add our tagline below the company name', 'add_element', 'single_element', 2, 100, FALSE),
('edit-008', 'Emily', 'Remove the background pattern completely', 'remove_element', 'single_element', 3, 150, FALSE),
('edit-009', 'David', 'Rearrange all elements to create a new focal point', 'composition_change', 'major', 28, 1400, TRUE),
('edit-010', 'Marcus', 'Add a subtle shadow to the product image', 'add_element', 'single_element', 1, 50, FALSE),
('edit-011', 'Lisa', 'Change from birds eye view to eye-level perspective', 'angle_change', 'major', 24, 1200, TRUE),
('edit-012', 'Robert', 'Convert the photorealistic render to watercolor style', 'style_change', 'major', 36, 1800, TRUE),
('edit-013', 'Jennifer', 'Make the call-to-action button more prominent', 'layout_change', 'single_element', 2, 100, TRUE),
('edit-014', 'Michael', 'Remove the decorative border around the edges', 'remove_element', 'global', 3, 150, FALSE),
('edit-015', 'Sarah', 'Change all headings to uppercase', 'typography', 'global', 4, 200, TRUE),
('edit-016', 'Emily', 'Completely restructure the visual hierarchy', 'composition_change', 'major', 22, 1100, TRUE),
('edit-017', 'David', 'Brighten up the product photography', 'color_change', 'single_element', 3, 150, FALSE),
('edit-018', 'Marcus', 'Switch to a low-angle dramatic perspective', 'angle_change', 'major', 18, 900, FALSE),
('edit-019', 'Lisa', 'Add our social media icons to the corner', 'add_element', 'single_element', 2, 100, FALSE),
('edit-020', 'Robert', 'Change from vector style to hand-drawn sketch', 'style_change', 'major', 28, 1400, TRUE),
('edit-021', 'Jennifer', 'Change the accent color from blue to green', 'color_change', 'global', 6, 300, TRUE),
('edit-022', 'Michael', 'Increase the spacing between all sections', 'layout_change', 'global', 5, 250, TRUE),
('edit-023', 'Sarah', 'Recompose the scene to show more of the environment', 'composition_change', 'major', 26, 1300, TRUE),
('edit-024', 'Emily', 'Replace the stock photo with our team photo', 'add_element', 'single_element', 4, 200, FALSE),
('edit-025', 'David', 'Make the body text larger for readability', 'typography', 'global', 3, 150, TRUE);

-- Verify data
SELECT COUNT(*) as record_count FROM EDIT_HISTORY;
SELECT * FROM EDIT_HISTORY LIMIT 5;
