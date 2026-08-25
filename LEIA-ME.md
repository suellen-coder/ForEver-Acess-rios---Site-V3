# Forever Acessórios — projeto refatorado

## Alterações realizadas

- `index.html` e `checkout.html` foram movidos para a raiz.
- As páginas administrativas foram movidas para `/admin`.
- Os caminhos de CSS, JavaScript, imagens, vídeo e navegação foram ajustados para a nova estrutura.
- Foi criado `js/utils.js` para centralizar armazenamento do carrinho, formatação de preços e normalização de textos.
- `script.js` e `checkout.js` passaram a importar as funções compartilhadas.
- O estoque já utilizava `runTransaction` do Firestore; essa proteção contra vendas simultâneas foi preservada.

## Atenção

Os arquivos do painel administrativo enviados no ZIP estavam vazios (`0 bytes`): HTML, CSS e JavaScript. Por isso, não havia código disponível para revisar ou reconstruir com segurança. Eles foram preservados na pasta `/admin` e nos arquivos correspondentes.

## Como iniciar

Abra o `index.html` da raiz com o Live Server. A URL será semelhante a:

`http://127.0.0.1:5500/index.html`

## Forever Admin v1.0

O painel está disponível em `admin/index.html`.

### Antes do primeiro acesso
1. No Firebase Console, abra **Authentication > Sign-in method** e ative **E-mail/senha**.
2. Em **Authentication > Users**, cadastre o usuário administrador.
3. Confirme que as regras do Firestore permitem que usuários autenticados leiam e atualizem a coleção `estoque`.

Exemplo inicial de regra para o estoque (ajuste conforme sua política de segurança):

```text
match /estoque/{documento} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

Nesta primeira versão foram implementados login, logout, navegação responsiva, tema claro/escuro, dashboard em tempo real e edição do estoque. Produtos e pedidos aparecem como módulos preparados para as próximas etapas.


## Atualização visual da loja

A loja principal e o checkout agora usam a mesma linguagem visual do painel administrativo: fundo claro, cartões brancos, bordas suaves, cantos arredondados, sombras discretas, tipografia Inter/Noto Serif Display e a paleta vinho da Forever.

Os novos arquivos são:

- `css/store-admin-theme.css`
- `css/checkout-admin-theme.css`

Eles são carregados depois dos CSS originais, preservando o funcionamento do catálogo, carrinho, estoque e checkout.
