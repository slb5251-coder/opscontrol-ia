(() => {
  "use strict";

  const CONFIG = window.OPSCONTROL_CONFIG || {};
  const url = CONFIG.supabaseUrl || CONFIG.environments?.production?.supabaseUrl;
  const key = CONFIG.supabaseKey || CONFIG.environments?.production?.supabaseKey;
  const client = url && key && window.supabase ? window.supabase.createClient(url, key) : null;

  const $ = (s) => document.querySelector(s);
  const modes = {
    handover: {
      title: "Dados da passagem de turno",
      placeholder: "Cole aqui as atividades realizadas, pendências e observações...",
      examples: [
        ["Passagem logística", "Recebimento de 3 carretas, atualização da RFF e pendências do turno."],
        ["Passagem operacional", "Bombeio de barita, fabricação de brine e condição dos tanques."],
        ["Turno com ocorrências", "Inclua paralisações, falhas, riscos e ações executadas."]
      ]
    },
    report: {
      title: "Dados do relatório operacional",
      placeholder: "Informe cliente, embarcação, produto, volumes, horários, vazões e ocorrências...",
      examples: [
        ["Relatório de bombeio", "PRIO • Barita 60 t • início 10:30 • término 13:40."],
        ["Relatório de fabricação", "Brine 2.500 bbl • densidade 10,2 ppg • tanques utilizados."],
        ["Resumo diário", "Liste todas as atividades realizadas no dia."]
      ]
    },
    alert: {
      title: "Descrição do alerta",
      placeholder: "Descreva a condição, equipamento, local, impacto observado e ações já tomadas...",
      examples: [
        ["Motor aquecendo", "Motor B03 com temperatura elevada durante a operação."],
        ["Vazamento", "Vazamento observado na linha de recalque do TK-05."],
        ["Risco operacional", "Mangueira apresentando desgaste próximo à conexão."]
      ]
    },
    assistant: {
      title: "Pergunta ou solicitação",
      placeholder: "Faça uma pergunta ou peça um texto, DDS, e-mail, inventário ou análise...",
      examples: [
        ["Gerar DDS", "Faça um DDS sobre movimentação segura de cargas."],
        ["Redigir e-mail", "Crie um e-mail informando o recebimento de três carretas."],
        ["Organizar inventário", "Formate este inventário para envio no WhatsApp."]
      ]
    }
  };

  let currentMode = "handover";
  let currentResult = "";

  const prompt = $("#aiPrompt");
  const result = $("#aiResult");
  const generate = $("#aiGenerate");
  const message = $("#aiMessage");
  const copy = $("#aiCopy");
  const whatsapp = $("#aiWhatsApp");
  const email = $("#aiEmail");
  const print = $("#aiPrint");

  function setMessage(text = "", type = "") {
    message.textContent = text;
    message.className = text ? `ai-message ${type}` : "ai-message hidden";
  }

  function setConnection(text, state) {
    const badge = $("#aiConnection");
    badge.textContent = text;
    badge.className = `ai-status ${state || ""}`;
  }

  function renderExamples() {
    $("#aiExamples").innerHTML = modes[currentMode].examples.map(([title, text]) =>
      `<button class="ai-example" data-example="${encodeURIComponent(text)}"><strong>${title}</strong><span>${text}</span></button>`
    ).join("");
    document.querySelectorAll(".ai-example").forEach(btn => btn.addEventListener("click", () => {
      prompt.value = decodeURIComponent(btn.dataset.example);
      updateCounter();
      prompt.focus();
    }));
  }

  function selectMode(mode) {
    currentMode = mode;
    document.querySelectorAll(".ai-mode").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    $("#aiInputTitle").textContent = modes[mode].title;
    prompt.placeholder = modes[mode].placeholder;
    renderExamples();
  }

  function updateCounter() {
    $("#aiCounter").textContent = `${prompt.value.length.toLocaleString("pt-BR")} / 30.000`;
  }

  function enableResultActions(enabled) {
    [copy, whatsapp, email, print].forEach(btn => btn.disabled = !enabled);
  }

  function extractText(data) {
    if (typeof data === "string") return data;
    return data?.result || data?.text || data?.output_text || data?.response || data?.message || "";
  }

  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  async function runAI() {
    const text = prompt.value.trim();
    setMessage();
    if (!text) {
      setMessage("Informe os dados antes de gerar.", "error");
      prompt.focus();
      return;
    }
    if (!client) {
      setMessage("A configuração do Supabase não foi carregada.", "error");
      return;
    }

    const session = await getSession();
    if (!session) {
      setMessage("Sua sessão expirou. Entre novamente no sistema e abra o Assistente IA.", "error");
      setConnection("Login necessário", "offline");
      return;
    }

    generate.disabled = true;
    generate.innerHTML = '<span class="ai-spinner"></span> Gerando...';
    result.className = "ai-result ai-loading";
    result.innerHTML = '<span class="ai-spinner"></span><strong>Analisando informações...</strong>';
    enableResultActions(false);

    try {
      const response = await fetch(`${url}/functions/v1/opscontrol-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": key
        },
        body: JSON.stringify({ mode: currentMode, input: text, content: text, prompt: text })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || data?.message || `Erro ${response.status}`);

      currentResult = extractText(data);
      if (!currentResult) throw new Error("A função respondeu sem conteúdo.");

      result.className = "ai-result";
      result.textContent = currentResult;
      enableResultActions(true);
      setMessage("Conteúdo gerado com sucesso.", "success");
    } catch (error) {
      currentResult = "";
      result.className = "ai-result ai-empty";
      result.innerHTML = '<div class="ai-empty-icon">⚠️</div><strong>Não foi possível gerar</strong><span>Verifique a mensagem apresentada e tente novamente.</span>';
      setMessage(error.message || "Falha ao acessar o Assistente IA.", "error");
    } finally {
      generate.disabled = false;
      generate.innerHTML = "<span>✨</span> Gerar com IA";
    }
  }

  document.querySelectorAll(".ai-mode").forEach(btn => btn.addEventListener("click", () => selectMode(btn.dataset.mode)));
  prompt.addEventListener("input", updateCounter);
  $("#aiClear").addEventListener("click", () => {
    prompt.value = "";
    currentResult = "";
    updateCounter();
    enableResultActions(false);
    result.className = "ai-result ai-empty";
    result.innerHTML = '<div class="ai-empty-icon">🤖</div><strong>O resultado aparecerá aqui</strong><span>Selecione um modo, informe os dados e clique em “Gerar com IA”.</span>';
    setMessage();
  });
  generate.addEventListener("click", runAI);

  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(currentResult);
    setMessage("Resultado copiado.", "success");
  });
  whatsapp.addEventListener("click", () => window.open(`https://wa.me/?text=${encodeURIComponent(currentResult)}`, "_blank", "noopener"));
  email.addEventListener("click", () => window.location.href = `mailto:?subject=${encodeURIComponent("OpsControl IA")}&body=${encodeURIComponent(currentResult)}`);
  print.addEventListener("click", () => window.print());

  (async () => {
    renderExamples();
    updateCounter();
    if (!client) return setConnection("Sem configuração", "offline");
    const session = await getSession();
    setConnection(session ? "IA conectada" : "Login necessário", session ? "online" : "offline");
  })();
})();