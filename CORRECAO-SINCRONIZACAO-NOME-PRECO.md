# Correção de sincronização entre Admin e Loja

## Problema corrigido

O carrinho lia nome e preço diretamente do texto renderizado no HTML. Quando havia preço promocional, o texto continha o preço antigo e o atual, o que podia gerar leitura incorreta.

## Nova regra

- Firestore (`produtos`) é a fonte oficial de nome, preço e imagem.
- O catálogo usa esses dados para renderizar os cards e previews.
- O carrinho recebe o produto diretamente do estado do catálogo, não do texto da tela.
- Produtos já colocados no carrinho são atualizados quando o Admin muda nome, preço ou imagem.
- O checkout confere novamente os produtos no Firestore antes de exibir e finalizar o pedido.
- Produtos inativos são removidos do carrinho.

## Arquivos alterados

- `js/catalogo.js`
- `js/script.js`
- `js/checkout.js`
