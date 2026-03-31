export interface Lead {
  id: number;
  series: string | null;
  salutation: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  job_title: string | null;
  gender: string | null;
  status_id: number | null;
  status_name?: string;
  status: Status | null;
  source_id: number | null;
  source_name?: string;
  source: Source | null;
  request_type_id: number | null;
  request_type: RequestType | null;
  email: string | null;
  phone: string | null;
  mobile_no: string | null;
  website: string | null;
  whatsapp_no: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  company_name: string | null;
  annual_revenue: number | null;
  no_of_employees: string | null;
  industry_id: number | null;
  industry: IndustryType | null;
  qualification_status: string | null;
  qualified_by: number | null;
  qualified_on: string | null;
  territory: string | null;
  created_at: string;
  updated_at: string;
  pivot?: {
    lead_name: string;
    email: string;
    mobile_no: string;
    status: string;
  };
}

export interface Opportunity {
  id: number;
  naming_series: string | null;
  opportunity_type_id: number | null;
  opportunity_type: OpportunityType | null;
  opportunity_stage_id: number | null;
  opportunity_stage: OpportunityStage | null;
  opportunity_from: 'lead' | 'customer' | 'prospect' | null;
  lead_id: number | null;
  lead: Lead | null;
  source_id: number | null;
  source: Source | null;
  expected_closing: string | null;
  party_name: string | null;
  opportunity_owner: number | null;
  owner: { id: number; name: string; email: string } | null;
  probability: number | null;
  status_id: number | null;
  status_name?: string;
  status: Status | null;
  stage_name?: string;
  company_name: string | null;
  industry_id: number | null;
  industry: IndustryType | null;
  no_of_employees: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  annual_revenue: number | null;
  market_segment: string | null;
  currency: string | null;
  opportunity_amount: number | null;
  customer_id: number | null;
  customer: Customer | null;
  prospect_id: number | null;
  prospect: Prospect | null;
  items: OpportunityItem[];
  with_items: boolean;
  contact_person: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  territory_id: number | null;
  territory: Territory | null;
  next_contact_by: string | null;
  next_contact_date: string | null;
  to_discuss: string | null;
  contact: Contact | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityItem {
  id: number;
  opportunity_id: number;
  item_code: string | null;
  item_name: string | null;
  qty: number;
  rate: number;
  amount: number;
  uom: string | null;
}

export interface Prospect {
  id: number;
  company_name: string;
  status: string;
  source: string | null;
  industry: string | null;
  market_segment: string | null;
  customer_group: string | null;
  territory: string | null;
  no_of_employees: string | null;
  annual_revenue: number | null;
  fax: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  prospect_owner_id: number | null;
  company: string | null;
  leads: Lead[];
  opportunities: Opportunity[];
  notes: CrmNote[];
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: number;
  name: string;
  source_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  campaign_code: string | null;
  email_schedules: CampaignEmailSchedule[];
  email_campaigns: EmailCampaign[];
  created_at: string;
  updated_at: string;
}

export interface CampaignEmailSchedule {
  id: number;
  campaign_id: number;
  email_template: string | null;
  send_after_days: number;
}

export interface EmailCampaign {
  id: number;
  campaign_id: number;
  email_campaign_for: string;
  recipient: string;
  sender_id: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
}

export interface Contract {
  id: number;
  party_type: string;
  party_name: string;
  party_user_id: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  contract_template: string | null;
  contract_terms: string;
  is_signed: boolean;
  signed_on: string | null;
  signee: string | null;
  signee_company: string | null;
  requires_fulfilment: boolean;
  fulfilment_deadline: string | null;
  fulfilment_status: string | null;
  fulfilment_checklists: ContractFulfilmentChecklist[];
  created_at: string;
  updated_at: string;
}

export interface ContractFulfilmentChecklist {
  id: number;
  contract_id: number;
  requirement: string;
  fulfilled: boolean;
  notes: string | null;
}

export interface Appointment {
  id: number;
  scheduled_time: string;
  status: string;
  customer_name: string;
  customer_phone_number: string | null;
  customer_skype: string | null;
  customer_email: string;
  customer_details: string | null;
  appointment_with: string | null;
  party: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesStage {
  id: number;
  stage_name: string;
  description: string | null;
}

export interface Status {
  id: number;
  status_name: string;
  created_at: string;
  updated_at: string;
}

export interface RequestType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface IndustryType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityLostReason {
  id: number;
  opportunity_id: number;
  opportunity_lost_reasons: string;
  opportunity?: Opportunity | null;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: number;
  competitor_name: string;
  website: string | null;
}

export interface OpportunityStage {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category_id: number | null;
  category: ProductCategory | null;
  name: string;
  code: string | null;
  description: string | null;
  long_description: string | null;
  slug: string | null;
  stock: number;
  rate: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CrmNote {
  id: number;
  notable_type: string;
  notable_id: number;
  note: string;
  added_by: number | null;
  added_on: string;
}

export interface CrmSetting {
  id: number;
  campaign_naming_by: string | null;
  allow_lead_duplication_based_on_emails: boolean;
  auto_creation_of_contact: boolean;
  close_opportunity_after_days: number | null;
  default_valid_till: number | null;
  carry_forward_communication_and_comments: boolean;
}

export interface DashboardStats {
  leads: {
    total: number;
    new_last_30_days: number;
    by_status: Array<{ status: string; count: number }>;
    by_qualification: Array<{ qualification_status: string; count: number }>;
    funnel: Array<{ stage: string; count: number }>;
  };
  opportunities: {
    total: number;
    open: number;
    won_last_30_days: number;
    total_value: number;
    by_status: Array<{ status: string; count: number }>;
    by_stage: Array<{ stage_name: string; count: number; total_value: number }>;
    lost_reasons: Array<{ reason: string; count: number }>;
  };
  appointments: {
    total: number;
    upcoming: number;
  };
  contracts: {
    active: number;
    unsigned: number;
  };
}

export interface Territory {
  id: number;
  territory_name: string;
  territory_manager: number | null;
  manager: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ContactPhone {
  id?: number;
  contact_id?: number;
  phone_no: string | null;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContactEmail {
  id?: number;
  contact_id?: number;
  email: string | null;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: number;
  salutation: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  designation: string | null;
  gender: string | null;
  company_name: string | null;
  address: string | null;
  status: string;
  full_name: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface WrappedPaginatedResponse<T> {
  message: string;
  data: PaginatedResponse<T>;
  pagination: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total_items: number;
    next_page_url: string | null;
    prev_page_url: string | null;
  };
}

export interface CustomerGroup {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PriceList {
  id: number;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTerm {
  id: number;
  name: string;
  days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  customer_type: string | null;
  customer_group_id: number | null;
  customer_group_name?: string;
  customer_group: CustomerGroup | null;
  territory_id: number | null;
  territory_name?: string;
  territory: Territory | null;
  lead_id: number | null;
  lead: Lead | null;
  opportunity_id: number | null;
  opportunity: Opportunity | null;
  industry_id: number | null;
  industry_name?: string;
  industry: IndustryType | null;
  default_price_list_id: number | null;
  price_list: PriceList | null;
  payment_term_id: number | null;
  payment_term: PaymentTerm | null;
  customer_contact_id: number | null;
  primary_contact: Contact | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  tax_id: string | null;
  billing_currency: string | null;
  bank_account_details: string | null;
  print_language: string | null;
  customer_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSource {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskType {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface SalesTask {
  id: number;
  task_source_id: number;
  source_id: number | null;
  task_type_id: number;
  sales_assign_id: number | null;
  formatted_date?: string;
  task_source?: TaskSource;
  task_type?: TaskType;
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  };
  details: SalesTaskDetail[];
  source_detail?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
    name?: string;
    naming_series?: string;
    party_name?: string;
    opportunity_amount?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SalesTaskDetail {
  id: number;
  sales_task_id: number | null;
  sales_task?: SalesTask;
  date: string;
  time: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  created_at: string;
  updated_at: string;
}

export interface EnumOption {
  value: string;
  label: string;
}
