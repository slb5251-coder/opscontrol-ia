(() => {
  "use strict";

  const VERSION = "20260722-mobile-tanks-1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let scheduled = false;

  function normalize(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  function cleanPrefix(value = "", prefix = "") {
    return String(value || "").replace(new RegExp(`^${prefix}\\s*:?\\s*`, "i"), "").trim();
  }

  function textStarting(card, prefix) {
    const match = $$(".compact-tank-product span", card)
      .find(element => normalize(element.textContent).startsWith(normalize(prefix)));
    return match ? cleanPrefix(match.textContent, prefix) : "-";
  }

  function phaseLabel(card) {
    const section = card.closest("[data-tank-phase-section]");
    const raw = section?.dataset?.tankPhaseSection || card.dataset.tankPhase || "";
    const match = String(raw).match(/(1|2)/);
    return match ? `Phase #${match[1]}` : (raw || "Área operacional");
  }

  function percentage(card) {
    const caption = $(".tank-progress-caption strong", card)?.textContent || "";
    const aria = $(".tank-progress", card)?.getAttribute("aria-valuenow") || "";
    const value = Number(String(caption || aria).replace(/[^\d,.-]/g, "").replace(",", "."));
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }

  function displayStatus(original, level) {
    const value = normalize(original);
    const exceptional = ["bloqueado", "manutencao", "limpeza"].some(status => value.includes(status));
    if (level > 0 && level <= 15 && !exceptional) return "Baixo volume";
    if (level >= 90 && !exceptional) return "Alto volume";
    return original || "Operacional";
  }

  function statusTone(status) {
    const value = normalize(status);
    if (value.includes("baixo volume") || value.includes("alto volume")) return "amber";
    if (value.includes("em uso")) return "green";
    if (value.includes("bloqueado") || value.includes("manutencao")) return "red";
    if (value.includes("limpeza")) return "gray";
    return "blue";
  }

  function statusStyle(tone) {
    const styles = {
      green: "color:#16874f;background:#e7f7ef",
      blue: "color:#1769ff;background:#eaf1ff",
      amber: "color:#b96200;background:#fff2df",
      gray: "color:#69778a;background:#edf1f5",
      red: "color:#c93646;background:#fdebed"
    };
    return styles[tone] || styles.blue;
  }

  function progressTone(card, product, status, level) {
    const value = normalize(`${product} ${card.dataset.tankKind || ""}`);
    if (value.includes("silo") || value.includes("barita") || value.includes("bentonita") || value.includes("calcita") || value.includes("granel")) return "amber";
    if (value.includes("sbm") || value.includes("rheliant") || value.includes("glydrill") || value.includes("oleo")) return "brown";
    if (value.includes("olefina")) return "gray";
    if (normalize(status).includes("em uso")) return "green";
    if ((level > 0 && level <= 15) || level >= 90) return "amber";
    return "blue";
  }

  function updatedLabel(dateText, updater) {
    const today = new Date().toLocaleDateString("pt-BR");
    const when = dateText && dateText.includes(today)
      ? "Atualizado hoje"
      : dateText
        ? `Atualizado ${dateText.split(",")[0]}`
        : "Atualização recente";
    return `${when} • ${updater || "Não informado"}`;
  }

  function detailField(label, value) {
    return `<div><span>${esc(label)}</span><strong title="${esc(value || "-")}">${esc(value || "-")}</strong></div>`;
  }

  function attentionLabel(status, level) {
    const value = normalize(status);
    if (value.includes("bloqueado")) return "Bloqueado";
    if (value.includes("manutencao")) return "Manutenção";
    if (level > 0 && level <= 15) return "Conferir saldo";
    if (level >= 90) return "Próximo do limite";
    return "";
  }

  function cloneQuickAction(rowActions, selector, label, primary = false) {
    const source = rowActions?.querySelector(selector);
    if (!source) return "";
    const clone = source.cloneNode(true);
    clone.className = `reference-quick-action${primary ? " primary" : ""}`;
    clone.textContent = label;
    clone.removeAttribute("style");
    return clone.outerHTML;
  }

  function ensureMobileToolbar(page) {
    if (!page || page.querySelector(".tank-mobile-toolbar")) return;
    const toolbar = document.createElement("section");
    toolbar.className = "tank-mobile-toolbar";
    toolbar.innerHTML = `
      <button type="button" class="tank-mobile-filter-toggle" data-tank-mobile-filters aria-expanded="false">
        <span>Filtros</span><b data-tank-mobile-count>Todos</b>
      </button>
      <nav aria-label="Navegação por fase">
        <button type="button" data-tank-phase-jump="Phase #1">Phase #1</button>
        <button type="button" data-tank-phase-jump="Phase #2">Phase #2</button>
      </nav>`;
    const command = page.querySelector(".tank-command-center");
    if (command) command.insertAdjacentElement("afterend", toolbar);
    else page.prepend(toolbar);
  }

  function enhanceCard(card) {
    if (!card || card.closest(".design-operation-drawer")) return;

    const title = $(".tank-top h3", card)?.textContent?.trim() || "Equipamento";
    const originalStatus = $(".tank-top .status-badge,.tank-top .badge,.tank-top [class*='badge']", card)?.textContent?.trim() || "Operacional";
    const phase = phaseLabel(card);
    const product = $(".compact-tank-product strong", card)?.textContent?.trim() || "Sem produto";
    const current = $(".tank-volume-line strong", card)?.textContent?.trim() || "0";
    const capacity = ($(".tank-volume-line span", card)?.textContent || "")
      .replace(/^capacidade operacional\s*/i, "")
      .replace(/^de\s*/i, "")
      .trim() || "-";
    const level = percentage(card);
    const status = displayStatus(originalStatus, level);
    const tone = progressTone(card, product, status, level);
    const badgeTone = statusTone(status);
    const attention = attentionLabel(status, level);
    const updater = cleanPrefix($(".tank-update-meta span:first-child", card)?.textContent || "", "Atualizado por");
    const dateText = $(".tank-update-meta span:last-child", card)?.textContent?.trim() || "";
    const client = textStarting(card, "Cliente");
    const lot = textStarting(card, "Lote");
    const density = textStarting(card, "Densidade");
    const physical = textStarting(card, "Volume físico");
    const free = $(".tank-progress-caption span", card)?.textContent?.trim() || "-";
    const signature = [VERSION, title, phase, product, current, capacity, level.toFixed(1), status, updater, dateText, client, lot, density, physical, free].join("|");

    if (card.dataset.referenceSignature === signature && $(":scope > .reference-card-view", card)) return;

    const previousDetails = $(":scope > .reference-card-details", card);
    const rowActions = $(".row-actions", previousDetails || card);
    const quickActions = [
      cloneQuickAction(rowActions, "[data-edit-tank]", "Atualizar", true),
      cloneQuickAction(rowActions, "[data-tank-history]", "Histórico")
    ].filter(Boolean).join("");

    $(":scope > .reference-card-view", card)?.remove();
    previousDetails?.remove();

    card.dataset.referenceSignature = signature;
    card.dataset.mobileAttention = attention ? "true" : "false";
    card.classList.remove("tone-green", "tone-blue", "tone-amber", "tone-brown", "tone-gray", "tone-red", "reference-needs-attention");
    card.classList.add("reference-tank-card", `tone-${tone}`);
    if (attention) card.classList.add("reference-needs-attention");

    [$(`:scope > .tank-top`, card), $(`:scope > .tank-card-body`, card), $(`:scope > .tank-update-meta`, card)]
      .filter(Boolean)
      .forEach(element => element.classList.add("reference-original-hidden"));

    const safeTitle = esc(title);
    const safePhase = esc(phase);
    const safeProduct = esc(product);
    const safeCurrent = esc(current);
    const safeCapacity = esc(capacity);
    const safeStatus = esc(status);
    const safeUpdated = esc(updatedLabel(dateText, updater));

    const view = document.createElement("section");
    view.className = "reference-card-view";
    view.innerHTML = `
      <div class="reference-card-head">
        <div class="reference-card-title">
          <h3>${safeTitle}</h3>
          <span class="reference-phase-chip">${safePhase}</span>
        </div>
        <span class="reference-status-chip tone-${badgeTone}" style="${statusStyle(badgeTone)}">${safeStatus}</span>
      </div>
      ${attention ? `<div class="reference-attention-chip">${esc(attention)}</div>` : ""}
      <div class="reference-product-block">
        <span>Produto</span>
        <strong title="${safeProduct}">${safeProduct}</strong>
      </div>
      <div class="reference-volume-row">
        <strong title="${safeCurrent} / ${safeCapacity}">${safeCurrent} / ${safeCapacity}</strong>
        <span>${Math.round(level)}%</span>
      </div>
      <div class="reference-progress" role="progressbar" aria-label="Ocupação de ${safeTitle}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(level)}">
        <span style="--reference-level:${level}%"></span>
      </div>
      ${quickActions ? `<div class="reference-mobile-quick-actions">${quickActions}</div>` : ""}
      <div class="reference-card-foot">
        <span class="reference-update-label">${safeUpdated}</span>
        <button type="button" class="reference-details-toggle" data-reference-tank-details aria-expanded="false">Ver detalhes</button>
      </div>`;

    const details = document.createElement("section");
    details.className = "reference-card-details";
    details.innerHTML = `
      <div class="reference-detail-grid">
        ${detailField("Cliente", client)}
        ${detailField("Lote", lot)}
        ${detailField("Densidade", density)}
        ${detailField("Volume livre", free)}
        ${physical && physical !== "-" ? detailField("Volume físico", physical) : ""}
        ${detailField("Última atualização", dateText || "-")}
      </div>`;
    if (rowActions) details.appendChild(rowActions);

    card.prepend(view);
    card.appendChild(details);
  }

  function updateToolbarCount(page) {
    const result = page.querySelector("[data-tank-filter-result]")?.textContent || "";
    const number = result.match(/\d+/)?.[0] || "Todos";
    const target = page.querySelector("[data-tank-mobile-count]");
    if (target) target.textContent = number;
  }

  function run() {
    scheduled = false;
    const page = $("#page-tanks");
    if (!page) return;
    ensureMobileToolbar(page);
    $$(".tank-card", page).forEach(enhanceCard);
    updateToolbarCount(page);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  function start() {
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", event => {
      const detailsButton = event.target.closest("[data-reference-tank-details]");
      if (detailsButton) {
        const card = detailsButton.closest(".reference-tank-card");
        if (!card) return;
        const open = !card.classList.contains("reference-details-open");
        card.classList.toggle("reference-details-open", open);
        detailsButton.setAttribute("aria-expanded", String(open));
        detailsButton.textContent = open ? "Ocultar detalhes" : "Ver detalhes";
        return;
      }

      const filterButton = event.target.closest("[data-tank-mobile-filters]");
      if (filterButton) {
        const page = filterButton.closest("#page-tanks");
        const open = !page?.classList.contains("mobile-tank-filters-open");
        page?.classList.toggle("mobile-tank-filters-open", open);
        filterButton.setAttribute("aria-expanded", String(open));
        return;
      }

      const phaseButton = event.target.closest("[data-tank-phase-jump]");
      if (phaseButton) {
        const page = phaseButton.closest("#page-tanks");
        const phase = phaseButton.dataset.tankPhaseJump;
        const section = $$("[data-tank-phase-section]", page).find(item => item.dataset.tankPhaseSection === phase);
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.addEventListener("input", event => {
      if (event.target.matches("#page-tanks [data-tank-filter]")) requestAnimationFrame(schedule);
    });
    document.addEventListener("change", event => {
      if (event.target.matches("#page-tanks [data-tank-filter]")) requestAnimationFrame(schedule);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();