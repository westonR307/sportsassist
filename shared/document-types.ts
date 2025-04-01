// Document and signature related types
export type DocumentType = 'waiver' | 'agreement' | 'consent' | 'policy' | 'custom';
export type DocumentStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type SignatureStatus = 'pending' | 'signed' | 'expired' | 'declined' | 'revoked';
export type SignatureFieldType = 'signature' | 'initial' | 'date' | 'text' | 'checkbox' | 'dynamic_field';
export type DynamicFieldSource = 
  | 'athlete_name' | 'athlete_dob' | 'athlete_gender' 
  | 'athlete_emergency_contact' | 'athlete_emergency_phone' | 'athlete_emergency_relation' 
  | 'athlete_allergies' | 'athlete_medical_conditions' | 'athlete_medications'
  | 'athlete_special_needs' | 'athlete_jersey_size' | 'athlete_shoe_size'
  | 'parent_name' | 'parent_email' | 'parent_phone'
  | 'camp_name' | 'camp_dates' | 'camp_location';
export type AuditAction = 'created' | 'viewed' | 'signed' | 'sent' | 'modified' | 'expired' | 'declined' | 'revoked';