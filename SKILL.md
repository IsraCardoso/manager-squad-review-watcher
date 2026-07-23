---
name: manager-squad-review-watcher
description: Watcher de um canal Slack de code-review — detecta menção ao seu squad/usergroup ou a você com link de PR, chama SEU pipeline de review de escolha e posta o veredito no GitHub e no Slack. Configurável por pessoa via config.json. Invocado via scheduled task ou /loop 5m.
---

# manager-squad-review-watcher

Rode este loop periodicamente (scheduled task recomendado — ver README). A cada disparo:

## 0. Checar janela de operação

- `isWithinOperatingHours(config.operatingHours, new Date())` de `src/operatingHours.ts`.
- Fora da janela (ou `operatingHours` ausente do `config.json` → sempre dentro): se fora, encerrar a rodada AGORA, sem ler o Slack, sem tocar o cursor, sem chamar `reviewCommand`. Zero efeito colateral, zero custo de token.
- **Resiliência a computador desligado:** a janela só controla QUANDO processar, não PERDE mensagens. `readCursor`/`writeCursor` (passo 1) marcam o último ponto processado; se a máquina ligar às 9h com a janela configurada 08:00–18:00, a primeira rodada do dia já cai dentro da janela e processa, via `oldest: cursor`, tudo que chegou desde o cursor anterior — inclusive o que foi postado antes das 9h. Nada se perde, só processa mais tarde que o ideal.

## 1. Poll do canal

- Ler `config.json` (channelId, reviewGroupSubteamId, squadMembers, reviewCommand).
- `readCursor(channelId)` de `src/state.ts` — se `null`, usar "agora" como ponto de partida (primeira execução não reprocessa histórico).
- `slack_read_channel(channel_id, oldest: cursor)` pra pegar só mensagens novas.
- Pra cada mensagem com `thread_ts`/replies, também `slack_read_thread` — a menção e o link de PR podem estar em mensagens diferentes da mesma thread.

## 2. Detectar gatilho

- Pra cada mensagem nova (+ thread), rodar `detectTrigger` (`src/detectTrigger.ts`) com o `squadMembers[].slackUserId` do dono desta instância e o `reviewGroupSubteamId` do config.
- Sem gatilho: `writeCursor(channelId, ts da última mensagem lida)` e encerrar esta rodada.
- Com gatilho: seguir pro passo 3 SEM ainda avançar o cursor (só avança depois de processar, pra não perder o item se algo falhar no meio).

## 3. Reagir `eyes` e buscar o PR

- `slack_add_reaction(channelId, matchedTs, "eyes")` — sinaliza que a análise começou (`START_REACTION` de `src/reactionState.ts`).
- `fetchPr(prUrl)` (`src/fetchPr.ts`) — diff + metadados via `gh`, sem checkout local.
- Antes de seguir, `gh pr view <url> --json reviews` como segunda checagem: se já existe review real de alguém que não é você, trate como já resolvido — pule pro passo 8 sem revisar de novo (mesmo espírito do guard de reação do passo 2).

## 4. Rodar SEU pipeline de review (plugável — contrato genérico)

- Invocar o que estiver em `config.reviewCommand` (uma skill/slash-command/CLI que **você** já usa pra revisar código — `/review`, um script próprio, o que for) passando a URL do PR (ou o diff do passo 3, se o comando aceitar).
- **Este watcher não sabe nem precisa saber COMO seu `reviewCommand` decide o veredito** — é opaco de propósito, pra ficar compartilhável entre squad members com pipelines de review diferentes. O contrato de saída esperado é:
  ```json
  { "verdict": "approved" | "approved_with_comment" | "changes_requested", "findings": ["achado 1", "achado 2", ...] }
  ```
- Se seu `reviewCommand` não devolve esse formato nativamente, adapte a chamada (parsear a saída, ou escrever um wrapper fino) — isso é customização SUA, fora do escopo genérico deste repo.
- Se o `reviewCommand` falhar ou não devolver o contrato esperado: trate como fail-safe — `verdict: changes_requested` com achado único "Revisão automática falhou — revisão manual necessária." Isso completa o fluxo normalmente (passos 5-8), não é falha de infraestrutura (que retenta — ver `## Erros`).

## 5. Postar no GitHub

- `postGithubReview(prUrl, verdict, body)` (`src/postGithubReview.ts`) — `body` é a lista de achados formatada a partir de `findings` (passo 4).

## 6. Responder e reagir no Slack

- `slack_send_message` na thread com `replyMessage(verdict, mentionedUserId)` (`src/reactionState.ts`) — `mentionedUserId` é a pessoa que PEDIU o review (autor da mensagem-gatilho), não o dono do watcher.
- `slack_add_reaction(channelId, matchedTs, terminalReaction(verdict))`.
- **Não** afirmar que o `eyes` foi removido — a maioria dos MCPs de Slack não tem essa tool ainda. O `eyes` fica ao lado da reação terminal; isso é uma limitação conhecida e documentada no README, não algo que precisa aparecer em toda mensagem.

## 7. Avançar o cursor

- `writeCursor(channelId, ts da mensagem processada)`.

## Erros

- **`reviewCommand` falhou ou devolveu formato inesperado (fail-safe do passo 4)**: NÃO é motivo pra reter o cursor — é um veredito válido (`changes_requested` fail-safe). Processar normalmente até o fim (postar no GitHub + Slack + avançar cursor). Reter o cursor aqui criaria retry infinito num PR real enquanto seu pipeline de review estiver com problema, sem nunca notificar ninguém.
- **Falha de infraestrutura de verdade** (gh sem permissão, Slack MCP indisponível, rede fora): essa sim NÃO avança o cursor — retenta na próxima rodada. Logar o erro, não derrubar o loop inteiro.
