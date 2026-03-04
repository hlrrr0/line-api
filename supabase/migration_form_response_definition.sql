-- form_responsesにform_definition_idカラムを追加
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS form_definition_id UUID REFERENCES form_definitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_responses_definition ON form_responses(form_definition_id);
