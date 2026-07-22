# Ambiente de homologação do OPSControl IA

## Identificação

- Branch do código: `homologacao`
- Pull request: `#13`
- Projeto Supabase: `opscontrol-ia-homologacao`
- Região: São Paulo (`sa-east-1`)
- Project ref: `idnbbesxdoeeiupwltxk`
- Acesso do frontend: `?env=staging`
- Produção permanece em `bcnzdujfumswhpduxkfy`

## Isolamento

O ambiente de homologação possui autenticação, banco, Storage e Realtime próprios. Nenhum registro operacional da produção foi copiado.

O frontend bloqueia o acesso quando:

- a URL ou a chave de staging estiver ausente;
- a URL de staging for igual à de produção;
- a chave de staging for igual à de produção.

A tela apresenta uma faixa permanente indicando **AMBIENTE DE HOMOLOGAÇÃO**.

## Estado do esquema

O esquema foi reconstruído até o ponto da versão restaurada em 22/07/2026. A validação final encontrou:

- 49 tabelas públicas;
- 12 views públicas;
- 159 políticas RLS/Storage;
- 39 tabelas publicadas no Realtime;
- 46 tanques e silos estruturais;
- 8 produtos iniciais em Fluidos e Granéis;
- 10 RPCs críticos presentes;
- zero permissão anônima nos RPCs críticos verificados.

## Exclusões intencionais

Não foram incluídas funcionalidades criadas depois do ponto restaurado:

- operações multi-produto posteriores;
- disponibilidade e reserva avançada de tanques;
- novo fluxo por etapas de carretas;
- exclusão segura de carretas criada posteriormente.

Essas estruturas continuam fora do frontend restaurado e não devem ser reintroduzidas sem uma entrega própria.

## Dados e autenticação

A homologação começa sem registros operacionais. Somente a estrutura fixa de tanques, silos, permissões e catálogos mínimos foi criada.

O primeiro usuário criado recebe o papel `admin` pelo gatilho de inicialização. Usuários seguintes recebem o papel padrão e devem ser ajustados por um administrador.

A criação automática do primeiro usuário não foi realizada porque o ambiente bloqueou a chamada externa à API administrativa. Uma Edge Function temporária chegou a ser preparada, mas foi neutralizada e passou a exigir JWT antes de qualquer uso. A extensão temporária `pg_net` também foi removida.

O usuário inicial deve ser criado pelo painel do Supabase em **Authentication > Users > Add user**. Não inserir registros diretamente em `auth.users`.

## Limitações conhecidas

A regra atual de `tanks.client` ainda restringe o cliente a:

- Petrobras;
- PRIO;
- Equinor;
- Interno;
- A definir.

Apesar de uma função posterior aceitar texto livre, a constraint do banco ainda impede outros clientes. Isso é uma inconsistência herdada da produção e deve ser corrigida em uma migration separada, com teste de compatibilidade.

Também existem avisos de desempenho herdados da produção, principalmente índices duplicados e políticas RLS redundantes. Eles não bloqueiam a homologação, mas não devem ser ignorados em uma etapa de otimização.

## Critério para promover à produção

Antes de retirar o PR do modo rascunho:

1. criar e confirmar um usuário administrador de teste;
2. validar login e recuperação de senha;
3. testar um fluxo de tanque, operação, carreta, alerta e passagem de turno;
4. conferir desktop, celular e Painel TV;
5. confirmar os checks do GitHub Actions;
6. registrar o ponto de rollback da `main`.
