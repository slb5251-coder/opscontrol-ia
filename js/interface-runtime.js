(() => {
  "use strict";

  const VERSION = "20260722-deferred-dependencies-1";
  const scriptUrl = document.currentScript?.src || new URL("js/interface-runtime.js", document.baseURI).href;
  const loading = new Map();
  const status = new Map();
  const pageModules = {
    dashboard: ["role-dashboard"],
    tanks: ["tank-cards-reference"],
    operations: ["operations-analytics"],
    tv: ["tv-control-room"],
    alerts: ["alert-center-v2"],
    "ai-assistant": ["ai-assistant"]
  };
  const modules = {
    observability: {
      script: "system-observability.js?v=20260722-observability-1"
    },
    "ops-v2": {
      script: "interface-ops-v2.js?v=20260722-ops-v2-1"
    },
    "app-states": {
      script: "app-states.js?v=20260722-app-states-1"
    },
    "role-dashboard": {
      script: "role-dashboard.js?v=20260722-role-dashboard-1",
      styles: ["../role-dashboard.css?v=20260722-role-dashboard-1"]
    },
    "tank-cards-reference": {
      script: "tank-cards-reference.js?v=20260722-mobile-tanks-1",
      styles: [
        "../tank-cards-reference.css?v=20260722-mobile-tanks-1",
        "../mobile-tank-experience.css?v=20260722-mobile-tanks-1"
      ]
    },
    "operations-analytics": {
      script: "operations-analytics.js?v=20260722-operations-analytics-1",
      styles: ["../operations-analytics.css?v=20260722-operations-analytics-1"]
    },
    "tv-control-room": {
      script: "tv-control-room.js?v=20260722-tv-control-room-1",
      styles: ["../tv-control-room.css?v=20260722-tv-control-room-1"]
    },
    "alert-center-v2": {
      script: "alert-center-v2.js?v=20260722-alert-center-v2-1",
      styles: ["../alert-center-v2.css?v=20260722-alert-center-v2-1"]
    },
    "ai-assistant": {
      script: "assistente-integrado.js?v=20260722-deferred-dependencies-1",
      styles: ["../assistente-integrado.css?v=20260722-deferred-dependencies-1"]
    },
    leaflet: {
      script: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      styles: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"]
    }
  };

  function assetUrl(relativePath) {
    return new URL(relativePath, scriptUrl).href;
  }

  function loadStyle(moduleName, relativePath) {
    const href = assetUrl(relativePath);
    const linked = [...document.querySelectorAll(`link[data-ops-module-style="${moduleName}"]`)]
      .some(link => link.href === href);
    const applied = [...document.styleSheets].some(sheet => sheet.href === href);
    if (linked || applied) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.opsModuleStyle = moduleName;
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", () => reject(new Error(`Falha ao carregar ${relativePath}`)), { once: true });
      document.head.appendChild(link);
    });
  }

  function loadScript(moduleName, relativePath) {
    const src = assetUrl(relativePath);
    const existing = [...document.querySelectorAll(`script[data-ops-module="${moduleName}"]`)]
      .find(script => script.src === src);
    if (existing?.dataset.loaded === "true") return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.opsModule = moduleName;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${relativePath}`)), { once: true });
      if (!existing) document.head.appendChild(script);
    });
  }

  function loadModule(moduleName) {
    if (status.get(moduleName) === "ready") return Promise.resolve();
    if (loading.has(moduleName)) return loading.get(moduleName);
    const definition = modules[moduleName];
    if (!definition) return Promise.reject(new Error(`Módulo desconhecido: ${moduleName}`));

    status.set(moduleName, "loading");
    const promise = Promise.all((definition.styles || []).map(path => loadStyle(moduleName, path)))
      .then(() => loadScript(moduleName, definition.script))
      .then(() => {
        status.set(moduleName, "ready");
        loading.delete(moduleName);
        document.documentElement.dataset.lastInterfaceModule = moduleName;
        document.dispatchEvent(new CustomEvent("opscontrol:module-ready", { detail: { module: moduleName } }));
      })
      .catch(error => {
        loading.delete(moduleName);
        status.set(moduleName, "error");
        document.documentElement.dataset.interfaceModuleError = moduleName;
        document.dispatchEvent(new CustomEvent("opscontrol:module-error", { detail: { module: moduleName, error } }));
        console.error("[OpsControl Modules]", error);
        throw error;
      });

    loading.set(moduleName, promise);
    return promise;
  }

  async function loadModules(moduleNames) {
    for (const moduleName of moduleNames) {
      try {
        await loadModule(moduleName);
      } catch {
        // Os demais módulos continuam carregando mesmo quando um módulo opcional falha.
      }
    }
  }

  function appIsVisible() {
    const app = document.querySelector("#appView");
    return Boolean(app && !app.classList.contains("hidden"));
  }

  function activePage() {
    if (!appIsVisible()) return "";
    const active = document.querySelector(".page.active[id^='page-']");
    if (active) return active.id.replace(/^page-/, "");
    return document.querySelector(".nav-item.active[data-page]")?.dataset.page || "dashboard";
  }

  async function loadForPage(pageName = activePage()) {
    if (!pageName) return;
    document.documentElement.dataset.interfacePage = pageName;
    await loadModules(pageModules[pageName] || []);
  }

  let pageSyncScheduled = false;
  function schedulePageSync() {
    if (pageSyncScheduled) return;
    pageSyncScheduled = true;
    requestAnimationFrame(() => {
      pageSyncScheduled = false;
      loadForPage();
      if (document.querySelector('#genericForm[data-kind="alert"]')) loadModule("alert-center-v2").catch(() => {});
      if (document.querySelector("#vesselAisMap")) loadModule("leaflet").catch(() => {});
    });
  }

  function observeNavigation() {
    const root = document.querySelector("#appView") || document.body;
    const observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        if (mutation.type === "attributes") {
          return mutation.target.matches?.("#appView,.page,.nav-item");
        }
        return [...mutation.addedNodes].some(node => node.nodeType === 1 && (
          node.matches?.('#genericForm[data-kind="alert"],#vesselAisMap,.page')
          || node.querySelector?.('#genericForm[data-kind="alert"],#vesselAisMap,.page')
        ));
      });
      if (relevant) schedulePageSync();
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    document.addEventListener("click", event => {
      const target = event.target.closest?.("[data-page],[data-mobile-page]");
      if (target) requestAnimationFrame(schedulePageSync);
    });
    document.addEventListener("opscontrol:page-change", schedulePageSync);
  }

  async function start() {
    document.documentElement.dataset.interfaceLoader = VERSION;
    await loadModules(["observability", "ops-v2", "app-states"]);
    document.documentElement.dataset.interfaceRuntime = "ready";
    document.dispatchEvent(new CustomEvent("opscontrol:interface-ready"));
    observeNavigation();
    schedulePageSync();
  }

  window.OpsControlModules = Object.freeze({
    version: VERSION,
    load: loadModule,
    loadForPage,
    loaded: moduleName => status.get(moduleName) === "ready",
    status: moduleName => status.get(moduleName) || "idle",
    pageModules: Object.freeze({ ...pageModules })
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();