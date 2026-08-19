# Placar da Gincana da Crisma

Placar offline para a gincana da Pastoral da Crisma. Backend Node/Express/Socket.IO
com estado em memória persistido em `server/placar.json`; frontend React/TS buildado
estaticamente e servido pelo próprio Express — um único processo, sem internet.

## Antes do sábado (em casa, com internet)

```
npm install
npm run build
```

Isso instala as dependências e gera `client/dist` (interface) e `server/dist`
(servidor compilado). Só precisa rodar uma vez.

## No dia do evento (sem internet)

```
npm start
```

Isso sobe o servidor em `http://localhost:3000`. Abra duas abas:

- `http://localhost:3000/` — Painel do Administrador
- `http://localhost:3000/telao` — Tela do Telão (deixe em tela cheia / F11)

Para rodar em outra porta: `PORT=8080 npm start`.

## Por que funciona 100% offline

- Sem chamadas de rede em runtime: fontes (`client/public/fonts/*.woff2`) e
  logo são arquivos locais, sem `@import` de CDN.
- Sincronização entre as duas abas via WebSocket (Socket.IO) direto no
  `localhost` — não depende de wifi/internet, só do processo local.
- Estado gravado em `server/placar.json` a cada lançamento; se o processo
  cair, os dados são recuperados ao reiniciar (`npm start` de novo), incluindo
  o cronômetro, que retoma a contagem correta calculada por timestamp.
- Sem banco de dados externo.

## Regras implementadas

- Toda equipe começa com 100 pontos.
- Resposta certa: +10. Errada: -10. Não entregou a tempo: -20.
- Denúncia de cola: -20 para a equipe flagrada, +20 para a denunciante
  (um único evento no histórico, desfazer reverte os dois lançamentos juntos).
- Pontuação livre por equipe (número + motivo) para casos fora das regras acima.
- "Desfazer última ação" reverte o lançamento (ou par de lançamentos, no caso
  de denúncia) mais recente.
- Cronômetro com presets de 30/60/90/120s e campo customizado, calculado por
  timestamp (não por contagem ingênua) — não perde precisão mesmo se o
  processo travar e reiniciar no meio de uma contagem.
- "Reiniciar tudo" zera equipes, pontos, histórico e cronômetro (com confirmação).
- "Finalizar jogo e anunciar vencedor" troca a tela do Telão por um anúncio
  em destaque da equipe vencedora (com tratamento de empate). "Voltar ao
  placar" desfaz.

Regras que são só do evento (sem lógica no sistema): proibido celular,
roteiro, catecismo ou anotações durante as provas.

## Créditos de fonte local

- **Glacial Indifference**, por Hanken Design Co. — licença SIL Open Font
  License 1.1 (`client/public/fonts/LICENSE-GlacialIndifference.txt`).

## Deploy online (com senha) — Render.com

O app roda offline por padrão (sem internet, sem senha). Mas também dá pra
publicar uma versão acessível pela internet, protegida por senha (HTTP Basic
Auth — o navegador mostra o prompt nativo de usuário/senha). A sincronização
em tempo real (Socket.IO) precisa de um servidor Node rodando de verdade, então
plataformas 100% serverless como Vercel/Netlify não servem aqui — foi por
isso que escolhemos o Render.

Passo a passo:

1. Suba este repositório pro GitHub (veja seção abaixo).
2. Em [render.com](https://render.com), crie uma conta e clique em
   **New > Blueprint**, apontando pro repositório — o Render lê o
   `render.yaml` da raiz e já configura tudo (build, start, variável
   `AUTH_USER`).
3. Quando pedir o valor de `AUTH_PASSWORD`, defina a senha que quem for
   acessar vai precisar digitar (o usuário fixo é `crisma`, mas o que
   importa é a senha).
4. Deploy feito, o Render dá uma URL pública (tipo
   `https://gincana-crisma.onrender.com`). Compartilhe só com quem deve ter
   acesso — ao abrir, o navegador pede usuário (`crisma`) e a senha
   definida no passo 3.

Limitação do plano gratuito do Render: o app "dorme" depois de ~15 minutos
sem uso, e o primeiro acesso depois disso demora uns 30-50 segundos pra
acordar. Pro evento em si (sábado, offline, no notebook) isso não importa —
essa versão online é mais pra testar/compartilhar antes do dia.

Pra testar a senha localmente antes de fazer deploy:

```
AUTH_PASSWORD=suasenha npm start
```

## Subir pro GitHub

```
git init
git add .
git commit -m "Placar da gincana da Crisma"
git branch -M main
git remote add origin <URL_DO_SEU_REPOSITORIO_VAZIO_NO_GITHUB>
git push -u origin main
```

Crie o repositório vazio em github.com antes (sem README/gitignore
automático, pra não conflitar com o que já existe aqui), e substitua a URL
acima pela dele.
