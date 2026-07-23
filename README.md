# manager-squad-review-watcher

Watcher de canal Slack que dispara **review automático de PR** sempre que alguém marca seu squad/usergroup (ou você) com um link de PR na mensagem ou na thread. Roda o **seu** pipeline de review — plugável, você escolhe qual — e posta o veredito de volta no GitHub e no Slack.

Sem checkout local do branch: só `gh pr diff`/`gh pr view` contra o GitHub, nunca clona nada.

## Índice

- [Como funciona](#como-funciona)
- [Setup](#setup)
- [Contrato do `reviewCommand`](#contrato-do-reviewcommand)
- [Custo real (tokens)](#custo-real-tokens)
- [Arquitetura](#arquitetura)
- [Testes](#testes)

## Como funciona

1. **Poll incremental** do canal Slack via cursor persistido (`.state/last-seen.json`) — nunca reprocessa mensagem já vista.
2. **Detecção de gatilho** por markup real do Slack (`<!subteam^ID>`/`<@USER_ID>`) — nunca por texto literal `"@squad"`, que é como o Slack de fato entrega menções.
3. **Dois guards de "já resolvido"**: pula thread que você mesmo iniciou, e pula thread que já tem review real (aprovado ou com mudanças solicitadas) de qualquer pessoa — nunca duplica review.
4. **Chama seu `reviewCommand`** (config próprio) contra o PR — o watcher não sabe nem precisa saber como ele decide.
5. **Posta o veredito**: `gh pr review` no GitHub + reply e reação no Slack.

Fluxo detalhado, passo a passo: [SKILL.md](SKILL.md).

## Setup

Guia completo com as 5 perguntas de configuração: [SETUP.md](SETUP.md).

Resumo:

```bash
cp config.example.json config.json
# preencher channelId, reviewGroupSubteamId, slackUserId, githubUser, reviewCommand
bun install
gh auth status
```

Depois, rode como scheduled task (recomendado — roda fora da sua sessão de chat, não acumula contexto nela) ou via `/loop 5m` apontando pro `SKILL.md`.

## Contrato do `reviewCommand`

O watcher é agnóstico de pipeline de review por design. Seu `reviewCommand` (uma skill, slash-command ou script que você já usa) recebe a URL do PR e devolve:

```json
{
  "verdict": "approved" | "approved_with_comment" | "changes_requested",
  "findings": ["achado 1", "achado 2"]
}
```

Se o seu comando não devolve isso nativamente, um wrapper fino resolve — isso fica fora do escopo deste repo, propositalmente.

## Custo real (tokens)

Medido em produção, rodando como scheduled task a cada 5 minutos. **Sem valor em dinheiro de propósito — o que importa aqui é volume de token e o quanto cache carrega o peso:**

| Cenário | Tokens totais (média) | Cache (create+read) | % do total em cache |
|---|---|---|---|
| **Sem gatilho** (poll normal, nada pra revisar) | ~456 mil | ~409 mil | ~99,5% |
| **Com gatilho** (achou PR, processa de ponta a ponta) | ~2,45 milhões | — | — |

O prompt do sistema/instrução do watcher (SKILL.md + config) é idêntico a cada tick — por isso o **cache de prompt cobre praticamente todo o custo recorrente**: a cada execução, só o pedaço realmente novo (mensagens Slack desde o último cursor) entra como token fresco. Isso é o motivo do desenvolvimento ser barato mesmo rodando de 5 em 5 minutos, 24/7.

## Arquitetura

```
src/
├── state.ts              # cursor de polling (.state/last-seen.json)
├── detectTrigger.ts       # menção (markup real) + link de PR + guards de "já resolvido"
├── fetchPr.ts             # diff/metadados via gh, sem checkout local
├── postGithubReview.ts    # gh pr review (--body-file, nunca --body <string> cru)
└── reactionState.ts       # templates de reply + convenção de reação (eyes/heavy_check_mark/speech_balloon)
```

## Limitações conhecidas

- **A reação `eyes` não é removida** ao concluir o review — a maioria dos MCPs de Slack ainda não expõe uma tool de remover reação. O bot só adiciona a reação terminal (`heavy_check_mark`/`speech_balloon`) ao lado; o `eyes` fica.

## Testes

```bash
bun test
```

25 testes cobrindo detecção de gatilho, guards de duplicidade, fetch de PR, postagem no GitHub e templates de reação — nenhum depende de rede (mocks em todos os pontos de I/O externo).
