# Correções de segurança – APIs e links expostos

## Modelo de negócio

**O usuário não compra o vídeo em si; compra o *product link* (o link do produto), que é o que fica salvo no Supabase.** Esse link é o bem entregue após o pagamento. As correções abaixo garantem que o `product_link` e os arquivos de vídeo não sejam expostos publicamente.

---

## O que estava acontecendo

Alguém conseguia extrair todos os links (incluindo os product links e URLs de vídeo) sem comprar porque:

1. **APIs públicas devolviam IDs internos**
   - `GET /api/videos` e `GET /api/videos/:id` retornavam `video_file_id` e `thumbnail_file_id`.
   - Com esses IDs, qualquer um podia chamar `GET /api/signed-url/:fileId` e receber uma URL de download válida, **sem verificação de compra**.

2. **Signed-URL sem proteção**
   - `GET /api/signed-url/:fileId` gerava URL assinada para **qualquer** `fileId`, sem checar se o usuário tinha comprado o vídeo.

3. **Supabase no frontend**
   - O frontend usa a chave anônima do Supabase e o RLS está desativado nas tabelas, então (em teoria) quem tiver a URL do projeto e a anon key poderia ler tudo. Mesmo assim, **sem uma compra válida** o backend não gera mais URLs de vídeo.

---

## O que foi corrigido

### Backend (`api-routes.js`)

1. **Listagem e detalhe de vídeo**
   - `GET /api/videos` e `GET /api/videos/:id` **não retornam mais** `video_file_id`, `thumbnail_file_id` nem **`product_link`** (é isso que o usuário compra; não pode aparecer na API pública).
   - Só são devolvidos: `id`, `title`, `description`, `price`, `duration`, `thumbnail_url`, `is_active`, `views`, `created_at`, `is_free`.

2. **Product link (o que o usuário compra)**
   - **`GET /api/videos/:id/product-link`** – retorna o `product_link` **somente** se o vídeo for grátis ou se existir compra válida (`email` e/ou `transaction_id`). Quem não comprou recebe 403.

3. **Health**
   - `GET /api/videos/health` não expõe mais dados sensíveis (só contagens e integridade).

4. **Playback protegido**
   - **`GET /api/videos/:id/playback-url`**  
     Gera URL assinada do vídeo principal **somente** se:
     - o vídeo for `is_free`, ou  
     - existir compra concluída para esse vídeo (ou “all_videos”) com o `email` ou `transaction_id` enviados.
   - **`GET /api/videos/:id/source-url?file_id=...`**  
     Mesma lógica para arquivos de “sources” (partes do vídeo).

5. **Signed-URL**
   - **Thumbnails** (`thumbnails/...`): continuam públicas (só imagem de prévia).
   - **Arquivos de vídeo**: passam a exigir `video_id` + prova de compra (`email` e/ou `transaction_id`). O backend verifica compra e se o `fileId` pertence àquele vídeo.

6. **Novos endpoints**
   - **`GET /api/videos/:id/product-link`** – devolve o **product link** (o que o usuário compra) só com compra válida ou vídeo grátis.
   - `GET /api/videos/:id/thumbnail` – URL assinada da thumbnail (público).
   - `GET /api/videos/:id/sources` – lista de sources **apenas** para quem tem compra (prova via query).
   - `GET /api/videos/:id/playback-url` e `GET /api/videos/:id/source-url` – como acima.

### Frontend

1. **Prova de compra**
   - Na página de sucesso de pagamento (`PaymentSuccess`), passamos a guardar em `sessionStorage` a prova de compra:  
     `purchase_proof = { email, transactionId, videoId }`.

2. **Uso da prova no player**
   - O player e o `VideoService` passam a pedir URLs de vídeo apenas pelos endpoints protegidos:
     - `getVideoFileUrl(videoId)` → chama `GET /api/videos/:id/playback-url` com `email` e `transaction_id` vindos do `purchase_proof`.
     - Para sources: `getFileUrlById(fileId, videoId)` ou `getSourceFileUrl(videoId, sourceFileId)` → chamam `source-url` com a mesma prova.

Assim, **quem não comprou** não tem prova válida e recebe **403** ao pedir playback/source URL; vídeos `is_free` continuam acessíveis sem compra.

---

## Recomendações adicionais

1. **Supabase**
   - As tabelas estão com RLS desativado. Para endurecer ainda mais:
     - Ativar RLS nas tabelas sensíveis.
     - Criar uma view (ex.: `videos_public`) com apenas colunas seguras (sem `video_file_id`, `thumbnail_file_id`) e dar permissão de leitura à role `anon` só nessa view.
   - Assim, mesmo com a anon key no frontend, ninguém lê os IDs internos dos arquivos pela API do Supabase.

2. **APIs de admin**
   - Endpoints como `/api/users`, `/api/sessions`, `/api/site-config`, PUT/DELETE em vídeos etc. devem ser protegidos com autenticação (token/sessão de admin) para que só o painel admin acesse.

3. **Prova de compra**
   - Hoje a prova é guardada em `sessionStorage` (email + transaction_id). Para maior segurança, no futuro pode-se usar um token opaco gerado no backend após a compra, em vez de expor email/transaction_id no cliente.

---

## Como testar

- **Sem compra**: abrir um vídeo pago e tentar obter a URL de playback (devtools → rede). Deve retornar **403**.
- **Com compra**: concluir um pagamento de teste, ir para a página de sucesso e em seguida abrir o vídeo. Deve tocar normalmente.
- **Vídeo grátis**: deve tocar mesmo sem compra e sem prova no `sessionStorage`.

Se quiser, posso ajudar a desenhar a view `videos_public` e as políticas RLS no Supabase passo a passo.
