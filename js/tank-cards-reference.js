(() => {
  "use strict";

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
    if (level <= 15 && !exceptional) return "Baixo volume";
    return original || "Operacional";
  }

  function statusTone(status) {
    const value = normalize(status);
    if (value.includes("baixo volume")) return "amber";
    if (value.includes("em uso")) return "green";
    if (value.includes("bloqueado") || value.includes("manutencao")) return "red";
    if (value.includes("limpeza")) return "gray";
    return "blue";
  }

  function progressTone(card, product, status, level) {
    const value = normalize(`${product} ${card.dataset.tankKind || ""}`);
    if (value.includes("silo") || value.includes("barita") || value.includes("bentonita") || value.includes("calcita") || value.includes("granel")) return "amber";
    if (value.includes("sbm") || value.includes("rheliant") || value.includes("glydrill") || value.includes("oleo")) return "brown";
    if (value.includes("olefina")) return "gray";
    if (normalize(status).includes("em uso")) return "green";
    if (level <= 15) return "amber";
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
    return `<div><span>${label}</span><strong>${value || "-"}</strong></div>`;
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
    const updater = cleanPrefix($(".tank-update-meta span:first-child", card)?.textContent || "", "Atualizado por");
    const dateText = $(".tank-update-meta span:last-child", card)?.textContent?.trim() || "";
    const client = textStarting(card, "Cliente");
    const lot = textStarting(card, "Lote");
    const density = textStarting(card, "Densidade");
    const physical = textStarting(card, "Volume físico");
    const free = $(".tank-progress-caption span", card)?.textContent?.trim() || "-";
    const signature = [title, phase, product, current, capacity, level.toFixed(1), status, updater, dateText, client, lot, density, physical, free].join("|");

    if (card.dataset.referenceSignature === signature && $(":scope > .reference-card-view", card)) return;

    const previousDetails = $(":scope > .reference-card-details", card);
    const rowActions = $(".row-actions", previousDetails || card);
    $(":scope > .reference-card-view", card)?.remove();
    previousDetails?.remove();

    card.dataset.referenceSignature = signature;
    card.classList.remove("tone-green", "tone-blue", "tone-amber", "tone-brown", "tone-gray", "tone-red");
    card.classList.add("reference-tank-card", `tone-${tone}`);

    [$(":scope > .tank-top", card), $(":scope > .tank-card-body", card), $(":scope > .tank-update-meta", card)]
      .filter(Boolean)
      .forEach(element => element.classList.add("reference-original-hidden"));

    const view = document.createElement("section");
    view.className = "reference-card-view";
    view.innerHTML = `
      <div class="reference-card-head">
        <div class="reference-card-title">
          <h3>${title}</h3>
          <span class="reference-phase-chip">${phase}</span>
        </div>
        <span class="reference-status-chip tone-${badgeTone}">${status}</span>
      </div>
      <div class="reference-product-block">
        <span>Produto</span>
        <strong title="${product}">${product}</strong>
      </div>
      <div class="reference-volume-row">
        <strong title="${current} / ${capacity}">${current} / ${capacity}</strong>
        <span>${Math.round(level)}%</span>
      </div>
      <div class="reference-progress" role="progressbar" aria-label="Ocupação de ${title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(level)}">
        <span style="--reference-level:${level}%"></span>
      </div>
      <div class="reference-card-foot">
        <span class="reference-update-label">${updatedLabel(dateText, updater)}</span>
        <button type="button" class="reference-details-toggle" data-reference-tank-details aria-expanded="false">Ver detalhes</button>
      </div>
    `;

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
      </div>
    `;
    if (rowActions) details.appendChild(rowActions);

    card.prepend(view);
    card.appendChild(details);
  }

  function run() {
    scheduled = false;
    const page = $("#page-tanks");
    if (!page) return;
    $$(".tank-card", page).forEach(enhanceCard);
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
      const button = event.target.closest("[data-reference-tank-details]");
      if (!button) return;
      const card = button.closest(".reference-tank-card");
      if (!card) return;
      const open = !card.classList.contains("reference-details-open");
      card.classList.toggle("reference-details-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Ocultar detalhes" : "Ver detalhes";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
