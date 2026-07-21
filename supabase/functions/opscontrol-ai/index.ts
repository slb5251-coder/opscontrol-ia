import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

type JsonRecord = Record<string, unknown>;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://slb5251-coder.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);

const tasks: Record<string, string> = {
  handover: `Organize os dados como uma passagem de turno profissional da planta B-PORT LMP. Use, quando houver dados: Identificação do turno; Atividades realizadas; Operações em andamento; Recebimentos e movimentações; Pendências; Alertas de segurança; Observações. Preserve horários, clientes, embarcações, produtos, tags, lotes, OS, NF, bbl, toneladas, ppg e nomes próprios. Não invente informações e não marque ações como executadas sem evidência.`,
  report: `Transforme os dados em um relatório operacional objetivo. Use, quando aplicável: Resumo executivo; Atividades; Movimentações e volumes; Equipamentos e tancagem; Horários e vazões; Ocorrências e paralisações; Pendências; Próximos passos. Não invente causas, cálculos, volumes ou responsáveis.`,
  alert: `Analise o alerta operacional ou QHSE. Responda com: Resumo; Criticidade (baixa, média, alta ou crítica); Riscos possíveis; Ações imediatas recomendadas; Área responsável sugerida; Informações a confirmar. Não substitua APR, procedimento, permissão de trabalho ou decisão do responsável local. Em risco imediato, oriente interromper de forma segura conforme o procedimento interno, isolar a área e acionar a liderança/QHSE.`,
  assistant: `Atue como assistente operacional do OpsControl IA. Ajude a redigir DDS, e-mails, comunicados, inventários, resumos e análises em português do Brasil. Seja direto, profissional e fácil de copiar para WhatsApp ou e-mail. Use somente fatos fornecidos pelo usuário ou pelo contexto autorizado do sistema. Quando faltar dado, diga claramente o que deve ser confirmado.`,
};

const baseInstructions = `Você é o mini assistente do OpsControl IA, sistema de uma planta de fluidos e granéis de óleo e gás. Responda em português do Brasil. Não invente saldos, status, riscos, procedimentos, pessoas, datas, lotes, volumes ou conclusões. Diferencie fatos informados, dados atuais do sistema e recomendações. O contexto do sistema pode ter sido atualizado após a consulta; informe isso quando a atualidade for decisiva. Nunca apresente recomendação como autorização operacional.`;

const requestWindows = new Map<string, number[]>();

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowed = !origin || allowedOrigins.has(origin) || localOrigin;
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : DEFAULT_ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      ...extraHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isOriginAllowed(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return !origin || allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function rateLimit(userId: string) {
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const recent = (requestWindows.get(userId) || []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= 30) return false;
  recent.push(now);
  requestWindows.set(userId, recent);
  return true;
}

function extractOutputText(data: JsonRecord) {
  if (typeof data.output_text === "string") return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => String(item?.text || ""))
    .join("\n")
    .trim();
}

