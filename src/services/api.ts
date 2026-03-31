import { Contact, Customer, CustomerGroup, Lead, Opportunity, OpportunityLostReason, PaymentTerm, PriceList, Prospect, SalesTask, SalesTaskDetail, Territory, WrappedPaginatedResponse } from '@/types';
import axios from 'axios';
import { get } from 'node:http';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/sign-in', { email, password }),
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/auth/sign-up', data),
  logout: () => api.post('/auth/sign-out'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
};


export interface EnumOption {
  value: string;
  label: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export const userApi = {
  list: (params?: Record<string, any>) => api.get('/users', { params }).then(res => {
    // Handle both paginated success wrapper and direct array
    const data = res.data.data;
    if (data && data.data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(res.data)) return res.data;
    return [];
  }),
};

export const enumApi = {
  qualificationStatuses: () => api.get<EnumOption[]>('/enums/qualification-statuses').then(res => res.data),
  genders: () => api.get<EnumOption[]>('/enums/genders').then(res => res.data),
};

export const statusApi = {
  list: () => api.get('/statuses').then(res => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const sourceApi = {
  list: () => api.get('/sources').then(res => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const requestTypeApi = {
  list: () => api.get('/request-types').then(res => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const industryTypeApi = {
  list: () => api.get('/industry-types').then(res => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const leadApi = {
  list: (params?: Record<string, any>) => api.get<WrappedPaginatedResponse<Lead>>('/leads', { params }).then(res => {
      const data = res.data;
      if (Array.isArray(data)) return data as any;
      if (data && typeof data === 'object' && Array.isArray((data as any).data)) return data as any;
      return (data as any).data || data;
  }),
  getLead: () => api.get('/leads/get-lead').then(res => res.data.data || res.data),
  get: (id: number) => api.get(`/leads/${id}`).then(res => res.data.data || res.data),
  create: (data: any) => api.post('/leads', data).then(res => res.data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/leads/${id}`),
};

export const opportunityApi = {
  list: (params?: Record<string, string | number>) =>
    api.get("/opportunities", { params }).then((res) => {
      const data = res.data;
      if (Array.isArray(data)) return data;
      return data.data || data;
    }),
    getOpportunity: () => api.get('/opportunity/get-opportunity').then(res => res.data.data || res.data),
  get: (id: number) => api.get<Opportunity>(`/opportunities/${id}`).then((r) => r.data),
  create: (data: Partial<Opportunity>) =>
    api.post<Opportunity>("/opportunities", data).then((r) => r.data),
  update: (id: number, data: Partial<Opportunity>) =>
    api.put<Opportunity>(`/opportunities/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/opportunities/${id}`),
  getProducts: (id: number) => api.get(`/opportunities/${id}/products`).then((res) => res.data),
  declareLost: (id: number, data: any) => api.post(`/opportunities/${id}/declare-lost`, data).then((res) => res.data),
};

export const contactApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<Contact>>("/contacts", { params }).then((r) => r.data.data),
  get: (id: number) => api.get<Contact>(`/contacts/${id}`).then((r) => r.data),
  create: (data: Partial<Contact>) =>
    api.post<Contact>("/contacts", data).then((r) => r.data),
  update: (id: number, data: Partial<Contact>) =>
    api.put<Contact>(`/contacts/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
};

export const territoryApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<Territory[]>("/territories", { params }).then((r) => r.data),
  get: (id: number) => api.get<Territory>(`/territories/${id}`).then((r) => r.data),
  create: (data: Partial<Territory>) =>
    api.post<Territory>("/territories", data).then((r) => r.data),
  update: (id: number, data: Partial<Territory>) =>
    api.put<Territory>(`/territories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/territories/${id}`),
};

export const lostReasonApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<OpportunityLostReason>>("/lost-reasons", { params }).then((r) => r.data.data),
  get: (id: number) => api.get<OpportunityLostReason>(`/lost-reasons/${id}`).then((r) => r.data),
  create: (data: { opportunity_id: number; opportunity_lost_reasons: string }) =>
    api.post<OpportunityLostReason>("/lost-reasons", data).then((r) => r.data),
  update: (id: number, data: { opportunity_id?: number; opportunity_lost_reasons?: string }) =>
    api.put<OpportunityLostReason>(`/lost-reasons/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/lost-reasons/${id}`),
};

export const customerApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<Customer>>("/customers", { params }).then((r) => {
      const data = r.data;
      if (Array.isArray(data)) return data as any;
      if (data && typeof data === 'object' && Array.isArray((data as any).data)) return data as any;
      return (data as any).data || data;
    }),
  get: (id: number) => api.get<Customer>(`/customers/${id}`).then((r) => r.data),
  create: (data: Partial<Customer>) =>
    api.post<Customer>("/customers", data).then((r) => r.data),
  update: (id: number, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

export const customerGroupApi = {
  list: () => api.get<CustomerGroup[]>("/customer-groups").then((r) => r.data),
  create: (data: Partial<CustomerGroup>) =>
    api.post<CustomerGroup>("/customer-groups", data).then((r) => r.data),
  update: (id: number, data: Partial<CustomerGroup>) =>
    api.put<CustomerGroup>(`/customer-groups/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/customer-groups/${id}`),
};

export const prospectApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<Prospect>>("/prospects", { params }).then((r) => r.data.data),
  get: (id: number) => api.get<Prospect>(`/prospects/${id}`).then((r) => r.data),
  create: (data: Partial<Prospect>) =>
    api.post<Prospect>("/prospects", data).then((r) => r.data),
  update: (id: number, data: Partial<Prospect>) =>
    api.put<Prospect>(`/prospects/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/prospects/${id}`),
};

export const taskSourceApi = {
  list: () => api.get("/task-sources").then((res) => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const taskTypeApi = {
  list: () => api.get("/task-types").then((res) => Array.isArray(res.data) ? res.data : res.data.data || []),
};

export const salesTaskApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<SalesTask>>("/sales-tasks", { params }).then((r) => r.data.data),
  get: (id: number) => api.get<SalesTask>(`/sales-tasks/${id}`).then((r) => r.data),
  create: (data: Partial<SalesTask>) =>
    api.post<SalesTask>("/sales-tasks", data).then((r) => r.data),
  update: (id: number, data: Partial<SalesTask>) =>
    api.put<SalesTask>(`/sales-tasks/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/sales-tasks/${id}`),
};

export const salesTaskDetailApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<WrappedPaginatedResponse<SalesTaskDetail>>("/sales-task-details", { params }).then((r) => r.data.data),
  get: (id: number) => api.get<SalesTaskDetail>(`/sales-task-details/${id}`).then((r) => r.data),
  create: (data: Partial<SalesTaskDetail>) =>
    api.post<SalesTaskDetail>("/sales-task-details", data).then((r) => r.data),
  update: (id: number, data: Partial<SalesTaskDetail>) =>
    api.put<SalesTaskDetail>(`/sales-task-details/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/sales-task-details/${id}`),
};

export const priceListApi = {
  list: () => api.get<PriceList[]>("/price-lists").then((r) => r.data),
  create: (data: Partial<PriceList>) =>
    api.post<PriceList>("/price-lists", data).then((r) => r.data),
  update: (id: number, data: Partial<PriceList>) =>
    api.put<PriceList>(`/price-lists/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/price-lists/${id}`),
};

export const paymentTermApi = {
  list: () => api.get<PaymentTerm[]>("/payment-terms").then((r) => r.data),
  create: (data: Partial<PaymentTerm>) =>
    api.post<PaymentTerm>("/payment-terms", data).then((r) => r.data),
  update: (id: number, data: Partial<PaymentTerm>) =>
    api.put<PaymentTerm>(`/payment-terms/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/payment-terms/${id}`),
};

export const dashboardService = {
  getStats: (params?: Record<string, unknown>) => api.get('/dashboard/stats', { params }),
  getSalesOverview: (params?: Record<string, unknown>) => api.get('/dashboard/sales-overview', { params }),
  getEmployeeStats: (params?: Record<string, unknown>) => api.get('/dashboard/employee-stats', { params }),
  getAttendanceStats: (params?: Record<string, unknown>) => api.get('/dashboard/attendance-stats', { params }),
  getLeaveStats: (params?: Record<string, unknown>) => api.get('/dashboard/leave-stats', { params }),
};

export const staffService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get('/staff-members', { params }),
  getById: (id: number) => api.get(`/staff-members/${id}`),
  create: (data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      return api.post('/staff-members', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/staff-members', data);
  },
  update: (id: number, data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      // Don't set Content-Type manually for FormData, let axios handle it to include boundary
      return api.post(`/staff-members/${id}?_method=PUT`, data);
    }
    return api.put(`/staff-members/${id}`, data);
  },
  delete: (id: number) => api.delete(`/staff-members/${id}`),
  dropdown: () => api.get('/staff-members-dropdown'),
  getFiles: (id: number) => api.get(`/staff-members/${id}/files`),
  uploadFile: (id: number, data: FormData) =>
    api.post(`/staff-members/${id}/files`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteFile: (id: number, fileId: number) => api.delete(`/staff-members/${id}/files/${fileId}`),
  getFileCategories: () => api.get('/file-categories', { params: { paginate: false } }),
};

export const attendanceService = {
  // Self attendance endpoints
  clockInSelf: (data: Record<string, unknown>) => api.post('/clock-in-self', data),
  clockOutSelf: (data: Record<string, unknown>) => api.post('/clock-out-self', data),
  getCurrentStatusSelf: (params?: Record<string, unknown>) =>
    api.get('/current-status-self', { params }),

  // Legacy endpoints (keep for compatibility)
  clockIn: (data: Record<string, unknown>) => api.post('/clock-in', data),
  clockOut: (data: Record<string, unknown>) => api.post('/clock-out', data),
  getCurrentStatus: (params?: Record<string, unknown>) => api.get('/current-status', { params }),
  getWorkLogs: (params?: {
    staff_member_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number
  }) => api.get('/work-logs', { params }),

  getMyWorkLogs: (params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
    paginate?: boolean;
    month?: number;
    year?: number;
  }) => api.get('/my-logs', { params }),
  getSummary: (params?: Record<string, unknown>) =>
    api.get('/attendance-summary', { params }),

  getMySummary: (params?: Record<string, unknown>) =>
    api.get('/my-summary', { params }),

  getMyMonthlyAttendance: (params?: Record<string, unknown>) =>
    api.get('/my-monthly-attendance', { params }),

  // Shift analytics
  getShiftAnalytics: (params?: Record<string, unknown>) =>
    api.get('/attendance/shift-analytics', { params }),

  // Shift assignment methods
  assignShift: (shiftId: number, data: {
    staff_member_id: number | number[];
    effective_from: string;
    effective_to?: string;
  }) => {
    return api.post(`/shifts/${shiftId}/assign`, data);
  },

  getShiftAssignments: (params?: {
    date?: string;
    staff_member_id?: number;
    shift_id?: number;
  }) => {
    return api.get('/shift-roster', { params });
  },

  getEmployeeShifts: (staffMemberId: number) => {
    return api.get(`/shifts/employee/${staffMemberId}`);
  },

  removeShiftAssignment: (assignmentId: number) => {
    return api.delete(`/shift-assignments/${assignmentId}`);
  },
  // Get all staff members for dropdown
  getStaffMembersForDropdown: () => {
    return api.get('/staff-members');
  },

  // Manual attendance management
  createWorkLog: (data: Record<string, unknown>) => api.post('/work-logs', data),
  updateWorkLog: (id: number, data: Record<string, unknown>) => api.put(`/work-logs/${id}`, data),
  deleteWorkLog: (id: number) => api.delete(`/work-logs/${id}`),
  bulkCreateWorkLogs: (data: Record<string, unknown>) => api.post('/work-logs/bulk', data),

  // Today's summary
  getTodaySummary: () => api.get('/attendance-summary?today=true'),

  // Monthly attendance
  getMonthlyAttendance: (staffMemberId: number, params?: Record<string, unknown>) =>
    api.get(`/attendance/monthly/${staffMemberId}`, { params }),

  getShifts: () => api.get('/shifts'),
  createShift: (data: Record<string, unknown>) => api.post('/shifts', data),
  updateShift: (id: number, data: Record<string, unknown>) => api.put(`/shifts/${id}`, data),
  deleteShift: (id: number) => api.delete(`/shifts/${id}`),
};


export const leaveService = {
  getCategories: (params?: { page?: number; per_page?: number }) => api.get('/time-off-categories', { params }), // Admin endpoint - requires permission
  getCategoriesList: () => api.get('/leave/categories-list'), // Public endpoint for dropdown - no permission needed
  createCategory: (data: Record<string, unknown>) => api.post('/time-off-categories', data),
  updateCategory: (id: number, data: Record<string, unknown>) => api.put(`/time-off-categories/${id}`, data),
  getMyRequests: (params?: { page?: number; per_page?: number }) => api.get('/leave/my-requests', { params }),
  deleteCategory: (id: number) => api.delete(`/time-off-categories/${id}`),
  getRequests: (params?: { status?: string; page?: number }) => api.get('/time-off-requests', { params }),
  createRequest: (data: Record<string, unknown>) => api.post('/time-off-requests', data),
  getRequestById: (id: number) => api.get(`/time-off-requests/${id}`),
  updateRequest: (id: number, data: Record<string, unknown>) => api.put(`/time-off-requests/${id}`, data),
  deleteRequest: (id: number) => api.delete(`/time-off-requests/${id}`),
  cancelRequest: (id: number) => api.post(`/time-off-requests/${id}/cancel`),
  processRequest: (id: number, data: { action: 'approve' | 'decline'; remarks?: string }) =>
    api.post(`/time-off-requests/${id}/process`, data),
  getStatistics: (params?: { staff_member_id?: number }) => api.get('/time-off-stats', { params }),
  getBalances: (staffMemberId: number) => api.get(`/time-off-balance`, { params: { staff_member_id: staffMemberId } }),
  getMyBalances: (year?: number) => api.get('/leave/my-balance', { params: { year } }),
};

export const payrollService = {
  getSalarySlips: (params?: { staff_member_id?: number; salary_period?: string; page?: number; per_page?: number }) =>
    api.get('/salary-slips', { params }),
  getMySlips: (params?: { page?: number }) =>
    api.get('/payroll/my-slips', { params }),
  generateSlip: (data: { staff_member_id: number; salary_period: string }) =>
    api.post('/salary-slips/generate', data),
  bulkGenerate: (data: { employee_ids: number[]; month: number; year: number }) =>
    api.post('/salary-slips/bulk-generate', data),
  getSlipById: (id: number) => api.get(`/salary-slips/${id}`),
  downloadSlip: (id: number) => api.get(`/payroll/salary-slips/${id}/download`, { responseType: 'blob' }),
  calculate: (data: { staff_member_id: number; month: number; year: number }) =>
    api.post('/salary-slips/calculate', data),
  // Updated benefits methods for top-level routes
  getBenefits: (params?: { staff_member_id?: number; benefit_type_id?: number; active?: boolean; paginate?: boolean; page?: number; per_page?: number }) =>
    api.get('/staff-benefits', { params }),
  createBenefit: (data: { staff_member_id: number; benefit_type_id: number; amount: number; description?: string; calculation_type?: string; effective_until?: string; effective_from?: string; is_active?: boolean }) =>
    api.post('/staff-benefits', data),
  updateBenefit: (id: number, data: Partial<{
    benefit_type_id: number;
    description: string;
    calculation_type: 'fixed' | 'percentage';
    amount: number;
    effective_from?: string | null;
    effective_until?: string | null;
    is_active?: boolean
  }>) => api.put(`/staff-benefits/${id}`, data),
  deleteBenefit: (id: number) => api.delete(`/staff-benefits/${id}`),

  getBenefitTypes: (params?: {
    active?: boolean;
    taxable?: boolean;
    paginate?: boolean;
    page?: number;
    per_page?: number;
    search?: string;
    order_by?: string;
    order?: string;
  }) => api.get('/benefit-types', { params }),

  createBenefitType: (data: {
    title: string;
    notes?: string;
    is_taxable?: boolean;
    is_active?: boolean
  }) => api.post('/benefit-types', data),

  updateBenefitType: (id: number, data: Partial<{
    title: string;
    notes?: string;
    is_taxable?: boolean;
    is_active?: boolean
  }>) => api.put(`/benefit-types/${id}`, data),

  deleteBenefitType: (id: number) => api.delete(`/benefit-types/${id}`),

  // Similarly for deductions (if you have staff-deductions route)
  getDeductions: (params?: {
    staff_member_id?: number;
    withholding_type_id?: number;
    active?: boolean;
    paginate?: boolean;
    page?: number;
    per_page?: number
  }) => api.get('/recurring-deductions', { params }),

  createDeduction: (data: {
    staff_member_id: number;
    withholding_type_id: number;
    description: string;
    calculation_type: 'fixed' | 'percentage';
    amount: number;
    effective_from?: string;
    effective_until?: string;
    is_active?: boolean
  }) => api.post('/recurring-deductions', data),

  updateDeduction: (id: number, data: Partial<{
    withholding_type_id: number;
    description: string;
    calculation_type: 'fixed' | 'percentage';
    amount: number;
    effective_from?: string;
    effective_until?: string;
    is_active?: boolean
  }>) => api.put(`/recurring-deductions/${id}`, data),

  deleteDeduction: (id: number) => api.delete(`/recurring-deductions/${id}`),

  // Withholding Types CRUD methods
  getWithholdingTypes: (params?: {
    active?: boolean;
    statutory?: boolean;
    paginate?: boolean;
    page?: number;
    per_page?: number;
    search?: string;
    order_by?: string;
    order?: string;
  }) => api.get('/withholding-types', { params }),

  createWithholdingType: (data: {
    title: string;
    notes?: string;
    is_statutory?: boolean;
    is_active?: boolean
  }) => api.post('/withholding-types', data),

  updateWithholdingType: (id: number, data: Partial<{
    title: string;
    notes?: string;
    is_statutory?: boolean;
    is_active?: boolean
  }>) => api.put(`/withholding-types/${id}`, data),

  deleteWithholdingType: (id: number) => api.delete(`/withholding-types/${id}`),

  getTaxSlabs: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/tax-slabs', { params }),
  calculateTax: (data: Record<string, unknown>) => api.post('/tax-slabs/calculate', data), // Remove 'annual_income' type restriction
  createTaxSlab: (data: Record<string, unknown>) => api.post('/tax-slabs', data),
  updateTaxSlab: (id: number, data: Record<string, unknown>) => api.put(`/tax-slabs/${id}`, data),
  deleteTaxSlab: (id: number) => api.delete(`/tax-slabs/${id}`),
  getTaxSlab: (id: number) => api.get(`/tax-slabs/${id}`),
};

export const recruitmentService = {
  getOfficeLocations: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/office-locations', { params }),
  getDivisions: () => api.get('/divisions'),
  getJobs: (params?: {
    status?: string;
    paginate?: boolean;
    page?: number;
    per_page?: number;
    search?: string;
    job_category_id?: number;
    office_location_id?: number;
    order_by?: string;
    order?: string;
  }) => api.get('/jobs', { params }),
  createJob: (data: Record<string, unknown>) => api.post('/jobs', data),
  getJobById: (id: number) => api.get(`/jobs/${id}`),
  updateJob: (id: number, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data),
  deleteJob: (id: number) => api.delete(`/jobs/${id}`),
  publishJob: (id: number) => api.post(`/jobs/${id}/publish`),
  closeJob: (id: number) => api.post(`/jobs/${id}/close`),
  getJobCategories: (params?: {
    search?: string;
    paginate?: boolean;
    page?: number;
    per_page?: number
  }) => api.get('/job-categories', { params }),

  getJobCategory: (id: number) => api.get(`/job-categories/${id}`),

  createJobCategory: (data: {
    title: string;
    description?: string;
  }) => api.post('/job-categories', data),

  updateJobCategory: (id: number, data: Partial<{
    title: string;
    description?: string;
  }>) => api.put(`/job-categories/${id}`, data),

  deleteJobCategory: (id: number) => api.delete(`/job-categories/${id}`),
  getCandidates: (params?: Record<string, unknown>) => api.get('/candidates', { params }),
  getCandidate: (id: number) => api.get(`/candidates/${id}`),
  createCandidate: (data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      return api.post('/candidates', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/candidates', data);
  },
  updateCandidate: (id: number, data: Record<string, unknown>) =>
    api.put(`/candidates/${id}`, data),
  deleteCandidate: (id: number) => api.delete(`/candidates/${id}`),
  archiveCandidate: (id: number) => api.post(`/candidates/${id}/archive`),
  convertToEmployee: (id: number, data: Record<string, unknown>) =>
    api.post(`/candidates/${id}/convert-to-employee`, data),
  downloadResume: (id: number) => api.get(`/candidates/${id}/resume`, { responseType: 'blob' }),
  getApplications: (params?: { job_id?: number; status?: string; page?: number }) =>
    api.get('/job-applications', { params }),
  updateApplicationStatus: (id: number, data: { status: string }) =>
    api.put(`/job-applications/${id}/status`, data),
  // Interview methods
  getInterviews: (params?: Record<string, unknown>) => api.get('/interview-schedules', { params }),
  scheduleInterview: (data: Record<string, unknown>) => api.post('/interview-schedules', data),
  updateInterview: (id: number, data: Record<string, unknown>) => api.put(`/interview-schedules/${id}`, data),
  deleteInterview: (id: number) => api.delete(`/interview-schedules/${id}`),
  submitFeedback: (id: number, data: Record<string, unknown>) => api.post(`/interview-schedules/${id}/feedback`, data),
  rescheduleInterview: (id: number, data: Record<string, unknown>) => api.post(`/interview-schedules/${id}/reschedule`, data),
  getCalendarInterviews: (params?: Record<string, unknown>) => api.get('/interviews/calendar', { params }),
  getTodayInterviews: () => api.get('/interviews/today'),

  // Staff members for interviewers
  getStaffMembers: (params?: Record<string, unknown>) => api.get('/staff-members', { params }),

  // Job Stages
  getJobStages: (params?: {
    paginate?: boolean;
    page?: number;
    per_page?: number;
    search?: string;
    order_by?: string;
    order?: string;
  }) => api.get('/job-stages', { params }),

  createJobStage: (data: {
    title: string;
    description?: string;
    status?: string;
    is_default?: boolean;
  }) => api.post('/job-stages', data),

  updateJobStage: (id: number, data: Partial<{
    title: string;
    description?: string;
    status?: string;
    is_default?: boolean;
  }>) => api.put(`/job-stages/${id}`, data),

  deleteJobStage: (id: number) => api.delete(`/job-stages/${id}`),



  // Job Applications
  getJobApplications: (params?: {
    job_posting_id?: number;
    job_stage_id?: number;
    status?: string;
    paginate?: boolean;
    page?: number;
    per_page?: number;
    order_by?: string;
    order?: string;
  }) => api.get('/job-applications', { params }),

  createJobApplication: (jobId: number, data: {
    candidate_id: number;
    custom_answers?: Record<string, unknown>;
  }) => api.post(`/jobs/${jobId}/applications`, data),

  getJobApplication: (id: number) => api.get(`/job-applications/${id}`),

  moveJobApplicationStage: (id: number, data: {
    job_stage_id: number
  }) => api.post(`/job-applications/${id}/move-stage`, data),

  rateJobApplication: (id: number, data: {
    rating: number;
    notes?: string;
  }) => api.post(`/job-applications/${id}/rate`, data),

  addJobApplicationNote: (id: number, data: {
    note: string;
  }) => api.post(`/job-applications/${id}/notes`, data),

  shortlistJobApplication: (id: number) => api.post(`/job-applications/${id}/shortlist`),

  rejectJobApplication: (id: number) => api.post(`/job-applications/${id}/reject`),

  hireJobApplication: (id: number) => api.post(`/job-applications/${id}/hire`),

  // Custom Questions
  getJobQuestions: (jobId: number) => api.get(`/jobs/${jobId}/questions`),
  addJobQuestion: (jobId: number, data: {
    question: string;
    is_required?: boolean;
  }) => api.post(`/jobs/${jobId}/questions`, data),
  updateCustomQuestion: (questionId: number, data: {
    question?: string;
    is_required?: boolean;
  }) => api.put(`/custom-questions/${questionId}`, data),
  deleteCustomQuestion: (questionId: number) => api.delete(`/custom-questions/${questionId}`),
};



export const performanceService = {
  getGoals: (params?: { staff_member_id?: number; page?: number }) => api.get('/performance-objectives', { params }),
  createGoal: (data: Record<string, unknown>) => api.post('/performance-objectives', data),
  updateGoal: (id: number, data: Record<string, unknown>) => api.put(`/performance-objectives/${id}`, data),
  deleteGoal: (id: number) => api.delete(`/performance-objectives/${id}`),
  updateProgress: (id: number, data: Record<string, unknown>) => api.post(`/performance-objectives/${id}/progress`, data),
  rateGoal: (id: number, data: Record<string, unknown>) => api.post(`/performance-objectives/${id}/rate`, data),
  getAppraisals: (params?: { staff_member_id?: number; page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/appraisal-records', { params }),
  getAppraisalCycles: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/appraisal-cycles', { params }),
  createAppraisalCycle: (data: Record<string, unknown>) => api.post('/appraisal-cycles', data),
  updateAppraisalCycle: (id: number, data: Record<string, unknown>) => api.put(`/appraisal-cycles/${id}`, data),
  activateCycle: (id: number) => api.post(`/appraisal-cycles/${id}/activate`),
  closeCycle: (id: number) => api.post(`/appraisal-cycles/${id}/close`),
  deleteCycle: (id: number) => api.delete(`/appraisal-cycles/${id}`),
  submitSelfReview: (id: number, data: Record<string, unknown>) => api.post(`/appraisal-records/${id}/self-review`, data),
  submitManagerReview: (id: number, data: Record<string, unknown>) => api.post(`/appraisal-records/${id}/manager-review`, data),
  getStaffMembers: () => api.get('/staff-members'),
};

export const assetService = {
  getAll: (params?: { type_id?: number; status?: string; page?: number; per_page?: number; search?: string; order_by?: string; order?: string; paginate?: string }) => api.get('/assets', { params }),
  getAssetTypes: () => api.get('/asset-types'),
  createAssetType: (data: Record<string, unknown>) => api.post('/asset-types', data),
  getAssets: (params?: { type_id?: number; status?: string; page?: number }) => api.get('/assets', { params }),
  create: (data: Record<string, unknown>) => api.post('/assets', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  getAvailable: () => api.get('/assets-available'),
  getByEmployee: (staffMemberId: number) => api.get(`/assets/employee/${staffMemberId}`),
  assignAsset: (assetId: number, data: Record<string, unknown>) => api.post(`/assets/${assetId}/assign`, data),
  returnAsset: (assetId: number) => api.post(`/assets/${assetId}/return`),
  setMaintenance: (assetId: number, data: Record<string, unknown>) => api.post(`/assets/${assetId}/maintenance`, data),
};

export const trainingService = {
  // Training Types
  getTypes: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/training-types', { params }),
  getTypeById: (id: number) => api.get(`/training-types/${id}`),
  createType: (data: Record<string, unknown>) => api.post('/training-types', data),
  updateType: (id: number, data: Record<string, unknown>) => api.put(`/training-types/${id}`, data),
  deleteType: (id: number) => api.delete(`/training-types/${id}`),
  // Training Programs
  getPrograms: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/training-programs', { params }),
  createProgram: (data: Record<string, unknown>) => api.post('/training-programs', data),
  updateProgram: (id: number, data: Record<string, unknown>) => api.put(`/training-programs/${id}`, data),
  deleteProgram: (id: number) => api.delete(`/training-programs/${id}`),
  // Training Sessions
  getSessions: (params?: { page?: number; per_page?: number; search?: string; training_program_id?: number | string; status?: string; paginate?: string }) => api.get('/training-sessions', { params }),
  getSessionById: (id: number | string) => api.get(`/training-sessions/${id}`),
  createSession: (data: Record<string, unknown>) => api.post('/training-sessions', data),
  updateSession: (id: number | string, data: Record<string, unknown>) => api.put(`/training-sessions/${id}`, data),
  deleteSession: (id: number | string) => api.delete(`/training-sessions/${id}`),
  enrollInSession: (sessionId: number, data: Record<string, unknown>) => api.post(`/training-sessions/${sessionId}/enroll`, data),
  completeSession: (sessionId: number, data: Record<string, unknown>) => api.post(`/training-sessions/${sessionId}/complete`, data),
  getParticipants: (params?: { page?: number; per_page?: number; search?: string; training_session_id?: number | string; staff_member_id?: number | string; paginate?: string }) => api.get('/training-participants', { params }),
  updateParticipant: (id: number | string, data: Record<string, unknown>) => api.put(`/training-participants/${id}`, data),
  deleteParticipant: (id: number | string) => api.delete(`/training-participants/${id}`),
  getEmployeeTraining: (staffMemberId: number) => api.get(`/training/employee/${staffMemberId}`),
};

export const contractService = {
  getAll: (params?: { staff_member_id?: number; status?: string; page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) =>
    api.get('/contracts', { params }),
  getById: (id: number) => api.get(`/contracts/${id}`),
  getContracts: (params?: { staff_member_id?: number; status?: string; page?: number }) =>
    api.get('/contracts', { params }),
  createContract: (data: Record<string, unknown>) => api.post('/contracts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  updateContract: (id: number, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  deleteContract: (id: number) => api.delete(`/contracts/${id}`),
  renewContract: (id: number, data: Record<string, unknown>) => api.post(`/contracts/${id}/renew`, data),
  terminateContract: (id: number, data: Record<string, unknown>) => api.post(`/contracts/${id}/terminate`, data),
};

export const contractTypeService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) =>
    api.get('/contract-types', { params }),
  getById: (id: number) => api.get(`/contract-types/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contract-types', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contract-types/${id}`, data),
  delete: (id: number) => api.delete(`/contract-types/${id}`),
};

export const meetingTypeService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/meeting-types', { params }),
  create: (data: Record<string, unknown>) => api.post('/meeting-types', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/meeting-types/${id}`, data),
  delete: (id: number) => api.delete(`/meeting-types/${id}`),
};

export const meetingRoomService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/meeting-rooms', { params }),
  getAvailable: () => api.get('/meeting-rooms-available'),
  create: (data: Record<string, unknown>) => api.post('/meeting-rooms', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/meeting-rooms/${id}`, data),
  delete: (id: number) => api.delete(`/meeting-rooms/${id}`),
};
export const meetingService = {
  getTypes: () => api.get('/meeting-types'),
  createType: (data: Record<string, unknown>) => api.post('/meeting-types', data),
  updateType: (id: number, data: Record<string, unknown>) => api.put(`/meeting-types/${id}`, data),
  deleteType: (id: number) => api.delete(`/meeting-types/${id}`),
  getRooms: () => api.get('/meeting-rooms'),
  getAvailableRooms: () => api.get('/meeting-rooms-available'),
  createRoom: (data: Record<string, unknown>) => api.post('/meeting-rooms', data),
  updateRoom: (id: number, data: Record<string, unknown>) => api.put(`/meeting-rooms/${id}`, data),
  deleteRoom: (id: number) => api.delete(`/meeting-rooms/${id}`),
  getAll: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/meetings', { params }),
  getMeetings: (params?: { page?: number }) => api.get('/meetings', { params }),
  getById: (id: number | string) => api.get(`/meetings/${id}`),
  createMeeting: (data: Record<string, unknown>) => api.post('/meetings', data),
  updateMeeting: (id: number, data: Record<string, unknown>) => api.put(`/meetings/${id}`, data),
  deleteMeeting: (id: number) => api.delete(`/meetings/${id}`),
  addAttendees: (meetingId: number, data: Record<string, unknown>) => api.post(`/meetings/${meetingId}/attendees`, data),
  startMeeting: (meetingId: number) => api.post(`/meetings/${meetingId}/start`),
  completeMeeting: (meetingId: number) => api.post(`/meetings/${meetingId}/complete`),
  addMinutes: (meetingId: number, data: Record<string, unknown>) => api.post(`/meetings/${meetingId}/minutes`, data),
  addActionItem: (meetingId: number, data: Record<string, unknown>) => api.post(`/meetings/${meetingId}/action-items`, data),
  getCalendar: () => api.get('/meetings-calendar'),
  getMyMeetings: () => api.get('/my-meetings'),
};

export const meetingAttendeeService = {
  getAll: (params?: any) => api.get('/meeting-attendees', { params }),
  getById: (id: number) => api.get(`/meeting-attendees/${id}`),
  create: (data: any) => api.post('/meeting-attendees', data),
  update: (id: number, data: any) => api.put(`/meeting-attendees/${id}`, data),
  delete: (id: number) => api.delete(`/meeting-attendees/${id}`),
};

export const meetingMinuteService = {
  getAll: (params?: any) => api.get('/meeting-minutes', { params }),
  getById: (id: number) => api.get(`/meeting-minutes/${id}`),
  create: (data: any) => api.post('/meeting-minutes', data),
  update: (id: number, data: any) => api.put(`/meeting-minutes/${id}`, data),
  delete: (id: number) => api.delete(`/meeting-minutes/${id}`),
};

export const meetingActionItemService = {
  getAll: (params?: any) => api.get('/meeting-action-items', { params }),
  getById: (id: number) => api.get(`/meeting-action-items/${id}`),
  create: (data: any) => api.post('/meeting-action-items', data),
  update: (id: number, data: any) => api.put(`/meeting-action-items/${id}`, data),
  delete: (id: number) => api.delete(`/meeting-action-items/${id}`),
};

export const reportService = {
  getAttendanceReport: (params: { month: string; staff_member_id?: number; office_location_id?: number; division_id?: number; search?: string; page?: number; per_page?: number }) =>
    api.get('/reports/attendance', { params }),
  getLeaveReport: (params: { year: number; month?: number; staff_member_id?: number; time_off_category_id?: number; search?: string; page?: number; per_page?: number }) =>
    api.get('/reports/leave', { params }),
  getPayrollReport: (params: { salary_period: string; office_location_id?: number; division_id?: number }) =>
    api.get('/reports/payroll', { params }),
  getHeadcountReport: () => api.get('/reports/headcount'),
  getTurnoverReport: (params: { year: number }) => api.get('/reports/turnover', { params }),
  exportAttendanceReport: (params: { month: string; format: string }) =>
    api.get('/reports/attendance/export', { params, responseType: 'blob' }),
  exportLeaveReport: (params: { year: number; month?: number; time_off_category_id?: number; format: string }) =>
    api.get('/reports/leave/export', { params, responseType: 'blob' }),
  exportPayrollReport: (params: { salary_period: string; format: string }) =>
    api.get('/reports/payroll/export', { params, responseType: 'blob' }),
};

export const candidateSourceService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/candidate-sources', { params }),
  getById: (id: number) => api.get(`/candidate-sources/${id}`),
  create: (data: { title: string }) => api.post('/candidate-sources', data),
  update: (id: number, data: { title: string }) => api.put(`/candidate-sources/${id}`, data),
  delete: (id: number) => api.delete(`/candidate-sources/${id}`),
};

export const settingsService = {
  getOfficeLocations: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/office-locations', { params }),
  createOfficeLocation: (data: Record<string, unknown>) => api.post('/office-locations', data),
  updateOfficeLocation: (id: number, data: Record<string, unknown>) => api.put(`/office-locations/${id}`, data),
  deleteOfficeLocation: (id: number) => api.delete(`/office-locations/${id}`),
  getDivisions: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/divisions', { params }),
  createDivision: (data: Record<string, unknown>) => api.post('/divisions', data),
  updateDivision: (id: number, data: Record<string, unknown>) => api.put(`/divisions/${id}`, data),
  deleteDivision: (id: number) => api.delete(`/divisions/${id}`),
  getJobTitles: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/job-titles', { params }),
  createJobTitle: (data: Record<string, unknown>) => api.post('/job-titles', data),
  updateJobTitle: (id: number, data: Record<string, unknown>) => api.put(`/job-titles/${id}`, data),
  deleteJobTitle: (id: number) => api.delete(`/job-titles/${id}`),
  getHolidays: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/company-holidays', { params }),
  createHoliday: (data: Record<string, unknown>) => api.post('/company-holidays', data),
  updateHoliday: (id: number, data: Record<string, unknown>) => api.put(`/company-holidays/${id}`, data),
  deleteHoliday: (id: number) => api.delete(`/company-holidays/${id}`),
  getAll: (params?: any) => api.get('/company-notices', { params }),
  getById: (id: number) => api.get(`/company-notices/${id}`),
  create: (data: any) => api.post('/company-notices', data),
  update: (id: number, data: any) => api.put(`/company-notices/${id}`, data),
  delete: (id: number) => api.delete(`/company-notices/${id}`),
  markAsRead: (id: number) => api.post(`/company-notices/${id}/read`),
  getFileCategories: () => api.get('/file-categories', { params: { paginate: false } }),
  createFileCategory: (data: Record<string, unknown>) => api.post('/file-categories', data),
  updateFileCategory: (id: number, data: Record<string, unknown>) => api.put(`/file-categories/${id}`, data),
  deleteFileCategory: (id: number) => api.delete(`/file-categories/${id}`),
  // Working Days
  getWorkingDays: (params?: { page?: number; per_page?: number; date?: string }) =>
    api.get('/working-days', { params }),
  getWorkingDay: (id: number) => api.get(`/working-days/${id}`),
  createWorkingDay: (data: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    from_date?: string;
    to_date?: string;
  }) => api.post('/working-days', data),
  updateWorkingDay: (id: number, data: Record<string, unknown>) => api.put(`/working-days/${id}`, data),
  deleteWorkingDay: (id: number) => api.delete(`/working-days/${id}`),
  getWorkingDaysCount: (params: { start_date: string; end_date: string }) =>
    api.get('/working-days/count', { params }),
  getActiveWorkingDayConfig: (params: { date: string }) =>
    api.get('/working-days/active', { params }),
};

export const adminService = {
  getUsers: (params?: { page?: number; per_page?: number; search?: string; role?: string }) => api.get('/users', { params }),
  getUsersByOrg: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/users-by-org', { params }),
  getUsersByCompany: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/users-by-company', { params }),
  dropdown: () => api.get('/users-dropdown'),
  getUser: (id: number) => api.get(`/users/${id}`),
  createUser: (data: Record<string, unknown>) => api.post('/users', data),
  updateUser: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
  getUserRoles: (id: number) => api.get(`/users/${id}/roles`),
  assignUserRoles: (id: number, data: { roles: string[] }) => api.post(`/users/${id}/roles`, data),
  addUserRole: (id: number, data: { role: string }) => api.post(`/users/${id}/roles/add`, data),
  removeUserRole: (id: number, data: { role: string }) => api.post(`/users/${id}/roles/remove`, data),
};

export const roleService = {
  getAll: (params?: { search?: string }) => api.get('/roles', { params }),
  getById: (id: number) => api.get(`/roles/${id}`),
  create: (data: Record<string, unknown>) => api.post('/roles', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
  getPermissions: (id: number) => api.get(`/roles/${id}/permissions`),
  syncPermissions: (id: number, data: { permissions: string[] }) => api.post(`/roles/${id}/permissions`, data),
};

export const permissionService = {
  getAll: (params?: { search?: string; resource?: string }) => api.get('/permissions', { params }),
  getGrouped: () => api.get('/permissions/grouped'),
  getById: (id: number) => api.get(`/permissions/${id}`),
};

export const resourceService = {
  getAll: (params?: { search?: string }) => api.get('/resources', { params }),
  getById: (id: number) => api.get(`/resources/${id}`),
  getBySlug: (slug: string) => api.get(`/resources/slug/${slug}`),
};

export const organizationService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/organizations', { params }),
  getById: (id: number) => api.get(`/organizations/${id}`),
  create: (data: Record<string, unknown>) => api.post('/organizations', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
};

export const companyService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string; org_id?: number }) => api.get('/companies', { params }),
  getById: (id: number) => api.get(`/companies/${id}`),
  create: (data: Record<string, unknown>) => api.post('/companies', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/companies/${id}`, data),
  delete: (id: number) => api.delete(`/companies/${id}`),
};

export const assetTypeService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string; order_by?: string; order?: string }) => api.get('/asset-types', { params }),
  getById: (id: number) => api.get(`/asset-types/${id}`),
  create: (data: Record<string, unknown>) => api.post('/asset-types', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/asset-types/${id}`, data),
  delete: (id: number) => api.delete(`/asset-types/${id}`),
};

export const documentTypeService = {
  getAll: (params?: { page?: number; search?: string; per_page?: number; order_by?: string; order?: string }) => api.get('/document-types', { params }),
  // getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/document-types', { params }),
  getById: (id: number) => api.get(`/document-types/${id}`),
  create: (data: Record<string, unknown>) => api.post('/document-types', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/document-types/${id}`, data),
  delete: (id: number) => api.delete(`/document-types/${id}`),
};

export const documentLocationService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }) => api.get('/document-locations', { params }),
  getById: (id: number) => api.get(`/document-locations/${id}`),
  create: (data: Record<string, unknown>) => api.post('/document-locations', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/document-locations/${id}`, data),
  delete: (id: number) => api.delete(`/document-locations/${id}`),
};

export const documentService = {
  upload: (staffId: number, data: FormData) =>
    api.post(`/documents/upload/${staffId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    owner_type?: string;
    owner_id?: number;
    document_type_id?: number;
  }) => api.get('/documents', { params }),
  getById: (id: number) => api.get(`/documents/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/documents/${id}`, data),
  delete: (id: number) => api.delete(`/documents/${id}`),
  download: (id: number) => api.get(`/documents/${id}/download`),
  view: (id: number) => api.get(`/documents/${id}`),
};

export const documentConfigService = {
  createLocal: (data: Record<string, unknown>) => api.post('/document-configs/local', data),
  updateLocal: (id: number, data: Record<string, unknown>) => api.put(`/document-configs/local/${id}`, data),
  getLocalConfig: (locationId: number) => api.get(`/document-configs/local/${locationId}`),
  createWasabi: (data: Record<string, unknown>) => api.post('/document-configs/wasabi', data),
  updateWasabi: (id: number, data: Record<string, unknown>) => api.put(`/document-configs/wasabi/${id}`, data),
  getWasabiConfig: (locationId: number) => api.get(`/document-configs/wasabi/${locationId}`),
  createAws: (data: Record<string, unknown>) => api.post('/document-configs/aws', data),
  updateAws: (id: number, data: Record<string, unknown>) => api.put(`/document-configs/aws/${id}`, data),
  getAwsConfig: (locationId: number) => api.get(`/document-configs/aws/${locationId}`),
  getConfig: (locationId: number) => api.get(`/document-configs/${locationId}`),
};
export const onboardingTemplateService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string; status?: string }) => api.get('/onboarding-templates', { params }),
  getById: (id: number) => api.get(`/onboarding-templates/${id}`),
  create: (data: Record<string, unknown>) => api.post('/onboarding-templates', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/onboarding-templates/${id}`, data),
  delete: (id: number) => api.delete(`/onboarding-templates/${id}`),
  addTask: (id: number, data: Record<string, unknown>) => api.post(`/onboarding-templates/${id}/tasks`, data),
};

export const crmLeadService = {
  getAll: (params?: Record<string, unknown>) => api.get('/leads', { params }),
  getById: (id: number) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post('/leads', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
};

export const crmOpportunityService = {
  getAll: (params?: Record<string, unknown>) => api.get('/opportunities', { params }),
  getById: (id: number) => api.get(`/opportunities/${id}`),
  getProducts: (id: number) => api.get(`/opportunities/${id}/products`),
  create: (data: Record<string, unknown>) => api.post('/opportunities', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/opportunities/${id}`, data),
  delete: (id: number) => api.delete(`/opportunities/${id}`),
  declareLost: (id: number, data: any) => api.post(`/opportunities/${id}/declare-lost`, data),
  setMultipleStatus: (data: { ids: number[]; status_id: number }) => api.post('/opportunities/set-multiple-status', data),
};

export const crmOpportunityLostReasonService = {
  getAll: (params?: Record<string, unknown>) => api.get('/lost-reasons', { params }),
  getById: (id: number) => api.get(`/lost-reasons/${id}`),
  create: (data: Record<string, unknown>) => api.post('/lost-reasons', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/lost-reasons/${id}`, data),
  delete: (id: number) => api.delete(`/lost-reasons/${id}`),
};

export const crmProspectService = {
  getAll: (params?: Record<string, unknown>) => api.get('/prospects', { params }),
  getById: (id: number) => api.get(`/prospects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/prospects', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/prospects/${id}`, data),
  delete: (id: number) => api.delete(`/prospects/${id}`),
};

export const crmCustomerService = {
  getAll: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

export const crmCampaignService = {
  getAll: (params?: Record<string, unknown>) => api.get('/campaigns', { params }),
  getById: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: Record<string, unknown>) => api.post('/campaigns', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/campaigns/${id}`, data),
  delete: (id: number) => api.delete(`/campaigns/${id}`),
};

export const crmAppointmentService = {
  getAll: (params?: Record<string, unknown>) => api.get('/appointments', { params }),
  getById: (id: number) => api.get(`/appointments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/appointments', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/appointments/${id}`, data),
  delete: (id: number) => api.delete(`/appointments/${id}`),
};

export const crmContractService = {
  getAll: (params?: Record<string, unknown>) => api.get('/contracts', { params }),
  getById: (id: number) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  delete: (id: number) => api.delete(`/contracts/${id}`),
};

export const crmSalesStageService = {
  getAll: (params?: Record<string, unknown>) => api.get('/sales-stages', { params }),
  getById: (id: number) => api.get(`/sales-stages/${id}`),
  create: (data: Record<string, unknown>) => api.post('/sales-stages', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/sales-stages/${id}`, data),
  delete: (id: number) => api.delete(`/sales-stages/${id}`),
};

export const crmNoteService = {
  getAll: (params?: Record<string, unknown>) => api.get('/notes', { params }),
  create: (data: Record<string, unknown>) => api.post('/notes', data),
  delete: (id: number) => api.delete(`/notes/${id}`),
};

export const crmSourceService = {
  getAll: (params?: Record<string, unknown>) => api.get('/sources', { params }),
  getById: (id: number) => api.get(`/sources/${id}`),
  create: (data: Record<string, unknown>) => api.post('/sources', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/sources/${id}`, data),
  delete: (id: number) => api.delete(`/sources/${id}`),
};

export const crmTerritoryService = {
  getAll: (params?: Record<string, unknown>) => api.get('/territories', { params }),
  getById: (id: number) => api.get(`/territories/${id}`),
  create: (data: Record<string, unknown>) => api.post('/territories', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/territories/${id}`, data),
  delete: (id: number) => api.delete(`/territories/${id}`),
};

export const crmStatusService = {
  getAll: (params?: Record<string, unknown>) => api.get('/statuses', { params }),
};

export const crmOpportunityStageService = {
  getAll: (params?: Record<string, unknown>) => api.get('/opportunity-stages', { params }),
};

export const crmOpportunityTypeService = {
  getAll: (params?: Record<string, unknown>) => api.get('/opportunity-types', { params }),
};

// export const crmTerritoryService = {
//   getAll: (params?: Record<string, unknown>) => api.get('/territories', { params }),
// };

export const crmContactService = {
  getAll: (params?: Record<string, unknown>) => api.get('/contacts', { params }),
  getById: (id: number) => api.get(`/contacts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contacts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
};

export const crmProductService = {
  getAll: (params?: Record<string, unknown>) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

export const crmProductCategoryService = {
  getAll: (params?: Record<string, unknown>) => api.get('/product-categories', { params }),
  getById: (id: number) => api.get(`/product-categories/${id}`),
  create: (data: Record<string, unknown>) => api.post('/product-categories', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/product-categories/${id}`, data),
  delete: (id: number) => api.delete(`/product-categories/${id}`),
};

export const crmSettingService = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.put('/settings', data),
};

// export const crmProductCategoryService = {
//   getAll: (params?: Record<string, unknown>) => api.get('/product-categories', { params }),
//   getById: (id: number) => api.get(`/product-categories/${id}`),
//   create: (data: Record<string, unknown>) => api.post('/product-categories', data),
//   update: (id: number, data: Record<string, unknown>) => api.put(`/product-categories/${id}`, data),
//   delete: (id: number) => api.delete(`/product-categories/${id}`),
// };

// export const crmProductService = {
//   getAll: (params?: Record<string, unknown>) => api.get('/products', { params }),
//   getById: (id: number) => api.get(`/products/${id}`),
//   create: (data: Record<string, unknown>) => api.post('/products', data),
//   update: (id: number, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
//   delete: (id: number) => api.delete(`/products/${id}`),
// };
