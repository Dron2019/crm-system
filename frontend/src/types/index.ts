export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  current_team_id: string;
  current_team?: Team;
  teams?: Team[];
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  billing_plan: string;
  role?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  job_title: string | null;
  avatar_url: string | null;
  source: string | null;
  status: string;
  assigned_to: User | null;
  companies: Company[];
  deals?: Deal[];
  tags: Tag[];
  activities?: Activity[];
  notes?: Note[];
  custom_fields: Record<string, unknown> | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  annual_revenue: string | null;
  phone: string | null;
  website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  logo_url: string | null;
  contacts?: Contact[];
  deals?: Deal[];
  tags?: Tag[];
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value: string;
  currency: string;
  expected_close_date: string | null;
  probability: number;
  status: string;
  lost_reason: string | null;
  pipeline?: Pipeline;
  stage?: Stage;
  contact?: Contact;
  company?: Company;
  assigned_to: User | null;
  tags: Tag[];
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages?: Stage[];
  created_at: string;
}

export interface Stage {
  id: string;
  name: string;
  display_order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_completed: boolean;
  user?: User;
  subject_type: string;
  subject_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Note {
  id: string;
  body: string;
  is_pinned: boolean;
  user?: User;
  notable_type: string;
  notable_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface AuditLog {
  id: string;
  team_id: string;
  user_id: string | null;
  user?: User;
  action: string;
  auditable_type: string;
  auditable_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
