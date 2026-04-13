import { Contact, Customer, CustomerGroup, Lead, Opportunity, OpportunityLostReason, PaymentTerm, PriceList, Prospect, SalesTask, SalesTaskDetail, Territory, WrappedPaginatedResponse } from '@/types';
import axios from 'axios';

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
  // Timber Dashboard - SINGLE UNIFIED API
  getTimberDashboard: (params?: { stock_movements_days?: number; recent_pos_limit?: number }) =>
    api.get('/dashboard/timber', { params }),

  // CRM Dashboard - SINGLE UNIFIED API
  getCrmDashboard: (params?: Record<string, unknown>) => api.get('/dashboard/crm', { params }),

  // Legacy CRM endpoints (still available if needed)
  getStats: (params?: Record<string, unknown>) => api.get('/dashboard/crm/stats', { params }),
  getSalesOverview: (params?: Record<string, unknown>) => api.get('/dashboard/crm/sales-overview', { params }),
  getLeadConversionFunnel: (params?: Record<string, unknown>) => api.get('/dashboard/crm/lead-conversion-funnel', { params }),
  getOpportunityPipeline: (params?: Record<string, unknown>) => api.get('/dashboard/crm/opportunity-pipeline', { params }),
};

// Admin & RBAC
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
  // Send multipart/form-data for logo upload on create
  createWithFile: (data: FormData) =>
    api.post('/companies', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: Record<string, unknown>) => api.put(`/companies/${id}`, data),
  // Send multipart/form-data with _method=PUT for logo upload on edit
  updateWithFile: (id: number, data: FormData) =>
    api.post(`/companies/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/companies/${id}`),
};

// CRM Services

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

export const projectService = {
  getAll: (params?: Record<string, unknown>) => api.get('/projects', { params }),
  getById: (id: number) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
};

export const crmSettingService = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.put('/settings', data),
};
export const estimationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/estimations', { params }),
  get: (id: number | string) => api.get(`/estimations/${id}`),
  create: (data: any) => api.post('/estimations', data),
  update: (id: number | string, data: any) => api.put(`/estimations/${id}`, data),
  delete: (id: number | string) => api.delete(`/estimations/${id}`),
  cancel: (id: number | string) => api.post(`/estimations/${id}/cancel`),
  reject: (id: number | string, data?: { reason?: string }) => api.post(`/estimations/${id}/cancel`, data),
  approve: (id: number | string) => api.post(`/estimations/${id}/approve`),
};

export const projectApi = {
  list: (params?: Record<string, unknown>) => api.get('/projects', { params }).then(res => {
    const data = res.data;
    if (Array.isArray(data)) return data as any;
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return data as any;
    return (data as any).data || data;
  }),
  get: (id: number | string) => api.get(`/projects/${id}`).then(res => res.data),
  create: (data: Record<string, unknown>) => api.post('/projects', data).then(res => res.data),
  update: (id: number | string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data).then(res => res.data),
  delete: (id: number | string) => api.delete(`/projects/${id}`),
};
