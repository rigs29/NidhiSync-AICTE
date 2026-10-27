export type Role = 'COLLEGE_USER' | 'AICTE_OFFICER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  institution_id?: number | null;
  institution_name?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface DemoPersona {
  role: Role;
  title: string;
  institution: string;
  email: string;
  password: string;
  description: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
  name: string;
  email: string;
  institution_id?: number | null;
  institution_name?: string | null;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  institution_id?: number | null;
  new_institution_name?: string | null;
  new_institution_code?: string | null;
}

export interface SignupResponse {
  message: string;
  email: string;
  role: Role;
  requires_otp: boolean;
  dev_otp?: string | null;
  verification_link?: string | null;
}

export interface PublicInstitution {
  id: number;
  name: string;
  aicte_code: string;
  state: string;
  institution_type: string;
}

export interface Institution {
  id: number;
  name: string;
  aicte_code: string;
  institution_type: string;
  address: string;
  state: string;
  contact_person: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  fdr_count?: number;
  total_fdr_amount?: number;
}

export interface OcrExtractedFields {
  fdr_number?: string | null;
  bank_name?: string | null;
  amount?: number | string | null;
  issue_date?: string | null;
  maturity_date?: string | null;
}

export interface OcrResult {
  status: 'EXTRACTED' | 'MANUAL_REVIEW_REQUIRED' | 'EMPTY_OR_CORRUPTED_FILE' | string;
  source_modality?: string;
  engine?: string;
  confidence?: number;
  fields_extracted_count?: number;
  extracted_fields?: OcrExtractedFields;
  evidence_snippets?: Record<string, string>;
  notice?: string;
}

export interface DocumentRecord {
  id: number;
  fdr_id: number;
  storage_provider: string;
  storage_key?: string | null;
  original_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  download_url?: string | null;
  ocr_extraction?: OcrResult | null;
}

export interface VerificationRecord {
  id: number;
  fdr_id: number;
  reviewer_id?: number | null;
  reviewer_name?: string | null;
  verification_method: string;
  outcome: 'VERIFIED' | 'CLARIFICATION_REQUIRED' | 'DISCREPANCY_DETECTED' | 'REJECTED' | string;
  observations: string;
  supporting_reference?: string | null;
  created_at: string;
}

export type AdministrativeStatus = 
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'CLARIFICATION_REQUIRED'
  | 'DISCREPANCY_DETECTED'
  | 'REJECTED'
  | 'RENEWAL_SUBMITTED'
  | 'RELEASE_APPROVED'
  | 'RELEASED';

export type MaturityStatus = 'ACTIVE' | 'APPROACHING_MATURITY' | 'MATURED';

export interface FDRRecord {
  id: number;
  institution_id: number;
  institution_name?: string | null;
  aicte_code?: string | null;
  fdr_number: string;
  bank_name: string;
  branch_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  maturity_date: string;
  deposit_type: string;
  administrative_status: AdministrativeStatus;
  maturity_status: MaturityStatus;
  verification_status: string;
  scrutiny_remarks?: string | null;
  original_fdr_id?: number | null;
  days_to_maturity?: number;
  documents?: DocumentRecord[];
  verifications?: VerificationRecord[];
  created_at: string;
  updated_at: string;
}

export interface RenewalRecord {
  id: number;
  original_fdr_id: number;
  original_fdr_number?: string | null;
  replacement_fdr_id: number;
  replacement_fdr_number?: string | null;
  submission_date: string;
  status: string;
  remarks?: string | null;
  created_at: string;
}

export interface ReleaseRequest {
  id: number;
  fdr_id: number;
  fdr_number?: string | null;
  institution_id: number;
  institution_name?: string | null;
  amount?: number | null;
  requester_id?: number | null;
  requester_name?: string | null;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'CLARIFICATION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | string;
  reviewer_id?: number | null;
  reviewer_name?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: number;
  recipient_id: number;
  fdr_id?: number | null;
  fdr_number?: string | null;
  notification_type: 'MATURITY_ALERT' | 'SCRUTINY_UPDATE' | 'RENEWAL_ALERT' | 'RELEASE_UPDATE' | string;
  subject: string;
  message: string;
  due_date?: string | null;
  is_read: boolean;
  delivery_provider: string;
  delivery_status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  result: string;
  metadata_json?: any;
  ip_address?: string | null;
  created_at: string;
}

export interface CollegeDashboardStats {
  total_fdrs: number;
  active_fdrs: number;
  approaching_maturity: number;
  matured: number;
  under_verification: number;
  clarification_required: number;
  renewals_in_progress: number;
  pending_release_requests: number;
  total_deposit_amount: number;
}

export interface OfficerDashboardStats {
  total_institutions: number;
  total_fdrs: number;
  pending_scrutiny: number;
  upcoming_maturities: number;
  matured_unresolved: number;
  discrepancy_cases: number;
  renewals_awaiting_review: number;
  pending_release_requests: number;
  total_portfolio_amount: number;
}

export interface AdminDashboardStats {
  total_institutions: number;
  total_users: number;
  total_fdrs: number;
  total_amount: number;
  system_health: string;
  last_maturity_job?: any;
  recent_audit_count: number;
  status_distribution: Record<string, number>;
  bank_distribution: Record<string, number>;
}

export interface AnalyticsData {
  status_distribution: { name: string; value: number }[];
  bank_distribution: { bank: string; amount: number }[];
  maturity_timeline: { bucket: string; count: number }[];
}

export interface FieldComparison {
  field: string;
  label: string;
  submitted: any;
  extracted: any;
  overridden?: boolean;
  matches: boolean | null;
  needs_manual_review: boolean;
  evidence?: string | null;
}

export interface OcrComparisonState {
  has_document: boolean;
  document_id?: number;
  extraction_status: string;
  source_modality?: string;
  engine?: string;
  confidence?: number;
  mismatches: string[];
  missing_fields: string[];
  field_comparisons: FieldComparison[];
  notice?: string;
}

