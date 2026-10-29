export type UserRole =
  | 'ADMIN'
  | 'GOVERNMENT_OFFICER'
  | 'FIELD_OFFICER'
  | 'CITIZEN';

export interface User {
  id: string | number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  state?: string;
  district?: string;
  department?: string;
  assigned_project_ids?: string[];
  dev_bypass?: boolean;
  is_active?: boolean;
  full_name?: string;
}

export interface State {
  id: string;
  name: string;
  code: string;
}

export interface District {
  id: string;
  state_id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Scheme {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Project {
  project_id: string;
  source_project_id: string;
  project_name: string;
  project_description?: string;
  state: string;
  district: string;
  scheme?: string;
  department: string;
  project_category?: string;
  work_type?: string;
  location_from?: string;
  location_to?: string;
  length_or_quantity?: string;
  latitude?: number;
  longitude?: number;
  original_cost: number;
  revised_cost?: number;
  expenditure: number;
  original_end_date: string; // ISO date string
  revised_end_date?: string; // ISO date string
  reported_progress: number;
  expected_progress: number;
  data_source_type: string;
  source_url?: string;
  last_source_update: string; // ISO date string
  verification_status: 'NOT_REVIEWED' | 'IN_REVIEW' | 'VERIFIED' | 'CLOSED';

  // Future derived fields
  financial_utilization_pct?: number;
  cost_deviation_pct?: number;
  delay_days?: number;
  progress_gap_pct?: number;
  expenditure_progress_ratio?: number;
  original_cost_cr?: number;
  revised_cost_cr?: number;
  expenditure_cr?: number;
  cost_overrun_cr?: number;
  reported_progress_pct?: number;
  source_name?: string;
  source_reference?: string;
  source_as_of_date?: string;
  sector?: string;
  is_public?: boolean;
  
  // Frontend helpers
  risk_score?: number;
  risk_status?: 'High Risk' | 'Medium Risk' | 'Low Risk';
  multiState?: boolean;
  states?: string[];
  risk_level?: string;
  ml_anomaly_score?: number | null;
  anomaly_flag?: boolean | null;
  anomaly_status?: string;
  ml_explanation?: string | null;
  inspection_checklist?: Record<string, boolean>;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  target_date: string;
  actual_completion_date?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
}

export interface FinancialRecord {
  id: string;
  project_id: string;
  amount: number;
  date: string;
  type: 'Allocation' | 'Expenditure';
  description?: string;
}

export interface Evidence {
  id: string;
  project_id: string;
  uploaded_by: string;
  upload_date: string;
  file_url: string;
  evidence_type: 'Photo' | 'Document' | 'Satellite';
  latitude?: number;
  longitude?: number;
  description?: string;
}

export interface RiskAssessment {
  id: string;
  project_id: string;
  assessment_date: string;
  risk_score: number;
  risk_factors: string[];
  anomalies_detected: string[];
}

export interface Inspection {
  id: string;
  project_id: string;
  assigned_to: string;
  inspection_date?: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Review';
  findings?: string;
  created_at: string;
}

export interface ActionCase {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_to: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
}

export interface CitizenReport {
  id: string;
  project_id?: string;
  location: string;
  description: string;
  status: 'Pending' | 'Reviewed' | 'Action Taken' | 'Dismissed';
  created_at: string;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  details?: string;
}

export type ActionLifecycleStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

export type ActionPriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProgressUpdateItem {
  update_id: string;
  actor_id?: string;
  actor_name: string;
  actor_role: string;
  message: string;
  supporting_evidence?: string[];
  progress_pct?: number;
  timestamp: string;
}

export interface ActionAuditEvent {
  event_id: string;
  event_type: string;
  actor_id?: string;
  actor_username: string;
  actor_role: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface CorrectiveAction {
  action_id: string;
  project_id: string;
  title: string;
  description: string;
  reason: string;
  priority: ActionPriorityLevel;
  status: ActionLifecycleStatus;
  assigned_to?: string | null;
  assigned_agency?: string | null;
  created_by: string;
  creator_role: string;
  created_at: string;
  updated_at: string;
  due_date: string;
  is_overdue: boolean;
  days_overdue: number;
  days_remaining?: number | null;
  escalation_level: string;
  notification_dispatch_status: string;

  // Finding linkages
  risk_assessment_id?: string | null;
  ml_assessment_id?: string | null;
  verification_id?: string | null;
  observation?: string | null;
  evidence_ids?: string[];

  // Progress & Resolution
  progress_updates: ProgressUpdateItem[];
  resolution_summary?: string | null;
  resolution_submitted_by?: string | null;
  resolution_submitted_at?: string | null;
  closure_reviewer?: string | null;
  closure_reviewed_at?: string | null;
  closure_notes?: string | null;
  reopen_reason?: string | null;
  cancellation_reason?: string | null;
  audit_history: ActionAuditEvent[];
}

