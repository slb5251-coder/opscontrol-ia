import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const files = [
  'supabase/migrations/20260723001500_revoke_anon_and_public_policies.sql',
  'supabase/migrations/20260723001600_consolidate_rls_policies.sql',
  'supabase/migrations/20260723001700_cover_foreign_keys_and_remove_duplicates.sql'
];

const contents = await Promise.all(files.map(async file => ({
  file,
  text: await readFile(resolve(root, file), 'utf8')
})));
const combined = contents.map(item => item.text).join('\n').toLowerCase();
let failed = false;

function assert(condition, message, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${message}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failed = true;
}

for (const { file, text } of contents) {
  assert(text.trim().length > 0, 'migration não está vazia', file);
  assert(!/create\s+policy[\s\S]*?\bto\s+public\b/i.test(text), 'migration não cria política para PUBLIC', file);
  assert(!/grant[\s\S]*?\bto\s+anon\b/i.test(text), 'migration não concede privilégio ao anon', file);
}

const requiredSecurityStatements = [
  'revoke all privileges on all tables in schema public from anon',
  'revoke all privileges on all tables in schema public from public',
  'revoke execute on all functions in schema public from anon',
  'revoke execute on all functions in schema public from public',
  'alter default privileges in schema public revoke execute on functions from anon',
  'alter default privileges in schema public revoke execute on functions from public',
  'grant select,insert,update,delete on all tables in schema public to authenticated'
];
for (const statement of requiredSecurityStatements) {
  assert(combined.includes(statement), 'controle de acesso obrigatório presente', statement);
}

const publicPolicyTables = [
  'chemical_products',
  'inventory_counts',
  'operation_tank_allocations',
  'operational_closings',
  'closing_reconciliation_items'
];
for (const table of publicPolicyTables) {
  assert(combined.includes(`on public.${table}`), 'tabela com política pública foi tratada', table);
  assert(new RegExp(`on\\s+public\\.${table}[\\s\\S]{0,140}to\\s+authenticated`, 'i').test(combined), 'política recriada para authenticated', table);
}

const redundantPolicies = [
  'action_items_admin_update_all',
  'alerts_admin_update_all',
  'chemical_inventory_admin_update_all',
  'equipment_admin_update_all',
  'fluid_types_admin_update_all',
  'maintenance_orders_admin_update_all',
  'operations_admin_update_all',
  'qhse_records_admin_update_all',
  'tanks_admin_update_all',
  'trucks_admin_update_all'
];
for (const policy of redundantPolicies) {
  assert(combined.includes(`drop policy if exists ${policy}`), 'política redundante removida', policy);
}

assert(combined.includes('created_by = (select auth.uid())'), 'auth.uid otimizado em created_by');
assert(combined.includes('updated_by = (select auth.uid())'), 'auth.uid otimizado em updated_by');
assert(combined.includes('user_id = (select auth.uid())'), 'auth.uid otimizado em user_id');

const requiredIndexes = [
  'idx_alerts_acknowledged_by',
  'idx_alerts_resolved_by',
  'idx_chemical_products_created_by',
  'idx_client_document_tickets_operation_id',
  'idx_course_enrollments_course_id',
  'idx_documents_created_by',
  'idx_documents_updated_by',
  'idx_operational_closings_closed_by',
  'idx_tank_movements_responsible_id',
  'idx_vessel_schedules_created_by',
  'idx_vessel_schedules_updated_by'
];
for (const index of requiredIndexes) {
  assert(combined.includes(`create index if not exists ${index}`), 'índice de chave estrangeira presente', index);
}

assert(combined.includes('drop index if exists public.idx_tank_history_tank_created'), 'índice duplicado de histórico removido');
assert(combined.includes('drop index if exists public.truck_items_truck_product_unique'), 'índice duplicado de carretas removido');

if (failed) process.exit(1);
