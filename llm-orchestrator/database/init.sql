-- database/init.sql
-- Note: The database 'llm_orchestrator' is created by Docker environment variable POSTGRES_DB
-- So we don't need to create it here, just connect to it

\c llm_orchestrator;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_phase VARCHAR(50) DEFAULT 'Planning',
    orchestrator_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('cloud', 'local')),
    provider VARCHAR(100),
    endpoint VARCHAR(500),
    api_key_ref VARCHAR(255),
    capabilities JSONB DEFAULT '{}'::jsonb,
    rate_limits JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'disconnected',
    last_health_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    parent_task_id UUID,
    model_id UUID REFERENCES models(id),
    type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    input_prompt TEXT,
    output_result TEXT,
    framework VARCHAR(100),
    validation_status VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Add more tables for complete system
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    state_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    description TEXT
);

CREATE TABLE IF NOT EXISTS frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    definition JSONB NOT NULL,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_checkpoints_project_id ON checkpoints(project_id);
CREATE INDEX idx_frameworks_name ON frameworks(name);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frameworks_updated_at BEFORE UPDATE ON frameworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
