# Setup — manager-squad-review-watcher

## Pré-requisitos (antes de mandar rodar o SETUP.md)

- **Claude Code** (ou outro harness de IA compatível) instalado — é ele que vai ler este repo e configurar.
- **Bun** instalado (`bun --version` — se não tiver, `npm i -g bun` ou [bun.sh](https://bun.sh)).
- **GitHub CLI (`gh`)** instalado e autenticado (`gh auth status` — se não, `gh auth login`).
- **MCP do Slack conectado** na sua sessão do Claude Code (pra ler o canal e reagir/responder). Se seu harness não tiver isso configurado ainda, peça ajuda de setup antes de continuar.
- **Seu próprio comando/skill de review já funcionando** — é o que o watcher vai chamar (pergunta 5 abaixo).

Se algum desses faltar, o assistente vai travar tentando rodar o watcher — resolve o pré-requisito antes.

## Como iniciar

1. Descompacte o zip numa pasta.
2. Abra essa pasta no Claude Code (ou harness equivalente).
3. Peça: **"leia o SETUP.md deste repo e siga o passo a passo, uma pergunta de cada vez"**.

## Perguntas pro squad member (uma de cada vez)

1. **Qual canal Slack você quer que o watcher escute?**
   - Opção A (recomendada, é o que a squad já usa): `#code-review`, `channel_id` = `C016QCKU8UW`.
   - Opção B: outro canal — pegue o `channel_id` (tipo `C0XXXXXXX`) nos detalhes do canal no Slack, ou pergunte ao assistente: "qual o channel_id de #nome-do-canal?".

2. **Qual o ID do seu usergroup/squad no Slack** (o `@nome-do-squad` que aparece quando alguém marca seu time)?
   - Opção A (recomendada, é o que a squad já usa): `@squad-manager`, `subteam_id` = `S089GS38F7S`.
   - Opção B: outro squad — **não é o texto do nome**, é um ID interno (`SXXXXXXX`). Se não souber, confirme lendo uma mensagem real que já usa essa marcação no canal — o texto bruto mostra `<!subteam^SXXXXXXX>`.

3. **Qual o seu próprio Slack user ID?** (`UXXXXXXX`)
   - Passo a passo mais rápido: pergunte ao seu assistente de IA (com Slack MCP conectado) "qual é o meu Slack user_id?" — a maioria dos MCPs de Slack já sabe isso de fábrica (aparece como "current logged in user" na descrição das próprias tools).
   - Se não tiver assistente com Slack conectado: no app do Slack, clique no seu avatar (canto superior) → "Ver perfil" → clique nos `...` (mais opções) do seu próprio perfil → **"Copy member ID"**. Cola o valor aqui.

4. **Qual o seu usuário do GitHub?**
   - Passo a passo mais rápido: rode `gh auth status` no terminal — a saída mostra `Logged in to github.com account <seu-usuario>`.
   - Alternativa: acesse [github.com](https://github.com) logado — seu usuário aparece na URL do seu perfil (`github.com/<seu-usuario>`).

5. **Qual comando/skill de review você já usa hoje?** (`/review`, um script próprio, uma skill do seu harness — qualquer coisa que, dado um PR, te diga se aprova ou pede mudanças). Esse é o `reviewCommand` do seu `config.json` — o watcher vai chamar ELE, sem saber como ele decide por dentro.

6. **Em que horário o watcher deve rodar?**
   - Padrão (recomendado): `08:00`–`18:00` — fora desse horário ele não reage nem revisa nada, só ignora a rodada (sem custo de token, sem barulho no Slack fora do expediente).
   - Se quiser rodando o dia inteiro, responda "sempre" — remove a chave `operatingHours` do `config.json`.

## Depois de ter as respostas

1. `cp config.example.json config.json`
2. Preencher `channelId`, `reviewGroupSubteamId`, `squadMembers[0].slackUserId`, `squadMembers[0].githubUser`, `reviewCommand`, `operatingHours` com as respostas acima (ou remover `operatingHours` pra rodar 24h).
3. `bun install`
4. `gh auth status` — confirmar que está autenticado como você.
5. Ler `SKILL.md` passo 4 — se seu `reviewCommand` não devolve nativamente `{verdict, findings}` (formato descrito lá), você precisa de um wrapper fino que traduza a saída dele pra esse formato. Isso é customização sua.
6. Rodar como scheduled task (recomendado — roda fora da sua sessão de chat, não acumula contexto) ou `/loop 5m` apontando pro `SKILL.md` deste repo.

## O que este repo NUNCA precisa saber sobre você

- Qual CLI/modelo de IA você usa pro review de verdade — isso fica inteiramente dentro do seu `reviewCommand`, opaco pro watcher.
- Nada da sua stack pessoal além dos 5 valores acima.
