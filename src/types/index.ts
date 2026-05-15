// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "DEPARTMENT_OFFICER" | "DATA_ENTRY" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type SchemeStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type ProjectStatus = "PLANNED" | "ONGOING" | "COMPLETED" | "ON_HOLD";
export type BeneficiaryStatus = "IDENTIFIED" | "VERIFIED" | "APPROVED" | "SUPPORTED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type LogframeLevel =
  | "OUTREACH"
  | "GOAL"
  | "DEVELOPMENT_OBJECTIVE"
  | "OUTCOME"
  | "OUTPUT"
  | "SUB_OUTPUT"
  | "INDICATOR_GROUP";
export type IndicatorFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "ANNUAL"
  | "BIENNIAL"
  | "MID_TERM"
  | "END_TERM"
  | "AD_HOC";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user?: User;
}

// ─── Schemes ──────────────────────────────────────────────────────────────────
export interface Scheme {
  id: number;
  title: string;
  code: string;
  description?: string;
  department: string;
  status: SchemeStatus;
  budget: number;
  utilizedBudget: number;
  targetBeneficiaries: number;
  achievedBeneficiaries: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { fullName: string; email: string };
  _count?: { projects: number; beneficiaries: number };
}

export interface CreateSchemeDto {
  title: string;
  code: string;
  description?: string;
  department: string;
  budget?: number;
  targetBeneficiaries?: number;
  startDate?: string;
  endDate?: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  department: string;
  district?: string;
  block?: string;
  village?: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  budget: number;
  utilizedBudget: number;
  targetCount: number;
  achievedCount: number;
  beneficiaryCount: number;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  schemeId?: number;
  scheme?: { title: string; code: string };
  createdBy?: { fullName: string };
}

export interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  department: string;
  district?: string;
  block?: string;
  priority?: PriorityLevel;
  budget?: number;
  targetCount?: number;
  startDate?: string;
  endDate?: string;
  schemeId?: number;
}

// ─── Beneficiaries ────────────────────────────────────────────────────────────
export interface Beneficiary {
  id: number;
  fullName: string;
  referenceNumber: string;
  gender?: string;
  age?: number;
  district?: string;
  block?: string;
  village?: string;
  isYouth: boolean;
  isWoman: boolean;
  isBpl: boolean;
  isGeneral: boolean;
  status: BeneficiaryStatus;
  sanctionedAmount: number;
  phone?: string;
  remarks?: string;
  createdAt: string;
  scheme?: { title: string };
  project?: { name: string };
}

export interface CreateBeneficiaryDto {
  fullName: string;
  gender?: string;
  age?: number;
  district?: string;
  block?: string;
  village?: string;
  isYouth?: boolean;
  isWoman?: boolean;
  isBpl?: boolean;
  phone?: string;
  remarks?: string;
  schemeId?: number;
  projectId?: number;
}

// ─── Approvals ────────────────────────────────────────────────────────────────
export interface Approval {
  id: number;
  title: string;
  referenceNo: string;
  entityType: string;
  department: string;
  status: ApprovalStatus;
  priority: PriorityLevel;
  remarks?: string;
  dueDate?: string;
  decisionAt?: string;
  createdAt: string;
  projectId?: number;
  project?: { name: string };
  requestedBy?: { fullName: string; email: string };
  reviewedBy?: { fullName: string; email: string };
}

export interface CreateApprovalDto {
  title: string;
  entityType: string;
  department: string;
  priority?: PriorityLevel;
  remarks?: string;
  dueDate?: string;
  projectId?: number;
}

export interface UpdateApprovalStatusDto {
  status: ApprovalStatus;
  remarks?: string;
}

// ─── Logframe ─────────────────────────────────────────────────────────────────
export interface IndicatorYearProgress {
  id: number;
  reportYear: number;
  annualTarget?: number;
  annualResult?: number;
  cumulativeTarget?: number;
  cumulativeResult?: number;
  maleValue?: number;
  femaleValue?: number;
  youthValue?: number;
  indigenousValue?: number;
  householdValue?: number;
  womenHeadedHouseholdValue?: number;
  bplValue?: number;
  generalValue?: number;
  district?: string;
  block?: string;
  village?: string;
  evidenceSource?: string;
  remarks?: string;
  reportingMonth?: number;
  lastReportedAt?: string;
  verifiedAt?: string;
  verifiedBy?: { fullName: string; email: string };
}

export interface Indicator {
  id: number;
  code: string;
  name: string;
  description?: string;
  unit?: string;
  baseline?: number;
  midTarget?: number;
  endTarget?: number;
  frequency: IndicatorFrequency;
  source?: string;
  responsibility?: string;
  department?: string;
  sector?: string;
  crop?: string;
  tags: string[];
  active: boolean;
  supportsGenderBreakdown: boolean;
  supportsYouthBreakdown: boolean;
  supportsIndigenousBreakdown: boolean;
  supportsHouseholdBreakdown: boolean;
  supportsDistrictBreakdown: boolean;
  supportsBlockBreakdown: boolean;
  yearlyProgress: IndicatorYearProgress[];
  progressPercent: number;
  gap: number;
  latestProgress?: IndicatorYearProgress | null;
  logframeNode?: LogframeNode;
  logframeNodeId: number;
}

export interface LogframeNode {
  id: number;
  title: string;
  code: string;
  level: LogframeLevel;
  description?: string;
  sortOrder: number;
  active: boolean;
  parentId?: number;
  children: LogframeNode[];
  indicators: Indicator[];
}

export interface LogframeDashboard {
  totalNodes: number;
  totalIndicators: number;
  activeIndicators: number;
  indicatorsWithData: number;
  achievedIndicators: number;
  achievementRate: number;
  totals: {
    annualTarget: number;
    annualResult: number;
    cumulativeTarget: number;
    cumulativeResult: number;
    annualAchievementPercent: number;
    cumulativeAchievementPercent: number;
  };
  byLevel: Array<{ level: string; indicators: number; totals: any }>;
}

export interface OutcomePerformance {
  id: number;
  code: string;
  title: string;
  indicators: number;
  achievedIndicators: number;
  achievementRate: number;
  totals: any;
}

export interface UpsertProgressDto {
  reportYear: number;
  annualTarget?: number;
  annualResult?: number;
  cumulativeTarget?: number;
  cumulativeResult?: number;
  maleValue?: number;
  femaleValue?: number;
  youthValue?: number;
  indigenousValue?: number;
  householdValue?: number;
  womenHeadedHouseholdValue?: number;
  bplValue?: number;
  generalValue?: number;
  district?: string;
  block?: string;
  village?: string;
  evidenceSource?: string;
  remarks?: string;
  reportingMonth?: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalSchemes: number;
  totalProjects: number;
  totalBeneficiaries: number;
  pendingApprovals: number;
  activeSchemes?: number;
  ongoingProjects?: number;
  approvedBeneficiaries?: number;
  [key: string]: any;
}

export interface DashboardOverview {
  schemesByStatus?: Record<string, number>;
  projectsByStatus?: Record<string, number>;
  projectsByDistrict?: Record<string, number>;
  beneficiariesByStatus?: Record<string, number>;
  approvalsByStatus?: Record<string, number>;
  [key: string]: any;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Create User ──────────────────────────────────────────────────────────────
export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  phone?: string;
}
