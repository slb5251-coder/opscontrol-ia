(() => {
  "use strict";

  const VERSION = "20260722-truck-delete-1";
  const CONFIG_KEY = "opscontrol_config";
  const ENV_KEY = "opscontrol_environment";
  const REMEMBER_KEY = "opscontrol_remember_login";
  const DELETE_ROLES = ["admin", "administrador", "supervisor", "lider", "logistica"];
  const $ = (selector, root = document) => root?.querySelector(selector) || null;
  const $$ = (selector, root = document) => [...(root?.querySelectorAll(selector) || [])];

  const state = {
    client: null,
    user: null,
    trucks: [],
    loading: false,
    loaded: false,
    enhanceTimer: null
  };

  function clean(value = "") {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalize(value = "") {
    return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function currentRole() {
    return normalize($("#userRole")?.textContent || "");
  }

  function canDelete() {
    const role = currentRole();
    return DELETE_ROLES.some(value => role.includes(value));
  }

  function appConfig() {
    const config = window.OPSCONTROL_CONFIG || {};
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"); } catch {}
    const environment = localStorage.getItem(ENV_KEY) || config.defaultEnvironment || "production";
    const selected = config.environments?.[environment] || {};
    return {
      url: saved.url || selected.supabaseUrl || config.supabaseUrl || "",
      key: saved.key || selected.supabaseKey || config.supabaseKey || ""
    };
  }

  async function ensureClient() {
    if (state.client && state.user) return true;
    const { url, key } = appConfig();
    if (!url || !key || !window.supabase?.createClient) return false;
    const remember = localStorage.getItem(REMEMBER_KEY) !== "false";
    state.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: remember ? window.localStorage : window.sessionStorage,
        storageKey: remember ? "opscontrol-auth" : "opscontrol-auth-session"
      }
    });
    const { data, error } = await state.client.auth.getSession();
    if (error || !data.session?.user) return false;
    state.user = data.session.user;
    return true;
  }

  function truckById(id) {
    return state.trucks.find(item => item.id === id) || null;
  }

  function toast(message, tone = "success") {
    const container = $("#toastContainer") || document.body;
    const element = document.createElement("div");
    element.className = `toast truck-delete-toast ${tone}`;
    element.textContent = message;
    container.appendChild(element);
    setTimeout(() => element.remove(), 4500);
  }

  async function loadTrucks({ silent = false } = {}) {
    if (state.loading || !canDelete()) return;
    state.loading = true;
    try {
      if (!await ensureClient()) return;
      const { data, error } = await state.client
        .from("trucks")
        .select("id,plate,invoice_number,product,truck_type,movement_type,stock_applied")
        .order("created_at", { ascending: false });
      if (error) throw error;
      state.trucks = data || [];
      state.loaded = true;
      scheduleEnhance();
    } catch (error) {
      if (!silent) console.error("[Truck Delete]", error);
    } finally {
      state.loading = false;
    }
  }

  function truckLabel(truck) {
    return clean(truck?.plate) || clean(truck?.invoice_number) || clean(truck?.product) || "movimentação selecionada";
  }

  function ensureDeleteButton(editButton) {
    const truckId = editButton.dataset.editTruck;
    if (!truckId) return;
    const actions = editButton.closest(".row-actions");
    if (!actions || actions.querySelector(`[data-delete-truck="${truckId}"]`)) return;

    const truck = truckById(truckId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn small danger outline truck-delete-button";
    button.dataset.deleteTruck = truckId;
    button.textContent = "Excluir";

    if (truck?.stock_applied) {
      button.disabled = true;
      button.title = "O estoque desta carreta já foi aplicado. Faça um ajuste de estoque em vez de excluir.";
      button.setAttribute("aria-label", "Exclusão bloqueada porque o estoque já foi aplicado");
    } else {
      button.title = "Excluir lançamento incorreto";
      button.setAttribute("aria-label", `Excluir ${truckLabel(truck)}`);
    }

    actions.appendChild(button);
  }

  function enhancePage() {
    if (!state.loaded || !canDelete()) return;
    const page = $("#page-trucks");
    if (!page) return;
    $$("[data-edit-truck]", page).forEach(ensureDeleteButton);
  }

  function scheduleEnhance() {
    clearTimeout(state.enhanceTimer);
    state.enhanceTimer = setTimeout(enhancePage, 60);
  }

  async function removeStorageFiles(paths = []) {
    const files = paths.filter(Boolean);
    if (!files.length) return;
    const { error } = await state.client.storage.from("opscontrol-files").remove(files);
    if (error) console.warn("[Truck Delete] Arquivos não removidos do storage:", error);
  }

  async function deleteTruck(button) {
    const truckId = button.dataset.deleteTruck;
    const truck = truckById(truckId);
    if (!truckId || !truck) {
      toast("Carreta não localizada. Atualize a página.", "error");
      return;
    }
    if (truck.stock_applied) {
      toast("Esta carreta já movimentou estoque e não pode ser excluída.", "error");
      return;
    }

    const label = truckLabel(truck);
    const confirmed = window.confirm(`Excluir definitivamente ${label}?\n\nUse esta opção apenas para lançamento feito errado. Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    const reasonInput = window.prompt("Informe o motivo da exclusão:", "Lançamento incorreto");
    if (reasonInput === null) return;
    const reason = clean(reasonInput) || "Lançamento incorreto";

    button.disabled = true;
    button.textContent = "Excluindo...";
    try {
      if (!await ensureClient()) throw new Error("Sessão não encontrada. Entre novamente no sistema.");
      const { data, error } = await state.client.rpc("delete_truck_movement_v1", {
        p_truck_id: truckId,
        p_reason: reason
      });
      if (error) throw error;

      await removeStorageFiles(Array.isArray(data?.file_paths) ? data.file_paths : []);
      toast(`${label} excluída com sucesso.`);
      state.trucks = state.trucks.filter(item => item.id !== truckId);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      button.disabled = false;
      button.textContent = "Excluir";
      toast(error.message || "Não foi possível excluir a carreta.", "error");
    }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-delete-truck]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      deleteTruck(button);
    });
  }

  function start() {
    bindEvents();
    const page = $("#page-trucks");
    if (page) new MutationObserver(scheduleEnhance).observe(page, { childList: true, subtree: true });
    document.addEventListener("opscontrol:interface-ready", () => loadTrucks({ silent: true }));
    [300, 1000, 2500].forEach(delay => setTimeout(() => loadTrucks({ silent: true }), delay));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();