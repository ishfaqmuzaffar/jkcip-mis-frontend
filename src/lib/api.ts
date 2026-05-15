import axios, { AxiosError, AxiosInstance } from "axios";
import {
  AuthResponse,
  Approval,
  ApprovalStatus,
  Beneficiary,
  CreateApprovalDto,
  CreateBeneficiaryDto,
  CreateProjectDto,
  CreateSchemeDto,
  CreateUserDto,
  DashboardOverview,
  DashboardStats,
  Indicator,
  LogframeDashboard,
  LogframeNode,
  OutcomePerformance,
  Project,
  Scheme,
  UpdateApprovalStatusDto,
  UpsertProgressDto,
  User,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  // Attach token from localStorage on every request
  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jkcip_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Handle 401 globally
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("jkcip_token");
        localStorage.removeItem("jkcip_user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const api = createApiClient();

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },
  register: async (dto: CreateUserDto): Promise<User> => {
    const { data } = await api.post<User>("/auth/register", dto);
    return data;
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>("/dashboard/stats");
    return data;
  },
  getOverview: async (): Promise<DashboardOverview> => {
    const { data } = await api.get<DashboardOverview>("/dashboard/overview");
    return data;
  },
  getActivity: async (): Promise<any> => {
    const { data } = await api.get("/dashboard/activity");
    return data;
  },
};

// ─── Schemes ──────────────────────────────────────────────────────────────────
export const schemesApi = {
  list: async (): Promise<Scheme[]> => {
    const { data } = await api.get<Scheme[]>("/schemes");
    return data;
  },
  get: async (id: number): Promise<Scheme> => {
    const { data } = await api.get<Scheme>(`/schemes/${id}`);
    return data;
  },
  create: async (dto: CreateSchemeDto): Promise<Scheme> => {
    const { data } = await api.post<Scheme>("/schemes", dto);
    return data;
  },
  update: async (id: number, dto: Partial<CreateSchemeDto>): Promise<Scheme> => {
    const { data } = await api.patch<Scheme>(`/schemes/${id}`, dto);
    return data;
  },
  updateStatus: async (id: number, status: string): Promise<Scheme> => {
    const { data } = await api.patch<Scheme>(`/schemes/${id}/status`, { status });
    return data;
  },
};

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: async (params?: Record<string, any>): Promise<Project[]> => {
    const { data } = await api.get<Project[]>("/projects", { params });
    return data;
  },
  get: async (id: number): Promise<Project> => {
    const { data } = await api.get<Project>(`/projects/${id}`);
    return data;
  },
  create: async (dto: CreateProjectDto): Promise<Project> => {
    const { data } = await api.post<Project>("/projects", dto);
    return data;
  },
  update: async (id: number, dto: Partial<CreateProjectDto>): Promise<Project> => {
    const { data } = await api.patch<Project>(`/projects/${id}`, dto);
    return data;
  },
  updateStatus: async (id: number, status: string): Promise<Project> => {
    const { data } = await api.patch<Project>(`/projects/${id}/status`, { status });
    return data;
  },
};

// ─── Beneficiaries ────────────────────────────────────────────────────────────
export const beneficiariesApi = {
  list: async (params?: Record<string, any>): Promise<Beneficiary[]> => {
    const { data } = await api.get<Beneficiary[]>("/beneficiaries", { params });
    return data;
  },
  get: async (id: number): Promise<Beneficiary> => {
    const { data } = await api.get<Beneficiary>(`/beneficiaries/${id}`);
    return data;
  },
  create: async (dto: CreateBeneficiaryDto): Promise<Beneficiary> => {
    const { data } = await api.post<Beneficiary>("/beneficiaries", dto);
    return data;
  },
  update: async (id: number, dto: Partial<CreateBeneficiaryDto>): Promise<Beneficiary> => {
    const { data } = await api.patch<Beneficiary>(`/beneficiaries/${id}`, dto);
    return data;
  },
  updateStatus: async (id: number, status: string): Promise<Beneficiary> => {
    const { data } = await api.patch<Beneficiary>(`/beneficiaries/${id}/status`, { status });
    return data;
  },
};

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvalsApi = {
  list: async (params?: Record<string, any>): Promise<Approval[]> => {
    const { data } = await api.get<Approval[]>("/approvals", { params });
    return data;
  },
  get: async (id: number): Promise<Approval> => {
    const { data } = await api.get<Approval>(`/approvals/${id}`);
    return data;
  },
  create: async (dto: CreateApprovalDto): Promise<Approval> => {
    const { data } = await api.post<Approval>("/approvals", dto);
    return data;
  },
  updateStatus: async (id: number, dto: UpdateApprovalStatusDto): Promise<Approval> => {
    const { data } = await api.patch<Approval>(`/approvals/${id}/status`, dto);
    return data;
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>("/users");
    return data;
  },
  get: async (id: number): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },
  create: async (dto: CreateUserDto): Promise<User> => {
    const { data } = await api.post<User>("/users", dto);
    return data;
  },
  update: async (id: number, dto: Partial<CreateUserDto>): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}`, dto);
    return data;
  },
  updateStatus: async (id: number, status: string): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}/status`, { status });
    return data;
  },
};

// ─── Logframe ─────────────────────────────────────────────────────────────────
export const logframeApi = {
  getTree: async (): Promise<LogframeNode[]> => {
    const { data } = await api.get<LogframeNode[]>("/logframe/tree");
    return data;
  },
  getNodes: async (): Promise<LogframeNode[]> => {
    const { data } = await api.get<LogframeNode[]>("/logframe/nodes");
    return data;
  },
  getIndicators: async (params?: {
    nodeId?: number;
    department?: string;
    year?: number;
  }): Promise<Indicator[]> => {
    const { data } = await api.get<Indicator[]>("/logframe/indicators", { params });
    return data;
  },
  getIndicator: async (id: number): Promise<Indicator> => {
    const { data } = await api.get<Indicator>(`/logframe/indicators/${id}`);
    return data;
  },
  getIndicatorProgress: async (indicatorId: number, year?: number): Promise<any> => {
    const { data } = await api.get(`/logframe/indicators/${indicatorId}/progress`, {
      params: year ? { year } : undefined,
    });
    return data;
  },
  upsertProgress: async (indicatorId: number, dto: UpsertProgressDto): Promise<any> => {
    const { data } = await api.post(`/logframe/indicators/${indicatorId}/progress`, dto);
    return data;
  },
  getDashboard: async (year?: number): Promise<LogframeDashboard> => {
    const { data } = await api.get<LogframeDashboard>("/logframe/dashboard", {
      params: year ? { year } : undefined,
    });
    return data;
  },
  getOutcomePerformance: async (year?: number): Promise<OutcomePerformance[]> => {
    const { data } = await api.get<OutcomePerformance[]>("/logframe/outcomes", {
      params: year ? { year } : undefined,
    });
    return data;
  },
};

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
