# Passo a passo — upload da foto no cadastro de produtos

A versão 2.4 permite enviar a imagem diretamente pelo painel administrativo usando o Firebase Storage.

## Antes do primeiro uso

1. Entre no **Firebase Console** do projeto `forever-acessorios`.
2. Abra **Storage** no menu lateral.
3. Clique em **Começar** e conclua a criação do bucket.
4. Em **Storage > Regras**, use uma regra que permita leitura pública das imagens e upload apenas para usuários autenticados no painel:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /produtos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

5. Clique em **Publicar**.

## Como cadastrar uma foto

1. Acesse o painel em `/admin`.
2. Entre na aba **Produtos**.
3. Clique em **+ Novo produto** ou em **Editar**.
4. Preencha o SKU, nome, categoria e preço.
5. No campo **Imagem do produto**, clique para escolher uma foto do computador ou celular.
6. Use uma imagem em **JPG, PNG ou WebP**, com até **5 MB**.
7. Confira a prévia exibida no formulário.
8. Clique em **Salvar produto**.
9. Aguarde a mensagem de envio. O painel fará o upload para a pasta `produtos/` do Firebase Storage e salvará automaticamente a URL no cadastro do produto.

## Recomendações para as fotos

- Formato quadrado, preferencialmente `1200 × 1200 px`.
- Fundo limpo e iluminação uniforme.
- Arquivo com menos de 1 MB para carregar mais rápido.
- Nome de arquivo simples, como `FB019-brinco-dourado.jpg`.
- Evite imagens muito verticais, capturas de tela e fotos com textos pequenos.

## Alternativa por URL

Também é possível colar uma URL pública no campo **URL ou caminho da imagem**. Use um endereço que comece com `https://`. Quando uma nova foto for selecionada, a URL do Firebase é preenchida automaticamente após o salvamento.

## Problemas comuns

- **Erro de permissão:** verifique se o usuário está autenticado e se as regras do Storage foram publicadas.
- **Imagem não aparece:** confirme se a URL salva começa com `https://` e se o arquivo existe no Storage.
- **Upload muito lento:** reduza o tamanho da imagem antes de enviar.
- **Storage ainda não configurado:** abra o Firebase Console e conclua a ativação do serviço.
