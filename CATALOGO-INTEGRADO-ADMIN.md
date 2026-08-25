# Catálogo integrado ao Admin

## O que mudou
- O site do cliente agora carrega os produtos diretamente da coleção `produtos`.
- O estoque continua na coleção `estoque`, usando o mesmo SKU como ID.
- Nome, preço, promoção, descrição, imagem, categoria, material, cor, tags, destaque, ordem e status podem ser editados no Admin.
- O estoque também pode ser informado no formulário de produto.
- Produtos inativos não aparecem na loja.
- Produtos em destaque aparecem primeiro; esgotados ficam no fim.
- Preview, carrinho e checkout utilizam os dados renderizados do Firestore.

## Primeira utilização
1. Entre em Admin > Produtos.
2. Clique em **Importar catálogo atual** uma única vez.
3. Revise os produtos importados e complete os dados desejados.
4. Depois disso, cadastre e edite tudo somente pelo Admin.

A importação não sobrescreve campos já preenchidos no Firestore.
