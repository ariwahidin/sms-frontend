// ── Enums ─────────────────────────────────────────────────────────────────────
export type ReportStatus =
  | "declaration"
  | "classification"
  | "investigation"
  | "approval"
  | "closed";

export type RiskLevel = "low" | "medium" | "high";
export type Priority = "low" | "medium" | "high";
export type Role = "admin" | "pic" | "hod";

// ── Models ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: Role;
  department_id?: number;
  department?: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  site: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  site: string;
  area_name: string;
  qr_token: string;
  // departemen yang bertanggung jawab/memiliki area ini (Occurrence
  // Department sesuai SOP) — tetap per lokasi, di-set saat lokasi dibuat,
  // dan ikut ter-prefill otomatis saat QR di-scan.
  department_id?: number;
  department?: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportActivity {
  id: number;
  report_id: number;
  action: string;
  from_status: ReportStatus;
  to_status: ReportStatus;
  notes: string;
  by_user_id?: number;
  by_user_name: string;
  created_at: string;
}

export interface ReportFile {
  id: number;
  report_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: number;
  created_at: string;
}

export interface RiskReport {
  id: number;
  code: string;
  location_id?: number;
  location?: Location;
  department_id?: number;
  department?: Department;
  description: string;
  risk_level_origin?: RiskLevel;
  risk_level: RiskLevel;
  priority: Priority;
  status: ReportStatus;
  reporter_name: string;

  // Classification
  pic_id?: number;
  pic?: User;
  pic_notes: string;
  classified_at?: string;
  classified_by?: number;

  // Investigation
  root_cause: string;
  countermeasures: string;
  investigated_at?: string;
  investigated_by?: number;

  // Approval
  hod_comment: string;
  approved_at?: string;
  approved_by?: number;
  rejected_at?: string;
  rejected_by?: number;

  // SLA
  sla_deadline_classification?: string;
  sla_deadline_investigation?: string;
  sla_deadline_approval?: string;
  is_overdue: boolean;

  files?: ReportFile[];
  activities?: ReportActivity[];

  created_at: string;
  updated_at: string;
}

// ── API Response Shapes ───────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  total: number;
  by_status: Record<ReportStatus, number>;
  by_risk: Record<RiskLevel, number>;
  overdue: number;
}

// ── Request Payloads ──────────────────────────────────────────────────────────
export interface DeclarePayload {
  location_id?: number;
  department_id?: number;
  description: string;
  risk_level: RiskLevel;
  reporter_name?: string;
}

export interface ClassifyPayload {
  location_id?: number;
  department_id?: number;
  risk_level: RiskLevel;
  priority: Priority;
  pic_id?: number;
  notes?: string;
}

export interface InvestigatePayload {
  root_cause: string;
  countermeasures: string;
}

export interface CreateLocationPayload {
  site: string;
  area_name: string;
  department_id?: number;
}

export interface ReportFilters {
  status?: ReportStatus | "";
  site?: string;
  department_id?: number | "";
  risk_level?: RiskLevel | "";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}