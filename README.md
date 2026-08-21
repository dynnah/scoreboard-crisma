# Scoreboard Crisma

> Placar em tempo real para a gincana da Pastoral da Crisma — uma tela pro
> administrador lançar os pontos, outra pra projetar pro público, sincronizadas
> instantaneamente.

## Como rodar

Uma vez, com internet:

```
npm install
npm run build
```

No dia do evento, sem internet:

```
npm start
```

Abra duas abas em `http://localhost:3000`:

| Rota      | Tela                                    |
| --------- | ---------------------------------------- |
| `/`       | Painel do Administrador                  |
| `/telao`  | Placar pro público (tela cheia, projetor) |

## O jogo

Cada equipe começa com **100 pontos** por padrão — o administrador pode
definir outro valor inicial antes de cadastrar as equipes.

| Ação                                    | Pontos                                  |
| ---------------------------------------- | ---------------------------------------- |
| Resposta certa                           | +10                                      |
| Resposta errada                          | −10                                      |
| Não respondeu / não entregou a tempo     | −20                                      |
| Denúncia de cola confirmada               | −20 pra flagrada, +20 pra denunciante    |
| Pontuação livre                          | valor e motivo definidos na hora         |

- **Cronômetro** por prova, com atalhos de 30/60/90/120s ou um valor
  customizado. Calculado por timestamp — não perde a contagem certa mesmo se
  o processo cair no meio de uma rodada.
- **Colocação ao vivo**: as 3 equipes na frente ganham um selo de troféu
  (ouro, prata, bronze) tanto no painel do administrador quanto no Telão. Em
  caso de empate as equipes dividem a colocação e a seguinte pula (dois times
  em 2º, o próximo é 4º). No painel do administrador a ordem das equipes é
  sempre fixa (ordem de cadastro) — só o selo muda, pra não perder o time de
  vista enquanto pontua. No Telão as linhas seguem a colocação ao vivo, pra
  quem está assistindo acompanhar a disputa subindo/descendo.
- **Denúncia**: quando uma equipe flagra outra colando, vira um único evento
  no histórico (dois lançamentos ligados); desfazer reverte os dois juntos.
- **Desfazer última ação**: reverte o lançamento (ou par de lançamentos) mais
  recente.
- **Reiniciar tudo**: zera equipes, pontos, histórico, cronômetro e o banco
  de perguntas (as imagens enviadas também são apagadas).
- **Finalizar jogo**: troca o Telão por um anúncio em destaque da equipe
  vencedora, com tratamento de empate e os selos de prata/bronze na lista das
  demais equipes.

Regras que são só do evento em si, sem lógica no sistema: proibido celular,
roteiro, catecismo ou anotações durante as provas.

## Notas técnicas

- Um único processo Node (Express + Socket.IO), sem banco de dados — o
  estado é salvo em `server/placar.json`.
- Fontes e logo são arquivos locais; nada depende de internet em runtime.
- Fonte: Glacial Indifference, por Hanken Design Co. (SIL OFL 1.1).
- Deploy online opcional, protegido por senha — veja `render.yaml` e
  `.env.example`.
