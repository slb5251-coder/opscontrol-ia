window.OPSCONTROL_CONFIG = {
  supabaseUrl: "https://bcnzdujfumswhpduxkfy.supabase.co",
  supabaseKey: "sb_publishable_9W86QOsVT2hk7E57wjuXgw_zs7fPxS2",
  defaultEnvironment: "production",
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

/* Carrega apenas os ajustes visuais conservadores da versão manual atual. */
(() => {
  const href = "ajustes-finos.css?v=20260721-polimento-2";
  if (document.querySelector('link[data-opscontrol-fine-tuning]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.opscontrolFineTuning = "true";
  document.head.appendChild(link);
})();
