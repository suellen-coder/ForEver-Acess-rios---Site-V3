# Correção do checkout no celular

- Substituído `window.open()` por redirecionamento na mesma aba com `window.location.assign()`.
- Botão é bloqueado imediatamente durante o envio.
- Carrinho é limpo após o pedido ser processado para evitar duplicidade.
- Link usa `api.whatsapp.com/send`, compatível com navegador mobile e desktop.
- Em caso de erro de estoque, o botão é reativado.
