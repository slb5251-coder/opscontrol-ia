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

  function numberFromText(value) {
    const normalized = String(value || "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function capacityLevel(card) {
    const text = card.textContent || "";
    const percent = text.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
    if (percent) return Math.max(0, Math.min(100, Number(percent[1].replace(",", "."))));

    const progress = [
      ...$$('.progress > span,.storage-progress > span,.tank-progress > span,[role="progressbar"]', card)
    ].find(element => !element.closest(".design-industrial-vessel,.design-capacity-only"));

    if (progress) {
      const width = progress.style?.width || progress.getAttribute("aria-valuenow") || progress.getAttribute("data-value");
      const value = Number(String(width || "").replace("%", ""));
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    }

    const ratio = text.match(/([\d.,]+)\s*(?:bbl|ton|t|m³|m3)?\s*(?:\/|de)\s*([\d.,]+)\s*(?:bbl|ton|t|m³|m3)?/i);
    if (ratio) {
      const current = numberFromText(ratio[1]);
      const capacity = numberFromText(ratio[2]);
      if (current !== null && capacity) return Math.max(0, Math.min(100, current / capacity * 100));
    }

    return 0;
  }

  function capacityTone(text) {
    const value = normalize(text);
    if (value.includes("brine") || value.includes("salmoura")) return "brine";
    if (value.includes("sbm") || value.includes("oleo") || value.includes("rheliant") || value.includes("glydrill")) return "sbm";
    if (value.includes("olefina")) return "olefin";
    if (value.includes("barita") || value.includes("bentonita") || value.includes("calcita") || value.includes("granel") || value.includes("silo")) return "bulk";
    return "wbm";
  }

  function capacityStatus(level) {
    if (level >= 90) return { tone: "critical", label: "Capacidade crítica" };
    if (level >= 75) return { tone: "attention", label: "Atenção ao volume" };
    if (level <= 10) return { tone: "low", label: "Baixo volume" };
    return { tone: "normal", label: "Faixa operacional" };
  }

  function volumeSummary(card) {
    const text = card.textContent || "";
    const ratio = text.match(/([\d.,]+\s*(?:bbl|ton|t|m³|m3)?)\s*(?:\/|de)\s*([\d.,]+\s*(?:bbl|ton|t|m³|m3)?)/i);
    return ratio ? `${ratio[1].trim()} de ${ratio[2].trim()}` : "Capacidade do equipamento";
  }

  function candidateCards(page) {
    let cards = $$(".tank-card,.storage-stat,[data-tank-id],[data-silo-id]", page);
    if (cards.length) return cards;

    return $$(".card", page).filter(card => {
      const heading = normalize($("h2,h3,strong", card)?.textContent || "");
      return /^(tk[-\s]|silo|mix[-\s]|tanque)/i.test(heading);
    });
  }

  function hideOriginalProgress(card) {
    $$(".progress,.storage-progress,.tank-progress", card).forEach(progress => {
      if (!progress.closest(".design-capacity-only,.design-industrial-vessel")) {
        progress.classList.add("design-capacity-original-progress");
      }
    });
  }

  function insertCapacityBar(card, bar) {
    const anchor = $(":scope > .tank-top,:scope > .storage-head,:scope > header", card);
    if (anchor) anchor.insertAdjacentElement("afterend", bar);
    else card.prepend(bar);
  }

  function enhanceCard(card) {
    if (card.closest(".design-operation-drawer")) return;

    $$(":scope > .design-industrial-vessel", card).forEach(element => element.remove());
    card.classList.add("design-capacity-card");
    hideOriginalProgress(card);

    const level = capacityLevel(card);
    const tone = capacityTone(card.textContent || "");
    const status = capacityStatus(level);
    const summary = volumeSummary(card);
    const signature = `${Math.round(level)}:${tone}:${status.tone}:${summary}`;

    let bar = $(":scope > .design-capacity-only", card);
    if (!bar) {
      bar = document.createElement("section");
      bar.className = "design-capacity-only";
      insertCapacityBar(card, bar);
    }

    if (bar.dataset.signature === signature) return;
    bar.dataset.signature = signature;
    bar.className = `design-capacity-only tone-${tone} status-${status.tone}`;
    bar.style.setProperty("--capacity-level", `${level}%`);
    bar.innerHTML = `
      <div class="design-capacity-head">
        <span>Capacidade ocupada</span>
        <strong>${Math.round(level)}%</strong>
      </div>
      <div class="design-capacity-track" role="progressbar" aria-label="Capacidade ocupada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(level)}">
        <span class="design-capacity-fill"></span>
      </div>
      <div class="design-capacity-foot">
        <span>${summary}</span>
        <span>${status.label}</span>
      </div>
    `;
  }

  function removeTankDrawings() {
    $$(".design-industrial-vessel,.login-scene-tank,.login-scene-silo").forEach(element => element.remove());
  }

  function run() {
    scheduled = false;
    removeTankDrawings();
    const page = $("#page-tanks");
    if (!page) return;
    candidateCards(page).forEach(enhanceCard);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }

  function start() {
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
