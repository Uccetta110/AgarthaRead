# AgarthaRead

## Prima installazione

Questa è la sequenza da seguire quando scarichi il progetto per la prima volta.

### 1. Requisiti

Assicurati di avere installato:

- Node.js `^20.19.0 || >=22.12.0`  
	La versione consigliata è Node.js 22.14.0.
- Docker Engine + Docker Compose se usi Linux, oppure Docker Desktop se usi Windows.

Verifica tutto con:

```bash
node -v
npm -v
docker --version
docker compose version
```

Se usi `nvm`, puoi passare alla versione consigliata con:

```bash
nvm use 22.14.0
```

### 2. Avvia il database MySQL

Dalla root del repository avvia il container del database:

```bash
docker compose up -d mysql
```

Se vuoi controllare che sia pronto:

```bash
docker compose ps
```

### 3. Inizializza lo schema del database

Importa lo schema SQL già presente nel repository:

```bash
docker compose exec -T mysql mysql -u root -proot_dev agartharead < apps/web/server/db/schema/schema.sql
```

Per verificare che le tabelle siano state create:

```bash
docker compose exec mysql mysql -u dev_user -pdev_password -Dagartharead -e "SHOW TABLES;"
```

### 4. Configura l'app web

Entra nella cartella dell'app e installa le dipendenze:

```bash
cd apps/web
npm install
```

Crea il file `apps/web/.env.local` con la stringa di connessione del database:

```bash
DATABASE_URL=mysql://dev_user:dev_password@localhost:3306/agartharead
```

Se vuoi crearlo con un comando unico:

```bash
printf 'DATABASE_URL=mysql://dev_user:dev_password@localhost:3306/agartharead\n' > .env.local
```

### 5. Avvia il frontend

Sempre da `apps/web` avvia Nuxt:

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`.

### 6. Seed opzionali

Se ti serve un utente amministratore di test, puoi eseguire il seed dedicato da `apps/web` dopo aver impostato `DATABASE_URL`:

```bash
npm run db:seed:admin
```

Se vuoi assegnare ruoli o permessi esistenti, puoi usare anche:

```bash
npm run db:seed:permissions
```

## Comandi utili

Vedere i log del database:

```bash
docker compose logs mysql
```

Vedere i dati di una tabella:

```bash
docker compose exec mysql mysql -udev_user -pdev_password -Dagartharead -e "SELECT * FROM agartharead.nome_tabella;"
```

Eliminare tutti i dati di una tabella:

```bash
docker compose exec mysql mysql -udev_user -pdev_password -Dagartharead -e "DELETE FROM agartharead.nome_tabella;"
```

Aggiornare i dati di una tabella:

```bash
docker compose exec mysql mysql -udev_user -pdev_password -Dagartharead -e "UPDATE agartharead.nome_tabella SET colonna='nuovo_valore' WHERE condizione;"
```

