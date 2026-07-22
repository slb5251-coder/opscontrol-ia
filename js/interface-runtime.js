(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || new URL("js/interface-runtime.js", document.baseURI).href;
  const scripts = [
    ["tank-cards-reference", "tank-cards-reference.js?v=20260722-mobile-tanks-1"],
    ["tank-availability-extension", "tank-availability-extension.js?v=20260722-tank-availability-1"],
    ["ops-v2", "interface-ops-v2.js?v=20260722-ops-v2-1"],
    ["tv-control-room", "tv-control-room.js?v=20260722-tv-control-room-1"],
    ["role-dashboard", "role-dashboard.js?v=20260722-role-dashboard-1"],
    ["operations-analytics", "operations-analytics.js?v=20260722-operations-analytics-1"],
    ["operation-products-extension", "operation-products-extension.js?v=20260722-operation-products-extension-1"],
    ["truck-delete-extension", "truck-delete-extension.js?v=20260722-truck-delete-1"],
    ["alert-center-v2", "alert-center-v2.js?v=20260722-alert-center-v2-1"],
    ["app-states", "app-states.js?v=20260722-app-states-1"]
  ];

  function loadScript(marker, relativePath) {
    if (document.querySelector(`script[data-${marker}="true"]`)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(relativePath, scriptUrl).href;
      script.async = false;
      script.setAttribute(`data-${marker}`, "true");
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${relativePath}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function start() {
    for (const [marker, relativePath] of scripts) {
      try {
        await loadScript(marker, relativePath);
      } catch (error) {
        console.error("[OpsControl UI]", error);
      }
    }
    document.documentElement.dataset.interfaceRuntime = "ready";
    document.dispatchEvent(new CustomEvent("opscontrol:interface-ready"));
  }

  start();
})();