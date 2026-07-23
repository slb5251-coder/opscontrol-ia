# OPSControl IA Next

Nova interface criada do zero e isolada do sistema atual. O desenvolvimento ocorre na branch `feat/opscontrol-next-zero`, mantendo a versão original ativa até a homologação e publicação final.

## Stack

React, TypeScript, Vite, Headless UI, Motion, Lucide e Supabase.

## Execução local

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e informe somente as credenciais públicas do Supabase. Não publique chaves privadas ou credenciais de serviço.

## Estado atual da homologação

Validado pelo GitHub Actions:

- build e verificação TypeScript;
- validação estrutural do OPSControl IA;
- testes de interface responsiva;
- smoke test da publicação em GitHub Pages;
- E2E autenticado no ambiente de staging.

## Funcionalidades implementadas

- autenticação e sessão Supabase;
- dashboard operacional responsivo;
- painel TV;
- tanques e silos com histórico;
- operações;
- programação de embarcações;
- fluxo de carretas;
- ordens de manutenção;
- registros QHSE;
- auditoria;
- permissões por perfil;
- atualização em tempo real;
- proteção contra perda de eventos durante formulários e sincronizações;
- sincronização ao retornar para a aba ou recuperar a conexão;
- recuperação de falhas de interface sem alterar dados.

## Checklist antes da publicação

- [x] Aplicação desenvolvida separadamente da versão atual.
- [x] Banco existente preservado.
- [x] Build de produção validado.
- [x] Responsividade validada.
- [x] Smoke test de produção validado.
- [x] E2E autenticado validado.
- [x] Realtime com fila e proteção contra eventos duplicados.
- [x] Tratamento de perda e retorno de conexão.
- [ ] Remover o remount global causado por `<App key={version} />` e atualizar os dados diretamente no Dashboard.
- [ ] Revisão final do PR.
- [ ] Retirar o PR do modo Draft.
- [ ] Merge na `main` somente após autorização explícita.
- [ ] Validar a publicação final sem desligar prematuramente a versão anterior.

## Regra de publicação

A nova interface não deve substituir a versão atual até que o checklist esteja concluído e a publicação na `main` seja autorizada. Após o merge, a versão original deve permanecer disponível durante a validação final da nova interface.
