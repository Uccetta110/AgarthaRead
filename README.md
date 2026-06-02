# AgarthaRead

## Descrizione Approfondita del Progetto

`AgarthaRead` è una piattaforma web poliedrica concepita per la fruizione, la gestione e la condivisione di una vasta gamma di contenuti digitali, tra cui libri testuali, manga, fumetti (comics) e articoli di attualità (news). L'applicazione è strutturata seguendo un'architettura a monorepo moderna ed efficiente, basata su Nuxt 4 per il nucleo principale e coadiuvata da un servizio indipendente per la gestione degli eventi in tempo reale.

### Architettura e Struttura del Monorepo

Il sistema è suddiviso in moduli specializzati al fine di garantire una netta separazione delle responsabilità e facilitare la scalabilità:
- **apps/web/**: Rappresenta il front-end dell'applicazione sviluppato con Nuxt 4, integrando al suo interno le server routes che agiscono sia da API interne sia da proxy sicuro per le richieste verso l'esterno. Questa cartella ospita le pagine dinamiche (`app/pages`), i componenti dell'interfaccia utente (`app/components`), gli endpoint server (`server/api`), le funzioni di utilità (`utils`) e il client di connessione al database (`db/client.ts`).
- **apps/realtime/**: È un servizio indipendente basato su Socket.IO dedicato all'ecosistema realtime dell'applicazione. Gestisce in modo reattivo eventi critici come i commenti live sotto le opere e l'invio istantaneo delle notifiche, protetto da un middleware di autenticazione dedicato (`auth-socket.ts`).
- **packages/shared/**: Una libreria interna contenente tipi TypeScript, costanti globali e validatori di schema condivisi, che garantisce l'allineamento dei dati tra il client Nuxt e il server realtime.
- **database/**: Custodisce gli asset strutturali della persistenza, inclusi i file di definizione dello schema SQL, le cartelle per le migrazioni incrementali, i dati di seed per gli ambienti di test e il diagramma Entità-Relazione (ER) aggiornato.

### Matrice dei Ruoli e Permessi Utente

L'accesso alle funzionalità della piattaforma è regolato da un sistema di permessi granulari associato a profili utente ben definiti:
- **User (Anonimo o Autenticato)**: L'utente base può esplorare liberamente il catalogo pubblico, leggere i contenuti gratuiti e salvare le opere all'interno di liste personali. Se autenticato, ha accesso alla personalizzazione del profilo e delle preferenze, sebbene agli utenti non confermati siano preclusi i like e i commenti.
- **Author**: Un profilo speciale destinato ai creatori di contenuti. Gli autori hanno la facoltà di pubblicare e distribuire "Opere Interne" (salvate direttamente sul database del sito), modificare le proprie creazioni e rispondere direttamente ai commenti dei lettori. Al momento della conferma del ruolo, viene loro assegnato un badge visivo `artist` che li identifica nei commenti.
- **Manager**: Agisce come personale operativo di supporto agli amministratori (es. segreteria). Dispone di permessi amministrativi granulari (come `VU`, `MU`, `EU`, `MI`, `EI`, `EC`) che gli consentono di approvare o rifiutare le richieste di attivazione dei profili autore, moderare i commenti o revisionare i metadati e i tag delle opere (es. target di età, generi, copertine).
- **Admin**: Il superutente del sistema con controllo totale sulla piattaforma. Ha accesso esclusivo al pannello di amministrazione globale tramite il quale può creare, modificare o eliminare utenti (configurando istantaneamente attributi principali ed email verificate), manipolare liberamente qualsiasi opera nel catalogo, assegnare ruoli e configurare le variabili globali dell'applicazione.

### Flussi Applicativi e Logiche di Integrazione API

Il funzionamento di AgarthaRead poggia su flussi architetturali rigidi volti a ottimizzare le prestazioni e a preservare la sicurezza del database e delle chiavi applicative:

#### 1. Autenticazione e Sicurezza delle Sessioni
Il sistema di login e registrazione prevede una validazione stringente server-side e l'adozione di sessioni sicure salvate nella tabella `user_sessions`, persistite sul client tramite cookie configurati con flag `HttpOnly` e `SameSite`. Il flusso di login supporta l'autenticazione a due fattori (MFA) tramite l'invio di un codice OTP temporaneo via email.

#### 2. Navigazione Dinamica e Normalizzazione dei Dati
Il front-end non comunica mai direttamente con i servizi esterni. Quando un utente clicca sulla card di un elemento all'interno di un carosello (`ItemCarousel.vue`), viene indirizzato verso una rotta dinamica specifica in base alla tipologia di contenuto (es. `/books/[id]`, `/manga/[id]`, ecc.). La pagina effettua una richiesta alla server route di Nuxt (es. `/api/books/[id]`), la quale si occupa di interrogare l'API esterna di riferimento o il database interno. 
La server route normalizza il payload di risposta traducendolo in un oggetto comune standardizzato contenente campi universali quali `id`, `type`, `source`, `title`, `authors`, `coverUrl` e lo stato d'acquisto o salvataggio dell'utente. Al primo accesso a un'opera proveniente da un provider esterno, il backend esegue un'operazione di `upsert` sulla tabella `catalog_items` (utilizzando una chiave unica composta da tipo, sorgente e id esterno), salvando le traduzioni testuali in `catalog_item_translations` e le immagini in `item_media`.

#### 3. Integrazione dei Fornitori API Esterni
La piattaforma sfrutta un'ampia gamma di API di terze parti, gestite centralmente tramite proxy server-side:
- **Libri**: Sfrutta *Open Library* per la ricerca di metadati generici e copertine mediante restrizioni di User-Agent; *Google Books* per arricchire le schede descrittive e mostrare i blocchi di anteprima ufficiali; *Gutendex* per attingere ai testi integrali dei classici in pubblico dominio.
- **Manga**: Combina *Jikan* e *AniList* per estrarre valutazioni, grafici di popolarità, tag e raccomandazioni; si connette alle API di *MangaDex* per mappare l'albero dei capitoli e recuperare le immagini delle pagine dai nodi CDN tramite protocollo @Home.
- **News**: Si appoggia a *The Guardian Open Platform* per caricare gli articoli, i sommari e i testi completi di natura giornalistica, e a *GDELT* per l'aggregazione di macro-trend geopolitici e informativi.

#### 4. Strategie di Caching, Rate Limiting e Gestione CDN
Per proteggere i servizi upstream da picchi di traffico ed evitare blocchi dovuti ai limiti di richieste (429 Too Many Requests), viene interposto un layer di caching basato su Redis. I tempi di vita dei dati (TTL) sono differenziati: 1 ora per i risultati di ricerca, 24 ore per le schede di dettaglio delle risorse e 30 minuti per le notizie giornalistiche. I canali di comunicazione applicano un rate-limiter centralizzato (es. Bottleneck) impostato su un serbatoio di 60 richieste al minuto e un tempo minimo di intervallo di circa 334ms. Sul client, per la visualizzazione di capitoli manga corposi o sequenze di immagini, viene categoricamente evitato il caricamento simultaneo (es. tramite `Promise.all`), preferendo tecniche di lazy loading e virtual scrolling per prevenire timeout di rete o blocchi da parte dei CDN.

### Meccanismi di Archiviazione e Formati dei Contenuti

Le opere fruibili sulla piattaforma si dividono in "Esterne" (aggregate in tempo reale dalle API) e "Interne" (caricate nativamente dagli autori autorizzati). Gli asset fisici sono stoccati all'interno della directory `assets` organizzata con sotto-cartelle univoche per ogni risorsa, impiegando logiche di memorizzazione ottimizzate a seconda del tipo di contenuto:
- **Libri**: Il contenuto testuale viene salvato in file di testo dedicati, isolati per lingua, strutturati mediante un linguaggio di markup leggero ispirato ad HTML. Vengono impiegati tag semantici come `<h1>`, `<h2>` e `<h3>` per la titolazione e le annotazioni, `<img src="..." size="...">` per referenziare immagini collocate nella stessa cartella dell'opera, e tag custom come `<pageEnd>` per indicare esplicitamente al lettore l'interruzione della pagina corrente e il passaggio alla successiva.
- **Fumetti (Comics)**: Le opere vengono strutturate e indicizzate all'interno di volumi appartenenti a edizioni sequenziali stabili (es. edizioni dedicate a singole collane). Al posto del testo, la cartella contiene immagini numerate in ordine progressivo per pagina.
- **Manga**: Seguono una logica simile ai fumetti ma l'architettura dei media prevede la scomposizione obbligatoria in capitoli. Per mitigare il consumo di spazio sul server, le immagini interne dei manga – tipicamente in bianco e nero – possono essere archiviate in formato bitmap ottimizzato.
- **Giornali e News**: Vengono registrati nel database come archivi storici. Ciascun record viene indicizzato per titolo, editore, data di pubblicazione ed argomenti trattati, preservando l'impaginazione originale tramite immagini o formati nativi di reperimento.

### Funzionalità Sociali e Interazione Utente

L'esperienza di lettura su AgarthaRead include strumenti per personalizzare la propria libreria e interagire con la community:
- **Gestione delle Liste e Preferenze**: Ogni utente dispone di liste di sistema generate automaticamente all'attivazione dell'account, quali `Preferiti` e `Da leggere`. È possibile creare fino a un massimo di 50 liste personalizzate, contenenti fino a 1000 elementi ciascuna, con tag descrittivi di massimo 20 caratteri. La privacy delle liste eredita un'impostazione globale definita nel profilo utente (`lists_public_by_default`), ma può essere sovrascritta per ogni singola lista.
- **Logica dei Like e Commenti Condizionati**: L'inserimento di un like (gestito con logica idempotente tramite toggle) aggiunge in automatico l'opera all'interno della lista di sistema "Preferiti". Tuttavia, per evitare recensioni fasulle o pratiche di spam, gli utenti possono inserire valutazioni, commenti o like solo dopo aver effettivamente letto una percentuale minima configurabile dell'opera (soglia di default fissata al 10% tramite il monitoraggio in tempo reale della tabella `reading_progress`). I nuovi commenti vengono distribuiti istantaneamente a tutti gli utenti sintonizzati sulla stessa pagina grazie al broadcast del server Socket.IO.
- **Sottolineature (Highlights)**: Gli utenti possono selezionare stringhe di testo all'interno di libri e giornali per evidenziare i passaggi più importanti, memorizzando i relativi punti di inizio e fine (`locator_start`/`locator_end`) ed associando eventuali note personali a margine.

### Transazioni Critiche e Flusso di Checkout

Tutte le operazioni finanziarie o di modifica critica dei dati avvengono sotto la protezione di transazioni ACID a livello di database per prevenire condizioni di corsa (race conditions) o corruzioni. Durante la fase di acquisto e checkout di un'opera a pagamento, il backend esegue un lock pessimistico sulla riga della licenza dell'item interessato utilizzando l'istruzione `FOR UPDATE`. Questo garantisce che la disponibilità delle copie e lo stato della transazione con il provider di pagamento (Stripe o simulato) siano sincronizzati atomicamente, applicando un rollback completo e immediato dello stato in caso di errore di rete o fallimento della transazione.

---

## Struttura del Database (Diagramma ER)

Di seguito viene documentata la struttura dettagliata del database relazionale coerente con i requisiti e i modelli del progetto:

### 1. Utenti e Preferenze
#### users
- `id` (PK, int)
- `email` (string, UNIQUE)
- `username` (string, UNIQUE)
- `password_hash` (string, NULL)
- `full_name` (string)
- `bio` (text, NULL)
- `role` (enum: user, unconfirmed, artist, manager, admin, editor)
- `country_code` (char(2))
- `birth_date` (date)
- `avatar_dir` (string, default `1.png`)
- `email_verified_at` (datetime, NULL)
- `two_factor_method` (enum: none, email, totp)
- `totp_secret` (string, NULL)
- `totp_enabled_at` (datetime, NULL)
- `created_at` (datetime)
- `updated_at` (datetime, auto-update)

#### user_languages
- `user_id` (FK -> users.id)
- `language_code` (string)
- *PK composta*: `(user_id, language_code)`

#### user_preferences
- `id` (PK, int)
- `user_id` (FK -> users.id, UNIQUE)
- `theme` (string, NULL)
- `font_size` (int, NULL)
- `image_size` (string, default `medium`)
- `ui_language` (string, NULL)
- `account_public` (bool/int, default 1)
- `lists_public_by_default` (bool/int, default 0)
- `updated_at` (datetime, auto-update)

#### user_sessions
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `session_token` (string, UNIQUE)
- `ip` (string)
- `user_agent` (string)
- `device_label` (string, NULL)
- `expires_at` (datetime)
- `created_at` (datetime)

#### auth_challenges
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `purpose` (enum: login, password_reset, email_verify, account_delete)
- `channel` (enum: email, totp)
- `challenge_token_hash` (string, UNIQUE)
- `otp_code_hash` (string, NULL)
- `attempts` (int, default 0)
- `expires_at` (datetime)
- `consumed_at` (datetime, NULL)
- `created_at` (datetime)

### 2. Gestione Ruoli e Richieste
#### manager_permissions
- `user_id` (FK -> users.id)
- `permission_code` (string)
- `granted_at` (datetime)
- `granted_by` (int, NULL)
- *PK composta*: `(user_id, permission_code)`

#### artist_requests
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `status` (enum: pending, approved, rejected)
- `message` (text, NULL)
- `processed_by` (int, NULL)
- `processed_at` (datetime, NULL)
- `created_at` (datetime)

### 3. Catalogo e Contenuti
#### publishers
- `id` (PK, int)
- `name` (string, UNIQUE)

#### catalog_items
- `id` (PK, int)
- `type` (enum: book, comic, manga, newspaper)
- `fulfillment_type` (enum: digital, physical, default digital)
- `publisher_id` (FK -> publishers.id, NULL)
- `age_rating_min` (int, default 0)
- `release_date` (date, NULL)
- `price` (decimal)
- `currency` (char(3), default `EUR`)
- `isbn` (string, NULL)
- `source` (enum: internal, api)
- `search_provider` (string, NULL)
- `search_id` (string, NULL)
- `content_provider` (string, NULL)
- `content_id` (string, NULL)
- `avg_rating` (decimal, NULL)
- `views_count` (int, default 0)
- `created_at` (datetime)
- `updated_at` (datetime, auto-update)

#### catalog_item_translations
- `id` (PK, bigint)
- `item_id` (FK -> catalog_items.id)
- `language_code` (string)
- `title` (string)
- `description` (text, NULL)
- `content_path` (string, NULL)
- `content_format` (enum: txt, html_like, markdown, image_sequence)
- *UNIQUE*: `(item_id, language_code)`

#### authors
- `id` (PK, int)
- `full_name` (string)
- `role` (string)

#### item_authors
- `item_id` (FK -> catalog_items.id)
- `author_id` (FK -> authors.id)
- *PK composta*: `(item_id, author_id)`

#### categories
- `id` (PK, int)
- `name` (string, UNIQUE)

#### item_categories
- `item_id` (FK -> catalog_items.id)
- `category_id` (FK -> categories.id)
- *PK composta*: `(item_id, category_id)`

### 4. Serie e Media
#### series
- `id` (PK, int)
- `name` (string)
- `type` (enum: comic, manga)

#### series_entries
- `id` (PK, bigint)
- `series_id` (FK -> series.id)
- `item_id` (FK -> catalog_items.id)
- `volume_no` (decimal, NULL)
- `chapter_no` (int, NULL)
- `entry_order` (int)
- *UNIQUE*: `(series_id, item_id)` e `(series_id, entry_order)`

#### item_media
- `id` (PK, bigint)
- `item_id` (FK -> catalog_items.id)
- `language_code` (string, NULL)
- `media_type` (enum: cover, page, image)
- `storage_path` (string)
- `mime_type` (string)
- `sort_order` (int, default 0)

### 5. Liste, Biblioteca e Interazione
#### user_lists
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `name` (string)
- `description` (text, NULL)
- `cover_image` (string, NULL)
- `is_public` (bool/int, default 0)
- `tags` (string, NULL)
- `is_system` (bool/int, default 0)
- `created_at` (datetime)
- `updated_at` (datetime, auto-update)
- *UNIQUE*: `(user_id, name)`

#### user_list_items
- `id` (PK, bigint)
- `list_id` (FK -> user_lists.id)
- `item_id` (FK -> catalog_items.id)
- `position` (int, default 0)
- `added_at` (datetime)
- *UNIQUE*: `(list_id, item_id)`

#### library_items
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `item_id` (FK -> catalog_items.id)
- `source` (enum: saved, purchased)
- `added_at` (datetime)
- *UNIQUE*: `(user_id, item_id, source)`

#### comments
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `item_id` (FK -> catalog_items.id)
- `parent_id` (FK -> comments.id, NULL)
- `text` (text)
- `holds_until` (datetime, NULL)
- `created_at` (datetime)
- `updated_at` (datetime, auto-update)

#### item_likes
- `user_id` (FK -> users.id)
- `item_id` (FK -> catalog_items.id)
- `created_at` (datetime)
- *PK composta*: `(user_id, item_id)`

#### highlights
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `item_id` (FK -> catalog_items.id)
- `language_code` (string)
- `locator_start` (string)
- `locator_end` (string)
- `selected_text` (text)
- `note` (text, NULL)
- `created_at` (datetime)

#### reading_progress
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `item_id` (FK -> catalog_items.id)
- `language_code` (string)
- `locator` (string)
- `percentage` (decimal)
- `last_read_at` (datetime)
- *UNIQUE*: `(user_id, item_id)`

### 6. Ordini e Pagamenti
#### orders
- `id` (PK, bigint)
- `user_id` (FK -> users.id)
- `status` (enum: pending, paid, failed, cancelled)
- `total_amount` (decimal)
- `created_at` (datetime)

#### order_items
- `id` (PK, bigint)
- `order_id` (FK -> orders.id)
- `item_id` (FK -> catalog_items.id)
- `unit_price` (decimal)
- `quantity` (int, default 1)

#### payments
- `id` (PK, bigint)
- `order_id` (FK -> orders.id)
- `provider` (enum: stripe, simulated)
- `provider_tx_id` (string, NULL)
- `status` (enum: pending, succeeded, failed)
- `paid_at` (datetime, NULL)

#### item_licenses
- `item_id` (PK + FK -> catalog_items.id)
- `available_copies` (int)
- `updated_at` (datetime, auto-update)

---

## Prima installazione

Questa è la sequenza da seguire quando scarichi il progetto per la prima volta.

### 1. Requisiti

Assicurati di avere installato:

- Node.js `^20.19.0 || >=22.12.0` (La versione consigliata è Node.js 22.14.0).
- Docker Engine + Docker Compose se usi Linux, oppure Docker Desktop se usi Windows.

Verifica tutto con:

```bash
node -v
npm -v
docker --version
docker compose version