async function loadOperationalContext(client: ReturnType<typeof createClient>) {
  const [operations, tanks, trucks, alerts, maintenance] = await Promise.all([
    client.from("operations")
      .select("client,vessel,service_order,activity,product,lot,planned_quantity,executed_quantity,unit,status,start_at,end_at,flow_rate,flow_rate_unit,occurrence,updated_at")
      .in("status", ["Programada", "Em andamento", "Paralisada"])
      .order("updated_at", { ascending: false }).limit(8),
    client.from("tanks")
      .select("name,phase,kind,capacity,unit,current_product,current_lot,current_volume,status,current_density,current_density_unit,client,updated_at")
      .order("updated_at", { ascending: false }).limit(15),
    client.from("trucks")
      .select("movement_date,movement_type,supplier,client,product,lot,quantity,unit,plate,invoice_number,status,updated_at")
      .order("movement_date", { ascending: false }).limit(8),
    client.from("alerts")
      .select("title,message,level,target_group,is_read,created_at")
      .eq("is_read", false).order("created_at", { ascending: false }).limit(6),
    client.from("maintenance_orders")
      .select("title,description,priority,status,opened_at,due_date,responsible,maintenance_type")
      .in("status", ["Aberta", "Em andamento"])
      .order("opened_at", { ascending: false }).limit(6),
  ]);

  const safeData = (result: { data: unknown; error: unknown }) => result.error ? [] : (result.data || []);
  return {
    consulted_at: new Date().toISOString(),
    operations: safeData(operations),
    tanks: safeData(tanks),
    trucks: safeData(trucks),
    unread_alerts: safeData(alerts),
    open_maintenance: safeData(maintenance),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405);
  if (!isOriginAllowed(req)) return json(req, { error: "Origem não autorizada." }, 403);

  const startedAt = Date.now();
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
    const authorization = req.headers.get("Authorization") || "";

    if (!apiKey) return json(req, { error: "A IA ainda não está configurada no servidor." }, 503);
    if (!supabaseUrl || !publishableKey) return json(req, { error: "Ambiente Supabase incompleto." }, 500);
    if (!authorization.startsWith("Bearer ")) return json(req, { error: "Sessão inválida." }, 401);

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(req, { error: "Sessão inválida ou expirada." }, 401);

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("name,role,active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileError || !profile?.active) return json(req, { error: "Seu perfil está inativo ou indisponível." }, 403);
    if (!rateLimit(authData.user.id)) {
      return json(req, { error: "Limite temporário atingido. Aguarde alguns minutos e tente novamente." }, 429, { "Retry-After": "60" });
    }

    let body: JsonRecord = {};
    try {
      body = await req.json();
    } catch (_) {
      return json(req, { error: "Solicitação inválida." }, 400);
    }

    const taskCandidate = String(body.task || body.mode || "assistant").toLowerCase();
    const task = Object.prototype.hasOwnProperty.call(tasks, taskCandidate) ? taskCandidate : "assistant";
    const rawContent = body.content ?? body.input ?? body.prompt ?? "";
    const content = typeof rawContent === "string" ? rawContent.trim() : JSON.stringify(rawContent, null, 2);
    if (!content) return json(req, { error: "Informe o conteúdo para análise." }, 400);
    if (content.length > 30000) return json(req, { error: "Conteúdo muito grande. Limite de 30.000 caracteres." }, 413);

    const includeContext = body.include_context === true;
    const operationalContext = includeContext ? await loadOperationalContext(userClient) : null;
    const contextBlock = operationalContext
      ? `\n\nCONTEXTO ATUAL AUTORIZADO DO SISTEMA (JSON):\n${JSON.stringify(operationalContext)}`
      : "";
    const input = `SOLICITAÇÃO DO USUÁRIO:\n${content}${contextBlock}`;
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: `${baseInstructions}\n\nTAREFA SELECIONADA:\n${tasks[task]}`,
        input,
        store: false,
        max_output_tokens: 1800,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const data = await response.json() as JsonRecord;
    if (!response.ok) {
      const errorCode = String((data.error as JsonRecord | undefined)?.code || `http_${response.status}`);
      console.error("opscontrol-ai OpenAI request failed", { status: response.status, errorCode });
      return json(req, { error: "Não foi possível gerar a análise agora. Tente novamente em instantes.", code: errorCode }, 502);
    }

    const text = extractOutputText(data);
    if (!text) return json(req, { error: "A IA não retornou conteúdo utilizável." }, 502);

    return json(req, {
      success: true,
      task,
      text,
      result: text,
      context_included: Boolean(operationalContext),
      context_updated_at: operationalContext?.consulted_at || null,
      response_id: data.id || null,
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error("opscontrol-ai internal error", { type: error instanceof Error ? error.name : "unknown" });
    return json(req, {
      error: timedOut ? "A análise demorou mais que o esperado. Tente novamente." : "Erro interno ao processar a solicitação.",
    }, timedOut ? 504 : 500);
  }
});
