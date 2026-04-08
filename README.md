# AgarthaRead

## Prerequisiti

Prima di fare `git pull` o di avviare il progetto, assicurati di avere installato:

- Node.js 22.14.0, oppure una versione compatibile con Nuxt 4 (`^20.19.0 || >=22.12.0`)
- Docker Desktop su Windows, oppure Docker Engine + Docker Compose se usi Linux

### Installare Docker su Windows

Se sei su Windows, la strada più semplice è installare Docker Desktop. Puoi farlo in uno di questi modi:

- Scaricandolo dal sito ufficiale:

https://www.docker.com/products/docker-desktop/

- Oppure con `winget`:

```bash
winget install -e --id Docker.DockerDesktop
```

Dopo l'installazione, avvia Docker Desktop e aspetta che finisca l'inizializzazione iniziale. Se richiesto, abilita WSL2 e riavvia il PC.

Per controllare che sia tutto pronto, apri un terminale e verifica:

```bash
docker --version
docker compose version
```

Il repository contiene già il file `docker-compose.yml`, quindi non devi creare Docker da zero: devi solo avere Docker installato e avviato sul sistema.

## Dopo un `git pull`

Segui questi passaggi prima di avviare il progetto in locale:

1. Usa Node.js 22.14.0, oppure comunque una versione compatibile con Nuxt 4 (`^20.19.0 || >=22.12.0`). Se usi `nvm`, esegui:

```bash
nvm use 22.14.0
```

2. Avvia il database MySQL con Docker dalla root del repository:

```bash
docker compose up -d mysql
```

3. Entra nell'app web e installa le dipendenze:

```bash
cd apps/web
npm install
```

4. Crea il file `apps/web/.env` con la stringa di connessione del database. Per il setup locale predefinito del `docker-compose.yml`, puoi usare:

```bash
DATABASE_URL=mysql://dev_user:dev_password@localhost:3306/agartharead
```

5. Avvia l'app web:

```bash
npm run dev
```

## Note rapide

- Il comando `npm install` in `apps/web` esegue `nuxt prepare` come postinstall, quindi fallisce se stai usando Node 18.
- Se Docker non è ancora avviato, il frontend può partire ma le API che dipendono dal database non funzioneranno correttamente.