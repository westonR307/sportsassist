// Document and signature related types
export type DocumentType = 'waiver' | 'agreement' | 'consent' | 'policy' | 'custom';
export type DocumentStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type SignatureStatus = 'pending' | 'signed' | 'expired' | 'declined' | 'revoked';
export type SignatureFieldType = 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
export type AuditAction = 'created' | 'viewed' | 'signed' | 'sent' | 'modified' | 'expired' | 'declined' | 'revoked';