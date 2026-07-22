(() => {
  "use strict";

  const ENV_KEY = "opscontrol_environment";
  const params = new URLSearchParams(window.location.search);
  const requestedEnvironment = params.get("env");
  const validEnvironments = new Set(["production", "staging"]);

  if (requestedEnvironment && validEnvironments.has(requestedEnvironment)) {
    localStorage.setItem(ENV_KEY, requestedEnvironment);
  }

  const activeEnvironment = validEnvironments.has(requestedEnvironment)
    ? requestedEnvironment
    : (localStorage.getItem(ENV_KEY) || "production");

  window.OPSCONTROL_CONFIG = {
    supabaseUrl: "https://bcnzdujfumswhpduxkfy.supabase.co",
    supabaseKey: "sb_publishable_9W86QOsVT2hk7E57wjuXgw_zs7fPxS2",
    defaultEnvironment: activeEnvironment,
    environments: {
      production: {
        label: "Produção",
        supabaseUrl: "https://bcnzdujfumswhpduxkfy.supabase.co",
        supabaseKey: "sb_publishable_9W86QOsVT2hk7E57wjuXgw_zs7fPxS2"
      },
      staging: {
        label: "Homologação",
        supabaseUrl: "",
        supabaseKey: ""
      }
    },
    appName: "OpsControl IA Pro",
    plantName: "B-Port LMP"
  };

  window.OPSCONTROL_ACTIVE_ENVIRONMENT = activeEnvironment;

  if (activeEnvironment !== "staging") return;

  document.documentElement.dataset.opsEnvironment = "staging";
  document.title = `[HOMOLOGAÇÃO] ${document.title}`;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "homologation.css?v=20260722-staging-guard-1";
  document.head.appendChild(stylesheet);

  function returnToProduction() {
    localStorage.setItem(ENV_KEY, "production");
    const url = new URL(window.location.href);
    url.searchParams.delete("env");
    window.location.replace(url.toString());
  }

  function mountEnvironmentGuard() {
    if (document.getElementById("homologationBanner")) return;

    const staging = window.OPSCONTROL_CONFIG.environments.staging;
    const configured = Boolean(staging.supabaseUrl && staging.supabaseKey);

    const banner = document.createElement("aside");
    banner.id = "homologationBanner";
    banner.className = "homologation-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = `
      <div>
        <strong>AMBIENTE DE HOMOLOGAÇÃO</strong>
        <span>${configured ? "Dados separados da produção" : "Banco de homologação ainda não configurado"}</span>
      </div>
      <button type="button" data-return-production>Voltar para produção</button>`;
    document.body.prepend(banner);

    banner.querySelector("[data-return-production]")?.addEventListener("click", returnToProduction);

    if (configured) return;

    document.querySelectorAll("#loginForm input, #loginForm button").forEach(control => {
      control.disabled = true;
    });

    const blocker = document.createElement("section");
    blocker.className = "staging-config-blocker";
    blocker.setAttribute("role", "alert");
    blocker.innerHTML = `
      <div>
        <span>HOMOLOGAÇÃO BLOQUEADA</span>
        <h1>Banco separado ainda não configurado</h1>
        <p>O acesso foi bloqueado para impedir que testes utilizem os dados de produção por engano.</p>
        <button type="button" data-return-production>Voltar para produção</button>
      </div>`;
    document.body.appendChild(blocker);
    blocker.querySelector("[data-return-production]")?.addEventListener("click", returnToProduction);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountEnvironmentGuard, { once: true });
  } else {
    mountEnvironmentGuard();
  }
})();