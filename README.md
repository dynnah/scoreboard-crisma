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

Cada equipe começa com **100 pontos**.

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
- **Denúncia**: quando uma equipe flagra outra colando, vira um único evento
  no histórico (dois lançamentos ligados); desfazer reverte os dois juntos.
- **Desfazer última ação**: reverte o lançamento (ou par de lançamentos) mais
  recente.
- **Reiniciar tudo**: zera equipes, pontos, histórico e cronômetro.
- **Finalizar jogo**: troca o Telão por um anúncio em destaque da equipe
  vencedora, com tratamento de empate.

Regras que são só do evento em si, sem lógica no sistema: proibido celular,
roteiro, catecismo ou anotações durante as provas.

## Notas técnicas

- Um único processo Node (Express + Socket.IO), sem banco de dados — o
  estado é salvo em `server/placar.json`.
- Fontes e logo são arquivos locais; nada depende de internet em runtime.
- Fonte: Glacial Indifference, por Hanken Design Co. (SIL OFL 1.1).
- Deploy online opcional, protegido por senha — veja `render.yaml` e
  `.env.example`.
