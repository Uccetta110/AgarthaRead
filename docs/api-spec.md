# API Spec (esempi) — AgarthaRead

Questo file raccoglie esempi di request/response per le API interne (server routes Nuxt).

Autenticazione
- Metodo consigliato: session cookie HttpOnly (`Set-Cookie`) oppure Bearer token per API non-browser.
- Header comuni: `Accept: application/json`, `Content-Type: application/json`.

1) Ricerca libri — GET /api/books
- Query params: `q` (string), `page` (int), `limit` (int)
- Auth: opzionale

Esempio request
GET /api/books?q=tolkien&page=1&limit=20

Esempio response 200
```json
{
  "total": 123,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "internal-123", 
      "type": "book",
      "source": "googlebooks",
      "title": "The Hobbit",
      "authors": ["J.R.R. Tolkien"],
      "coverUrl": "https://...",
      "isFree": false
    }
  ]
}
```
2) Dettaglio oggetto — GET /api/books/[id]
- Path param: `id` (può essere internal id o external id con prefisso)
- Auth: opzionale (ma restituisce flags utente se autenticato)

Esempio response 200
```json
{
  "item": {
    "id": "internal-123",
    "type": "book",
    "source": "googlebooks",
    "title": "The Hobbit",
    "description": "...",
    "coverUrl": "https://...",
    "contentUrl": "https://...",
    "language": "en",
    "publishedAt": "1937-09-21",
    "commentsCount": 12
  },
  "flags": {
    "isSaved": true,
    "isLiked": false,
    "isPurchased": false
  }
}
```
3) Aggiungi commento — POST /api/books/[id]/comments
- Body: `{ "text": "Bella recensione", "replyTo": null }
- Auth: richiesto
- Response 201
```json
{
  "comment": { "id": 987, "userId": 12, "text": "Bella recensione", "createdAt": "2026-05-24T12:34:00Z" }
}
```

4) Liste utente — CRUD
- GET /api/lists — restituisce liste dell'utente
- POST /api/lists — crea lista (body: `{ "title":"Preferiti", "is_public":false }`)
- POST /api/lists/[id]/items — aggiunge item (body: `{ "item_type":"book", "external_provider":"googlebooks", "external_id":"XYZ" }`)

Esempio response POST items 200
{ "ok": true, "itemId": 555, "position": 1 }

5) Auth — POST /api/auth/login
- Body: `{ "email":"a@b.com", "password":"secret" }`
- Successo: 200 con Set-Cookie (session id) oppure JSON `{ "user": { "id": 1, "email": "a@b.com" } }` se token-based
- Errore 401: credenziali non valide

6) Registrazione — POST /api/auth/register
- Body: `{ "email":"a@b.com", "password":"secret", "displayName":"Fede" }`
- Successo: 201 con user object e possibile step MFA

7) MFA verify — POST /api/auth/mfa-verify
- Body: `{ "userId": 1, "otp": "123456" }`
- Successo: 200

8) Checkout acquisto — POST /api/purchases/checkout
- Body (esempio):
{
  "userId": 1,
  "items": [{ "itemId": "internal-123", "price": 3.99 }],
  "paymentMethod": "card_xxx"
}
- Nota: l'endpoint deve eseguire operazione in transazione DB; usare `FOR UPDATE` su risorse rilevanti.
- Risposte: 200 (ok, ordine creato), 400 (invalid request), 409 (concorrenza/stock), 500 (errore server)

9) Headers utili e caching
- Supportare `If-None-Match` / `ETag` per risposte dettaglio.
- Ritornare `X-Upstream-Status` quando la risposta viene normalizzata da un servizio esterno.

10) Error handling (schema consigliato)
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Il campo 'text' è obbligatorio",
    "details": { "field": "text" }
  }
}
```
Note operative
- Tutte le chiamate ad API esterne devono passare per server routes (proxy) che normalizzano il payload.
- Usare caching Redis per search e dettaglio (TTL configurabili).
- Limitare dimensione delle response e supportare paginazione (page/limit o cursori).

Per estendere: posso aggiungere esempi completi per ogni route, schemi JSON Schema per validazione e mock server per test automatici.
