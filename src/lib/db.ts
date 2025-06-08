import Dexie, { Table } from 'dexie';

export interface CachedLead {
  id: number;
  tenant_id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  created_at: string;
  lead_status: string;
  converted_on?: string | null;
}

export interface CachedClient {
  id: number;
  tenant_id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  created_at: string;
}

export interface CachedProject {
  id: number;
  tenant_id: number;
  project_name: string;
  project_status: string;
  project_description?: string;
  project_start?: string;
  project_end?: string;
  project_worth?: number;
  client_id?: number;
  lead_id?: number;
  created_at: string;
}

export interface CachedInteraction {
  id: number;
  tenant_id: number;
  contact_person?: string;
  email?: string;
  phone?: string;
  contact_date: string;
  notes?: string;
  outcome?: string;
  follow_up?: string;
  followup_status: string;
  summary: string;
  client_id?: number;
  lead_id?: number;
}

export interface QueuedRequest {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  timestamp: number;
}

class CRMDatabase extends Dexie {
  leads!: Table<CachedLead, number>;
  clients!: Table<CachedClient, number>;
  projects!: Table<CachedProject, number>;
  interactions!: Table<CachedInteraction, number>;
  offlineQueue!: Table<QueuedRequest, number>;

  constructor() {
    super("CRMDatabase");
    this.version(1).stores({
      leads: '++id, name, created_at',
      clients: '++id, name, created_at',
      projects: '++id, project_name, created_at',
      interactions: '++id, contact_date, followup_status',
      offlineQueue: '++id, url, method, timestamp'
    });
  }
}

export const db = new CRMDatabase();
