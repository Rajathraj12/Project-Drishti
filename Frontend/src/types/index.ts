export type UserRole = 
  | 'Admin'
  | 'Government Officer'
  | 'Field Officer'
  | 'Implementing Agency'
  | 'Citizen';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  state?: string;
  district?: string;
  department?: string;
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
  
  // Frontend helpers
  risk_score?: number;
  risk_status?: 'High Risk' | 'Medium Risk' | 'Low Risk';
  multiState?: boolean;
  states?: string[];
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
