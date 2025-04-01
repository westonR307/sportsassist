-- Add missing "order" column to document_fields table
ALTER TABLE document_fields RENAME COLUMN order_index TO "order";