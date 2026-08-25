# Financeiro V2.1 — alterações reais

## Arquivos modificados
- `admin/index.html`: nova tela financeira, métricas, filtros, tabela e modal de movimentação.
- `js/admin.js`: cadastro, leitura e exclusão de entradas, saídas e investimentos no Firestore; cálculo de saldo, pendências e categorias.
- `css/admin.css`: estilos responsivos do novo módulo financeiro.

## Coleção nova no Firestore
`movimentacoesFinanceiras`

Campos: `tipo`, `categoria`, `descricao`, `valor`, `data`, `formaPagamento`, `status`, `observacoes` e `criadoEm`.

## Cálculo
Saldo atual = vendas válidas + outras entradas pagas − saídas pagas − investimentos pagos.
Movimentações pendentes aparecem separadamente e não alteram o saldo atual.
