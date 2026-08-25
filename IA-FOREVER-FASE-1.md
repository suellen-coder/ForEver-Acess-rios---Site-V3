# IA Forever — Fase 1

Implementação sem backend e sem API externa.

## O que foi adicionado

- Bloco **IA Forever · análise local** no Dashboard.
- Comparação de faturamento do mês atual com o mês anterior.
- Taxa de cancelamento.
- Produto com maior saída, quando os itens dos pedidos estão disponíveis.
- Alertas de produtos esgotados ou com estoque baixo.
- Ticket médio mensal.
- Identificação de clientes recorrentes.

## Privacidade

Todos os cálculos acontecem no navegador a partir dos dados já carregados do Firestore. Nenhum dado é enviado para OpenAI ou outro serviço de inteligência artificial.

## Arquivos alterados

- `admin/index.html`
- `js/admin.js`
- `css/admin.css`
