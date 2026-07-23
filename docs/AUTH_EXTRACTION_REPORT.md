# Índice de autenticação e sessão

Relatório temporário baseado somente em linhas e nomes. Não tenta interpretar blocos JavaScript.

- Funções com nome relacionado: **31**
- Referências diretas: **27**

## Funções

- Linha `250` — `clientLogoConfig`: `function clientLogoConfig(client = "") {`
- Linha `259` — `clientLogoBadge`: `function clientLogoBadge(client = "", fallbackIcon = "calendar", extraClass = "") {`
- Linha `636` — `showLoginMessage`: `function showLoginMessage(message, kind = "error") {`
- Linha `643` — `clearLoginMessage`: `function clearLoginMessage() {`
- Linha `650` — `setLoginLoading`: `function setLoginLoading(loading, label = "Entrando...") {`
- Linha `695` — `canManageClientTickets`: `function canManageClientTickets() {`
- Linha `699` — `canDeleteClientTickets`: `function canDeleteClientTickets() {`
- Linha `1369` — `initClient`: `async function initClient(remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false") {`
- Linha `1399` — `resolveLoginEmail`: `async function resolveLoginEmail(identifier) {`
- Linha `1407` — `openPasswordRecovery`: `function openPasswordRecovery() {`
- Linha `1414` — `requestPasswordRecovery`: `async function requestPasswordRecovery() {`
- Linha `1434` — `login`: `async function login() {`
- Linha `1463` — `restoreSession`: `async function restoreSession() {`
- Linha `1986` — `logout`: `async function logout() {`
- Linha `4092` — `tankClientSuggestions`: `function tankClientSuggestions(current = "") {`
- Linha `4761` — `clientTicketDocuments`: `function clientTicketDocuments(ticketId) {`
- Linha `4765` — `clientTicketMetrics`: `function clientTicketMetrics(ticket) {`
- Linha `4776` — `filteredClientTickets`: `function filteredClientTickets() {`
- Linha `4792` — `clientTicketFilterActiveCount`: `function clientTicketFilterActiveCount() {`
- Linha `4796` — `scheduleClientTicketFilterRender`: `function scheduleClientTicketFilterRender(field) {`
- Linha `4810` — `clientTicketDocumentChip`: `function clientTicketDocumentChip(ticket, type) {`
- Linha `4819` — `clientTicketStatusTone`: `function clientTicketStatusTone(ticket) {`
- Linha `4827` — `renderClientTickets`: `function renderClientTickets() {`
- Linha `4862` — `clientTicketForm`: `function clientTicketForm(ticket = {}) {`
- Linha `4881` — `clientTicketDocumentUploadForm`: `function clientTicketDocumentUploadForm(ticket, preferredType = "") {`
- Linha `4895` — `clientTicketDocumentEditForm`: `function clientTicketDocumentEditForm(document) {`
- Linha `4907` — `clientTicketDetails`: `function clientTicketDetails(ticket) {`
- Linha `4922` — `saveClientTicket`: `async function saveClientTicket(payload, id = null, requiredTypes = []) {`
- Linha `4941` — `uploadClientTicketDocument`: `async function uploadClientTicketDocument(form) {`
- Linha `4971` — `openClientTicketDocument`: `async function openClientTicketDocument(documentId) {`
- Linha `5761` — `profilePasswordForm`: `function profilePasswordForm() {`

## Referências diretas

- Linha `7`: `const CONFIG_KEY = "opscontrol_config";`
- Linha `14`: `const APP_ENV_KEY = "opscontrol_environment";`
- Linha `15`: `const REMEMBER_LOGIN_KEY = "opscontrol_remember_login";`
- Linha `63`: `const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");`
- Linha `64`: `const environment = localStorage.getItem(APP_ENV_KEY) || CONFIG.defaultEnvironment || "production";`
- Linha `1369`: `async function initClient(remember = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false") {`
- Linha `1378`: `state.client = window.supabase.createClient(state.config.url, state.config.key, {`
- Linha `1390`: `state.client.auth.onAuthStateChange(event => {`
- Linha `1424`: `const { error } = await state.client.auth.resetPasswordForEmail(email, { redirectTo });`
- Linha `1440`: `localStorage.setItem(REMEMBER_LOGIN_KEY, String(remember));`
- Linha `1446`: `const { data, error } = await state.client.auth.signInWithPassword({ email, password });`
- Linha `1451`: `await state.client.auth.signOut();`
- Linha `1465`: `await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");`
- Linha `1466`: `const { data } = await state.client.auth.getSession();`
- Linha `1471`: `await state.client.auth.signOut();`
- Linha `1991`: `await state.client.auth.signOut();`
- Linha `2068`: `await state.client.auth.signOut();`
- Linha `6569`: `await initClient(localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false");`
- Linha `6570`: `const { error } = await state.client.auth.updateUser({ password });`
- Linha `6572`: `await state.client.auth.signOut();`
- Linha `6605`: `const { data: authData, error: authError } = await state.client.auth.signInWithPassword({`
- Linha `6611`: `const { error: passwordError } = await state.client.auth.updateUser({ password: newPassword });`
- Linha `6635`: `await state.client.auth.updateUser({ data: { avatar_url: publicUrl } });`
- Linha `6744`: `const tempClient = window.supabase.createClient(state.config.url, state.config.key, {`
- Linha `6747`: `const { data, error } = await tempClient.auth.signUp({`
- Linha `7184`: `localStorage.setItem(APP_ENV_KEY,environment);`
- Linha `8042`: `$("#rememberLogin").checked = localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";`
