# Forever Admin V2

## Novidades
- Dashboard com receita, pedidos e estoque
- Pedidos salvos automaticamente pelo checkout
- Gestão de status dos pedidos
- Cadastro de produtos no Firestore
- Controle de estoque em tempo real
- Clientes e financeiro derivados dos pedidos
- Configurações da loja
- Exportação CSV
- Tema claro/escuro e layout responsivo

## Coleções do Firestore
- `estoque`
- `produtos`
- `pedidos`
- `configuracoes/loja`

## Regras
O usuário autenticado precisa ter leitura e escrita nessas coleções. O checkout público precisa ter permissão para criar documentos em `pedidos` e atualizar o estoque conforme as regras já usadas pelo projeto.


## Atualização V2.1 — Checkout

- Telefone obrigatório no checkout, salvo apenas no Firestore/painel administrativo.
- Forma de pagamento obrigatória: Pix, cartão ou dinheiro.
- Telefone e pagamento aparecem nos detalhes do pedido no painel.
- A tela de clientes passa a agrupar preferencialmente pelo telefone.
- A exportação CSV inclui telefone e forma de pagamento.
