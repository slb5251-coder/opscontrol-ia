# Hardening de segurança do OPSControl IA

## Princípio

O schema operacional do OPSControl é privado. Nenhuma tabela, sequência ou função de negócio deve ser acessível pelo papel `anon` ou por herança do papel global `PUBLIC`.

Todo acesso da aplicação deve ocorrer por uma sessão autenticada e permanecer sujeito às políticas RLS e às verificações de função/cargo.

## Correções aplicadas na homologação

A auditoria inicial encontrou:

- 413 privilégios diretos do papel `anon` em 59 tabelas públicas;
- 13 políticas RLS vinculadas ao papel global `PUBLIC`;
- políticas `FOR ALL` que também eram avaliadas em leituras;
- políticas administrativas redundantes;
- chamadas `auth.uid()` reavaliadas por linha;
- chaves estrangeiras sem índice de cobertura;
- dois pares de índices exatamente duplicados.

O hardening executado:

- revogou privilégios de tabelas, sequências e funções de `anon` e `PUBLIC`;
- revogou default privileges para impedir que novos objetos nasçam expostos;
- manteve grants explícitos para `authenticated`;
- recriou políticas operacionais para o papel `authenticated`;
- separou políticas de escrita em `INSERT`, `UPDATE` e `DELETE`;
- removeu políticas administrativas redundantes;
- estabilizou referências a `auth.uid()` com subqueries;
- adicionou índices para chaves estrangeiras relevantes;
- removeu somente índices comprovadamente idênticos.

## Estado validado

Depois das migrations:

- o papel `anon` não possui privilégios diretos nas tabelas públicas;
- não existem políticas do schema público destinadas ao papel `PUBLIC`;
- `anon` não consegue selecionar tanques ou fechamentos;
- `anon` não consegue executar os RPCs de observabilidade;
- `authenticated` mantém os privilégios necessários da aplicação;
- todas as funções públicas não-trigger continuam executáveis por `authenticated`;
- apenas um índice permanece em cada par anteriormente duplicado.

## Funções SECURITY DEFINER

Alguns RPCs permanecem `SECURITY DEFINER` de forma intencional porque executam transações atômicas, precisam gravar histórico/auditoria ou coordenam várias tabelas com RLS.

Uma função `SECURITY DEFINER` só é considerada aceitável neste projeto quando:

1. exige uma sessão autenticada;
2. valida explicitamente o papel ou a relação do usuário com o registro;
3. possui `search_path` fixo;
4. não recebe SQL dinâmico arbitrário;
5. limita e valida os parâmetros de entrada;
6. não é executável por `anon` ou `PUBLIC`;
7. possui teste ou fluxo transacional comprovado.

Não se deve converter todas essas funções para `SECURITY INVOKER` apenas para eliminar avisos do advisor. Essa troca pode quebrar operações atômicas e regras legítimas. Cada função precisa de revisão individual.

## Índices marcados como não utilizados

O Supabase Advisor informa vários índices como `unused_index`. A homologação é recente, começa quase sem dados e ainda não recebeu carga operacional representativa. Nesse cenário, estatística de uso igual a zero não é prova de que o índice é inútil.

Não remover índices apenas para zerar o advisor. Um índice só pode ser descartado após:

- período real de observação;
- análise de consultas e planos de execução;
- confirmação de que não cobre chave estrangeira ou ordenação crítica;
- teste de desempenho antes e depois;
- migration reversível.

## Pendência de configuração Auth

A proteção contra senhas vazadas ainda aparece desativada no Supabase Auth. Essa configuração deve ser habilitada no painel quando disponível no plano atual. Ela não deve ser substituída por lógica própria no frontend.

## Escopo

Estas mudanças foram aplicadas somente ao projeto Supabase de homologação. Produção permanece inalterada até validação e autorização explícita.
