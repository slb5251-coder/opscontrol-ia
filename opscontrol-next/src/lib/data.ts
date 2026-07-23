import { supabase } from './supabase';

export type Tank = {
  id: string;
  name: string;
  kind: string;
  phase: string;
  capacity: number;
  current_volume: number;
  current_product: string | null;
  status: string;
  unit: string;
};

export type DashboardSummary = {
  operations_in_progress: number | null;
  operations_scheduled: number | null;
  trucks_pending: number | null;
  qhse_pending: number | null;
};

export async function loadDashboard() {
  if (!supabase) throw new Error('Supabase não configurado.');

  const [tanksResult, summaryResult, alertsResult] = await Promise.all([
    supabase.from('tanks').select('id,name,kind,phase,capacity,current_volume,current_product,status,unit').order('display_order').limit(8),
    supabase.from('dashboard_summary').select('*').maybeSingle(),
    supabase.from('operational_alert_center').select('alert_key,title,message,level,created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const error = tanksResult.error || summaryResult.error || alertsResult.error;
  if (error) throw error;

  return {
    tanks: (tanksResult.data ?? []) as Tank[],
    summary: (summaryResult.data ?? null) as DashboardSummary | null,
    alerts: alertsResult.data ?? [],
  };
}
