# Processo de homologação do OPSControl IA

## Objetivo

Evitar que alterações incompletas, regressões visuais ou mudanças incompatíveis com o Supabase cheguem diretamente à produção.

## Branches

- `main`: versão estável utilizada em produção.
- `homologacao`: integração e validação antes da produção.
- branches de trabalho: uma branch curta por correção ou funcionalidade.

## Acesso ao ambiente

A homologação é ativada com `?env=staging`. O frontend deve exibir uma faixa permanente de identificação e usar exclusivamente o projeto Supabase `opscontrol-ia-homologacao`.

A produção é ativada com `?env=production` e permanece no projeto `opscontrol-ia-v2`.

Nunca liberar o login de staging quando a URL ou chave forem iguais às de produção.

## Fluxo obrigatório

1. Criar a alteração fora da `main`.
2. Integrar primeiro em `homologacao`.
3. Executar lint, typecheck, testes responsivos, isolamento de ambiente, segurança e build.
4. Validar manualmente desktop, celular e Painel TV quando a mudança afetar interface.
5. Validar usuário e permissões quando a mudança afetar autenticação ou cargos.
6. Revisar migrations e políticas RLS quando a mudança afetar o Supabase.
7. Registrar um ponto de rollback antes de mudanças estruturais.
8. Abrir PR de `homologacao` para `main` somente com os checks aprovados.
9. Preferir squash merge para manter o histórico legível.

## Regras

- Não publicar diretamente na `main`.
- Não criar uma nova camada visual para esconder outra camada defeituosa.
- Não misturar mudança visual, banco de dados e regra operacional na mesma entrega sem necessidade.
- Não remover tabelas, colunas ou dados do Supabase sem snapshot e análise de uso.
- Não considerar uma tela aprovada apenas porque está bonita; validar leitura, ação, erro, vazio, carregamento e responsividade.
- Não realizar merge com check falhando ou sem execução dos testes.
- Não copiar dados operacionais de produção para homologação sem anonimização e necessidade comprovada.
- Não criar usuários por inserção direta em `auth.users`; usar a API administrativa ou o painel do Supabase.

## Validação mínima

- Login e recuperação de acesso.
- Dashboard conforme o cargo.
- Tanques e silos: leitura, atualização e histórico.
- Operações: criação, andamento e conclusão.
- Alertas e chat: criação, leitura e resposta.
- Desktop em 1366 px.
- Celular em 390 px.
- Painel TV em tela cheia.
- Modo offline e retorno da conexão.
- Confirmação visual de que o ambiente ativo é homologação.

## Rollback

Antes de uma publicação estrutural, criar uma branch de backup apontando para o commit estável atual. Em caso de regressão crítica, restaurar a `main` para o commit aprovado e investigar a falha na `homologacao`.
