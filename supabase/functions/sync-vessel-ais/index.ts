import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const numberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const haversineNm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadiusNm = 3440.065;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const marineTrafficKey = Deno.env.get("MARINETRAFFIC_API_KEY") || "";
  const authorization = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Ambiente Supabase incompleto." }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return jsonResponse({ error: "Sessão inválida." }, 401);

  const { data: profile } = await userClient
    .from("profiles")
    .select("role, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  const allowedRoles = new Set(["admin", "supervisor", "lider", "logistica"]);
  if (!profile?.active || !allowedRoles.has(String(profile.role || "").toLowerCase())) {
    return jsonResponse({ error: "Seu perfil não pode sincronizar posições AIS." }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch (_) { payload = {}; }
  const scheduleId = typeof payload.schedule_id === "string" ? payload.schedule_id : null;
  const dryRun = payload.dry_run === true;

  const { data: run, error: runError } = await admin
    .from("vessel_ais_sync_runs")
    .insert({ provider: "MarineTraffic", requested_by: authData.user.id, status: "Executando" })
    .select("id")
    .single();
  if (runError) return jsonResponse({ error: runError.message }, 500);

  const finishRun = async (values: Record<string, unknown>) => {
    await admin.from("vessel_ais_sync_runs").update({ finished_at: new Date().toISOString(), ...values }).eq("id", run.id);
  };

  if (!marineTrafficKey) {
    await finishRun({ status: "Não configurado", message: "Cadastre o segredo MARINETRAFFIC_API_KEY no projeto Supabase." });
    return jsonResponse({
      configured: false,
      message: "A integração está instalada, mas a chave MARINETRAFFIC_API_KEY ainda não foi cadastrada no Supabase.",
      run_id: run.id,
    }, 503);
  }

  const { data: geofence } = await admin
    .from("vessel_geofences")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const portLat = Number(geofence?.latitude ?? Deno.env.get("AIS_PORT_LAT") ?? -21.846944);
  const portLon = Number(geofence?.longitude ?? Deno.env.get("AIS_PORT_LON") ?? -40.997778);
  const geofenceNm = Number(geofence?.radius_nm ?? Deno.env.get("AIS_GEOFENCE_NM") ?? 25);
  const staleMinutes = Number(Deno.env.get("AIS_STALE_MINUTES") ?? 120);

  let schedulesQuery = admin
    .from("vessel_schedules")
    .select("*")
    .eq("ais_enabled", true)
    .not("status", "in", "(Concluída,Cancelada)")
    .order("eta", { ascending: true })
    .limit(30);
  if (scheduleId) schedulesQuery = schedulesQuery.eq("id", scheduleId);
  const { data: schedules, error: schedulesError } = await schedulesQuery;
  if (schedulesError) {
    await finishRun({ status: "Falhou", message: schedulesError.message });
    return jsonResponse({ error: schedulesError.message }, 500);
  }

  const ensureAlert = async (
    schedule_id: string,
    alert_type: string,
    severity: string,
    title: string,
    message: string,
    metadata: Record<string, unknown>,
  ) => {
    const { data: existing } = await admin
      .from("vessel_ais_alerts")
      .select("id")
      .eq("schedule_id", schedule_id)
      .eq("alert_type", alert_type)
      .is("resolved_at", null)
      .limit(1)
      .maybeSingle();
    if (!existing) await admin.from("vessel_ais_alerts").insert({ schedule_id, alert_type, severity, title, message, metadata });
  };

  const resolveAlert = async (schedule_id: string, alert_type: string) => {
    await admin.from("vessel_ais_alerts").update({ resolved_at: new Date().toISOString() })
      .eq("schedule_id", schedule_id).eq("alert_type", alert_type).is("resolved_at", null);
  };

  let updated = 0;
  let failed = 0;
  const details: Record<string, unknown>[] = [];

  for (const schedule of schedules || []) {
    const identifier = schedule.mmsi ? `mmsi=${encodeURIComponent(schedule.mmsi)}`
      : schedule.imo ? `imo=${encodeURIComponent(schedule.imo)}` : "";
    if (!identifier) {
      failed++;
      details.push({ schedule_id: schedule.id, vessel: schedule.vessel_name, status: "sem_identificador" });
      await ensureAlert(schedule.id, "provider_error", "Média", "AIS sem identificador", "Informe MMSI ou IMO para sincronizar esta embarcação.", {});
      continue;
    }

    try {
      const endpoint = `https://services.marinetraffic.com/api/exportvessel/${marineTrafficKey}?v=6&protocol=jsono&timespan=1440&${identifier}`;
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`MarineTraffic HTTP ${response.status}`);
      const raw = await response.json();
      const result = Array.isArray(raw) ? raw[0] : Array.isArray(raw?.DATA) ? raw.DATA[0] : raw;
      const latitude = numberOrNull(result?.LAT ?? result?.lat ?? result?.latitude);
      const longitude = numberOrNull(result?.LON ?? result?.lon ?? result?.longitude);
      if (latitude === null || longitude === null) throw new Error("Resposta AIS sem latitude/longitude.");

      const timestampValue = result?.TIMESTAMP ?? result?.timestamp ?? result?.position_time;
      const positionTime = timestampValue && !Number.isNaN(Date.parse(String(timestampValue)))
        ? new Date(String(timestampValue)).toISOString() : new Date().toISOString();
      const rawSpeed = numberOrNull(result?.SPEED ?? result?.speed);
      const speedKnots = rawSpeed === null ? null : rawSpeed / 10;
      const courseDegrees = numberOrNull(result?.COURSE ?? result?.course);
      const rawHeading = numberOrNull(result?.HEADING ?? result?.heading);
      const headingDegrees = rawHeading === -1 || rawHeading === 511 ? null : rawHeading;
      const distanceNm = haversineNm(latitude, longitude, portLat, portLon);
      const aisEtaValue = result?.ETA_CALC || result?.ETA || null;
      const aisEta = aisEtaValue && !Number.isNaN(Date.parse(String(aisEtaValue)))
        ? new Date(String(aisEtaValue)).toISOString() : null;

      const { data: previous } = await admin.from("vessel_positions")
        .select("latitude,longitude,position_time")
        .eq("schedule_id", schedule.id)
        .order("position_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      const previousDistance = previous ? haversineNm(Number(previous.latitude), Number(previous.longitude), portLat, portLon) : null;

      if (!dryRun) {
        await admin.from("vessel_positions").upsert({
          schedule_id: schedule.id,
          latitude,
          longitude,
          speed_knots: speedKnots,
          course_degrees: courseDegrees,
          heading_degrees: headingDegrees,
          navigation_status: String(result?.STATUS ?? result?.status ?? ""),
          position_time: positionTime,
          source: "MarineTraffic",
          raw_payload: result,
        }, { onConflict: "schedule_id,position_time", ignoreDuplicates: true });

        await admin.from("vessel_schedules").update({
          last_ais_at: positionTime,
          ais_eta: aisEta,
          distance_to_port_nm: Number(distanceNm.toFixed(2)),
          ais_sync_status: "Atualizado",
          ais_sync_message: null,
          updated_by: authData.user.id,
        }).eq("id", schedule.id);

        const ageMinutes = (Date.now() - new Date(positionTime).getTime()) / 60000;
        if (ageMinutes > staleMinutes) {
          await ensureAlert(schedule.id, "stale_signal", "Alta", "Sinal AIS desatualizado", `A última posição de ${schedule.vessel_name} tem ${Math.round(ageMinutes)} minutos.`, { age_minutes: ageMinutes });
        } else {
          await resolveAlert(schedule.id, "stale_signal");
        }
        if (distanceNm <= geofenceNm) {
          await ensureAlert(schedule.id, "arrival_window", "Alta", "Embarcação próxima ao Porto do Açu", `${schedule.vessel_name} está a ${distanceNm.toFixed(1)} mn da zona operacional.`, { distance_nm: distanceNm, radius_nm: geofenceNm });
          if (previousDistance !== null && previousDistance > geofenceNm && geofence?.alert_on_entry !== false) {
            await ensureAlert(schedule.id, "geofence_entry", "Crítica", "Entrada na zona operacional", `${schedule.vessel_name} entrou no raio de ${geofenceNm} mn do Porto do Açu.`, { distance_nm: distanceNm, previous_distance_nm: previousDistance });
          }
        }
        if (schedule.eta && aisEta) {
          const differenceHours = Math.abs(new Date(schedule.eta).getTime() - new Date(aisEta).getTime()) / 3600000;
          if (differenceHours >= 6) {
            await ensureAlert(schedule.id, "eta_divergence", "Alta", "Divergência de ETA", `O ETA AIS de ${schedule.vessel_name} diverge ${differenceHours.toFixed(1)} h da programação.`, { planned_eta: schedule.eta, ais_eta: aisEta, difference_hours: differenceHours });
          } else {
            await resolveAlert(schedule.id, "eta_divergence");
          }
        }
        await resolveAlert(schedule.id, "provider_error");
      }

      updated++;
      details.push({ schedule_id: schedule.id, vessel: schedule.vessel_name, status: dryRun ? "simulado" : "atualizado", position_time: positionTime, distance_nm: Number(distanceNm.toFixed(2)) });
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      details.push({ schedule_id: schedule.id, vessel: schedule.vessel_name, status: "falhou", error: message });
      if (!dryRun) {
        await admin.from("vessel_schedules").update({ ais_sync_status: "Falhou", ais_sync_message: message, updated_by: authData.user.id }).eq("id", schedule.id);
        await ensureAlert(schedule.id, "provider_error", "Alta", "Falha na sincronização AIS", `${schedule.vessel_name}: ${message}`, {});
      }
    }
  }

  const processed = (schedules || []).length;
  const status = failed === 0 ? "Concluído" : updated > 0 ? "Parcial" : "Falhou";
  await finishRun({ status, processed_count: processed, updated_count: updated, failed_count: failed, message: dryRun ? "Execução de teste, sem gravação." : null });

  return jsonResponse({ configured: true, dry_run: dryRun, processed, updated, failed, run_id: run.id, details });
});
