(() => {
  "use strict";

  const VERSION = "1.0.0-main-integrated";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CONFIG = window.OPSCONTROL_CONFIG || {};
  const savedConfig = JSON.parse(localStorage.getItem("opscontrol_config") || "{}");
  const environment = localStorage.getItem("opscontrol_environment") || CONFIG.defaultEnvironment || "production";
  const selectedEnvironment = CONFIG.environments?.[environment] || {};
  const supabaseUrl = savedConfig.url || selectedEnvironment.supabaseUrl || CONFIG.supabaseUrl || "";
  const supabaseKey = savedConfig.key || selectedEnvironment.supabaseKey || CONFIG.supabaseKey || "";
  const client = supabaseUrl && supabaseKey && window.supabase
    ? window.supabase.createClient(supabaseUrl, supabaseKey)
    : null;

  const MODES = {
    handover: {
      title: "Dados da passagem de turno",
      placeholder: "Cole as atividades realizadas, pendências, ocorrências e observações do turno...",
      examples: [
        ["Passagem logística", "Recebimento de 3 carretas de KCL, atualização da RFF e conferência dos lotes."],
        ["Passagem operacional", "Bombeio de 60 t de barita, fabricação de 500 bbl de Brine e condição dos tanques."],
        ["Turno com ocorrência", "Motor B03 apresentou aquecimento. Operação mantida em segurança e manutenção acionada."]
      ]
    },
    report: {
      title: "Dados do relatório operacional",
      placeholder: "Informe cliente, embarcação, produto, volume, horários, vazão, equipamentos e ocorrências...",
      examples: [
        ["Relatório de bombeio", "PRIO, embarcação PSV, Barita 60 t, início 10:30, término 13:40."],
        ["Relatório de fabricação", "Brine 2.500 bbl, densidade 10,2 ppg, produzido nos TK-01 a TK-03."],
        ["Resumo diário", "Organize as operações, recebimentos, fabricações e pendências do dia."]
      ]
    },
    alert: {
      title: "Descrição do alerta",
      placeholder: "Descreva a condição, local, equipamento, impacto, risco e medidas já tomadas...",
      examples: [
        ["Motor aquecendo", "Motor B03 com temperatura elevada durante o bombeio."],
        ["Vazamento em linha", "Vazamento identificado na linha de recalque próxima ao TK-05."],
        ["Mangueira danificada", "Mangueira com desgaste próximo à conexão Fig. 206."]
      ]
    },
    assistant: {
      title: "Pergunta ou solicitação",
      placeholder: "Peça um DDS, e-mail, análise, inventário organizado, resumo ou orientação operacional...",
      examples: [
        ["Gerar DDS", "Crie um DDS sobre movimentação segura de cargas e isolamento da área."],
        ["Redigir e-mail", "Crie um e-mail informando o recebimento de três carretas de Olefina."],
        ["Organizar inventário", "Formate este inventário para envio no WhatsApp de forma profissional."]
      ]
    }
  };

  let currentMode = "handover";
  let currentResult = "";
  let rendered = false;

  function safeText(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
  }

  function assistantMarkup() {
    return `<div class="ocai-wrap" data-ocai-version="${VERSION}">
      <section class="ocai-hero">
        <div>
          <span class="ocai-kicker">Assistente operacional</span>
          <h1>IA integrada ao OpsControl</h1>
          <p>Transforme informações do turno em passagens, relatórios, alertas e comunicações prontas para uso, sem sair do sistema.</p>
        </div>
        <div class="ocai-security">
          <span class="ocai-security-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></span>
          <strong>Conexão protegida</strong>
          <small>OpenAI via Supabase Edge Function</small>
        </div>
      </section>

      <div class="ocai-status-row">
        <span id="ocaiStatus" class="ocai-status">Verificando conexão</span>
        <span class="ocai-hint">Use Ctrl + Enter para gerar.</span>
      </div>

      <section class="ocai-mode-section">
        <div class="ocai-section-head"><div><h2>O que deseja fazer?</h2><p>Escolha o formato ideal para sua necessidade.</p></div></div>
        <div class="ocai-mode-grid">
          <button class="ocai-mode active" data-ocai-mode="handover"><span class="ocai-mode-icon">🔄</span><strong>Passagem de turno</strong><small>Organiza atividades e pendências.</small></button>
          <button class="ocai-mode" data-ocai-mode="report"><span class="ocai-mode-icon">📄</span><strong>Relatório operacional</strong><small>Estrutura volumes, horários e fatos.</small></button>
          <button class="ocai-mode" data-ocai-mode="alert"><span class="ocai-mode-icon">⚠️</span><strong>Análise de alerta</strong><small>Avalia risco, prioridade e ação.</small></button>
          <button class="ocai-mode" data-ocai-mode="assistant"><span class="ocai-mode-icon">✨</span><strong>Assistente geral</strong><small>Redige e responde solicitações.</small></button>
        </div>
      </section>

      <div class="ocai-grid">
        <section class="ocai-panel">
          <div class="ocai-panel-head"><div><span class="ocai-label">ENTRADA</span><h2 id="ocaiInputTitle">Dados da passagem de turno</h2></div><button id="ocaiClear" class="ocai-ghost" type="button">Limpar</button></div>
          <textarea id="ocaiPrompt" maxlength="30000" placeholder="${MODES.handover.placeholder}"></textarea>
          <div class="ocai-input-foot"><span id="ocaiCounter" class="ocai-counter">0 / 30.000</span><button id="ocaiGenerate" class="ocai-generate" type="button"><span>✨</span> Gerar com IA</button></div>
          <div id="ocaiMessage" class="ocai-message ocai-hidden"></div>
        </section>

        <section class="ocai-panel">
          <div class="ocai-panel-head"><div><span class="ocai-label">RESULTADO</span><h2>Conteúdo gerado</h2></div><button id="ocaiCopy" class="ocai-ghost" type="button" disabled>Copiar</button></div>
          <div id="ocaiResult" class="ocai-result empty"><div class="ocai-empty-icon">🤖</div><strong>O resultado aparecerá aqui</strong><span>Informe os dados e clique em “Gerar com IA”.</span></div>
          <div class="ocai-actions"><button id="ocaiWhatsApp" type="button" disabled>WhatsApp</button><button id="ocaiEmail" type="button" disabled>E-mail</button><button id="ocaiPrint" type="button" disabled>Imprimir / PDF</button></div>
        </section>
      </div>

      <section class="ocai-examples"><div class="ocai-section-head"><div><h2>Exemplos rápidos</h2><p>Toque em um exemplo para preencher o campo.</p></div></div><div id="ocaiExamples" class="ocai-example-grid"></div></section>
    </div>`;
  }

  function setStatus(text, state = "") {
    const element = $("#ocaiStatus");
    if (!element) return;
    element.textContent = text;
    element.className = `ocai-status ${state}`.trim();
  }

  function setMessage(text = "", type = "") {
    const element = $("#ocaiMessage");
    if (!element) return;
    element.textContent = text;
    element.className = text ? `ocai-message ${type}` : "ocai-message ocai-hidden";
  }

  function setResultActions(enabled) {
    ["#ocaiCopy", "#ocaiWhatsApp", "#ocaiEmail", "#ocaiPrint"].forEach(selector => {
      const button = $(selector);
      if (button) button.disabled = !enabled;
    });
  }

  function updateCounter() {
    const prompt = $("#ocaiPrompt");
    const counter = $("#ocaiCounter");
    if (prompt && counter) counter.textContent = `${prompt.value.length.toLocaleString("pt-BR")} / 30.000`;
  }

  function renderExamples() {
    const container = $("#ocaiExamples");
    if (!container) return;
    container.innerHTML = MODES[currentMode].examples.map(([title, text]) => `<button class="ocai-example" type="button" data-ocai-example="${encodeURIComponent(text)}"><strong>${safeText(title)}</strong><span>${safeText(text)}</span></button>`).join("");
    $$('[data-ocai-example]', container).forEach(button => button.addEventListener("click", () => {
      const prompt = $("#ocaiPrompt");
      prompt.value = decodeURIComponent(button.dataset.ocaiExample || "");
      localStorage.setItem("opscontrol_ai_draft", prompt.value);
      updateCounter();
      prompt.focus();
    }));
  }

  function selectMode(mode) {
    if (!MODES[mode]) return;
    currentMode = mode;
    $$('[data-ocai-mode]').forEach(button => button.classList.toggle("active", button.dataset.ocaiMode === mode));
    const title = $("#ocaiInputTitle");
    const prompt = $("#ocaiPrompt");
    if (title) title.textContent = MODES[mode].title;
    if (prompt) prompt.placeholder = MODES[mode].placeholder;
    renderExamples();
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  function extractResult(data) {
    if (typeof data === "string") return data;
    return data?.result || data?.text || data?.output_text || data?.response || data?.message || data?.content || "";
  }

  async function generateWithAI() {
    const prompt = $("#ocaiPrompt");
    const result = $("#ocaiResult");
    const generateButton = $("#ocaiGenerate");
    const text = prompt?.value.trim() || "";
    setMessage();

    if (!text) {
      setMessage("Informe os dados antes de gerar.", "error");
      prompt?.focus();
      return;
    }
    if (!client) {
      setMessage("A configuração do Supabase não foi carregada.", "error");
      setStatus("Configuração indisponível", "offline");
      return;
    }

    const session = await getSession();
    if (!session) {
      setMessage("Sua sessão expirou. Entre novamente no OpsControl.", "error");
      setStatus("Login necessário", "offline");
      return;
    }

    generateButton.disabled = true;
    generateButton.innerHTML = '<span class="ocai-spinner"></span> Gerando...';
    result.className = "ocai-result ocai-result-loader";
    result.innerHTML = '<span class="ocai-spinner"></span><strong>Analisando informações...</strong>';
    setResultActions(false);

    try {
      const { data, error } = await client.functions.invoke("opscontrol-ai", {
        body: {
          mode: currentMode,
          input: text,
          content: text,
          prompt: text,
          source: "opscontrol-main",
          user_name: $("#userName")?.textContent || "Usuário",
          department: $("#userRole")?.textContent || ""
        }
      });
      if (error) throw new Error(error.message || "Falha ao acessar a função de IA.");

      currentResult = String(extractResult(data) || "").trim();
      if (!currentResult) throw new Error("A IA respondeu sem conteúdo.");

      result.className = "ocai-result";
      result.textContent = currentResult;
      setResultActions(true);
      setMessage("Conteúdo gerado com sucesso.", "success");
      const history = JSON.parse(localStorage.getItem("opscontrol_ai_history") || "[]");
      history.unshift({ mode: currentMode, input: text.slice(0, 500), result: currentResult.slice(0, 5000), created_at: new Date().toISOString() });
      localStorage.setItem("opscontrol_ai_history", JSON.stringify(history.slice(0, 5)));
    } catch (error) {
      currentResult = "";
      result.className = "ocai-result empty";
      result.innerHTML = '<div class="ocai-empty-icon">⚠️</div><strong>Não foi possível gerar</strong><span>Confira a mensagem abaixo e tente novamente.</span>';
      setMessage(error.message || "Falha ao acessar o Assistente IA.", "error");
    } finally {
      generateButton.disabled = false;
      generateButton.innerHTML = "<span>✨</span> Gerar com IA";
    }
  }

  function printResult() {
    if (!currentResult) return;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return setMessage("Permita pop-ups para imprimir o conteúdo.", "error");
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>OpsControl IA</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:42px;line-height:1.6}header{border-bottom:2px solid #1769e0;padding-bottom:14px;margin-bottom:24px}h1{font-size:22px;margin:0}small{color:#667085}pre{font:14px/1.65 Arial,sans-serif;white-space:pre-wrap}</style></head><body><header><h1>OpsControl IA — Assistente</h1><small>${new Date().toLocaleString("pt-BR")}</small></header><pre>${safeText(currentResult)}</pre><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  function bindAssistantEvents() {
    $$('[data-ocai-mode]').forEach(button => button.addEventListener("click", () => selectMode(button.dataset.ocaiMode)));
    const prompt = $("#ocaiPrompt");
    prompt.value = localStorage.getItem("opscontrol_ai_draft") || "";
    prompt.addEventListener("input", () => {
      updateCounter();
      localStorage.setItem("opscontrol_ai_draft", prompt.value);
    });
    prompt.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        generateWithAI();
      }
    });
    $("#ocaiGenerate")?.addEventListener("click", generateWithAI);
    $("#ocaiClear")?.addEventListener("click", () => {
      prompt.value = "";
      currentResult = "";
      localStorage.removeItem("opscontrol_ai_draft");
      updateCounter();
      setMessage();
      setResultActions(false);
      const result = $("#ocaiResult");
      result.className = "ocai-result empty";
      result.innerHTML = '<div class="ocai-empty-icon">🤖</div><strong>O resultado aparecerá aqui</strong><span>Informe os dados e clique em “Gerar com IA”.</span>';
      prompt.focus();
    });
    $("#ocaiCopy")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(currentResult);
      setMessage("Resultado copiado.", "success");
    });
    $("#ocaiWhatsApp")?.addEventListener("click", () => window.open(`https://wa.me/?text=${encodeURIComponent(currentResult)}`, "_blank", "noopener"));
    $("#ocaiEmail")?.addEventListener("click", () => { window.location.href = `mailto:?subject=${encodeURIComponent("OpsControl IA")}&body=${encodeURIComponent(currentResult)}`; });
    $("#ocaiPrint")?.addEventListener("click", printResult);
    renderExamples();
    updateCounter();
  }

  async function checkConnection() {
    if (!client) return setStatus("Configuração indisponível", "offline");
    const session = await getSession();
    setStatus(session ? "IA conectada" : "Login necessário", session ? "online" : "offline");
  }

  function renderAssistant() {
    const page = $("#page-ai-assistant");
    if (!page || rendered) return;
    page.innerHTML = assistantMarkup();
    rendered = true;
    bindAssistantEvents();
    checkConnection();
  }

  function closeMobilePanels() {
    $("#sidebar")?.classList.remove("open", "active", "is-open");
    $("#sidebarBackdrop")?.classList.remove("active", "show");
    $("#mobileMoreSheet")?.classList.add("hidden");
    $("#mobileQuickSheet")?.classList.add("hidden");
    $("#mobileSheetBackdrop")?.classList.add("hidden");
    document.body.classList.remove("sidebar-open", "mobile-sheet-open");
  }

  function openAssistant() {
    renderAssistant();
    $$(".page").forEach(page => page.classList.remove("active"));
    $("#page-ai-assistant")?.classList.add("active");
    $$(".nav-item").forEach(item => item.classList.remove("active"));
    $("[data-ai-page='assistant']")?.classList.add("active");
    $$(".mobile-nav-item").forEach(item => item.classList.remove("active"));
    const title = $("#mobilePageTitle");
    const subtitle = $("#mobilePageSubtitle");
    if (title) title.textContent = "Assistente IA";
    if (subtitle) subtitle.textContent = "Inteligência operacional";
    closeMobilePanels();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addMobileModuleShortcut() {
    const container = $("#mobileMoreModules");
    if (!container || $("[data-ai-mobile]", container)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-module-item ocai-mobile-module";
    button.dataset.aiMobile = "assistant";
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"></path></svg><span><strong>Assistente IA</strong><small>Gerar relatórios e análises</small></span>';
    button.addEventListener("click", event => { event.stopPropagation(); openAssistant(); });
    container.prepend(button);
  }

  function init() {
    const navButton = $("[data-ai-page='assistant']");
    navButton?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openAssistant(); });
    $("#aiAssistantBtn")?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openAssistant(); });

    document.addEventListener("click", event => {
      if (event.target.closest("[data-page], [data-mobile-page]") && !event.target.closest("[data-ai-page]")) {
        $("[data-ai-page='assistant']")?.classList.remove("active");
      }
    }, true);

    addMobileModuleShortcut();
    const mobileObserver = new MutationObserver(addMobileModuleShortcut);
    const mobileContainer = $("#mobileMoreModules");
    if (mobileContainer) mobileObserver.observe(mobileContainer, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
