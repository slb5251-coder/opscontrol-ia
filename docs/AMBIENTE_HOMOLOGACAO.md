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

O primeiro usuário foi criado e confirmado em 22/07/2026. O gatilho de inicialização criou corretamente o perfil ativo com papel `admin`.

Ainda não existe registro de primeiro login (`last_sign_in_at` está vazio). Portanto, autenticação pela interface e recuperação de senha continuam pendentes de validação manual.

A criação automática do primeiro usuário não foi realizada porque o ambiente bloqueou a chamada externa à API administrativa. Uma Edge Function temporária chegou a ser preparada, mas foi neutralizada e passou a exigir JWT antes de qualquer uso. A extensão temporária `pg_net` também foi removida.

Usuários devem ser criados pela API administrativa ou pelo painel do Supabase. Não inserir registros diretamente em `auth.users`.

## Smoke tests autenticados

Os testes abaixo foram executados com o contexto do usuário administrador e dentro de transações revertidas:

- recebimento de 200 bbl de Brine no TK-01;
- operação de bombeio concluída com baixa automática de 100 bbl;
- confirmação de saldo final temporário de 100 bbl no TK-01;
- carreta Tank concluída com entrada automática de 50 bbl no TK-02;
- confirmação de `stock_applied=true` na carreta;
- alerta marcado como lido, atribuído e resolvido;
- passagem de turno entregue e aprovada.

Depois dos testes, o rollback foi confirmado:

- zero operações;
- zero carretas;
- zero alertas;
- zero aprovações de passagem;
- TK-01 e TK-02 retornaram a 0 bbl.

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

Concluído:

1. usuário administrador criado e confirmado;
2. fluxos transacionais de tanque, operação, carreta, alerta e passagem testados;
3. checks do GitHub Actions aprovados;
4. testes automatizados de desktop e celular aprovados.

Pendente:

1. validar o primeiro login pela interface;
2. validar recuperação de senha;
3. testar os mesmos fluxos manualmente no frontend autenticado;
4. conferir o Painel TV autenticado;
5. disponibilizar uma URL de preview separada ou executar o frontend localmente;
6. registrar o ponto de rollback da `main` antes de qualquer merge.
