# Processo de homologação do OPSControl IA

## Objetivo

Evitar que alterações incompletas, regressões visuais ou mudanças incompatíveis com o Supabase cheguem diretamente à produção.

## Branches

- `main`: versão estável utilizada em produção.
- `homologacao`: integração e validação antes da produção.
- branches de trabalho: uma branch curta por correção ou funcionalidade.

## Ambientes

- `production`: usa exclusivamente o Supabase de produção.
- `staging`: usa exclusivamente uma branch ou projeto Supabase sem dados reais.

O ambiente é selecionado pelo parâmetro `?env=production` ou `?env=staging` e fica armazenado no navegador. Ao entrar em staging, a aplicação deve exibir uma faixa amarela permanente com a identificação **AMBIENTE DE HOMOLOGAÇÃO**.

Enquanto a URL e a chave de staging não estiverem configuradas, o login deve permanecer bloqueado. Esse bloqueio é obrigatório para impedir que uma sessão de testes utilize produção por engano.

Nunca preencher a configuração de staging com a URL ou a chave de produção. Para retornar à versão normal, usar o botão **Voltar para produção** ou abrir a aplicação com `?env=production`.

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
- Não testar escrita, exclusão ou permissões no banco de produção.

## Validação mínima

- Login e recuperação de acesso.
- Confirmação visual do ambiente ativo.
- Bloqueio de staging sem banco separado.
- Dashboard conforme o cargo.
- Tanques e silos: leitura, atualização e histórico.
- Operações: criação, andamento e conclusão.
- Alertas e chat: criação, leitura e resposta.
- Desktop em 1366 px.
- Celular em 390 px.
- Painel TV em tela cheia.
- Modo offline e retorno da conexão.

## Rollback

Antes de uma publicação estrutural, criar uma branch de backup apontando para o commit estável atual. Em caso de regressão crítica, restaurar a `main` para o commit aprovado e investigar a falha na `homologacao`.
