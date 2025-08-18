# Deployment Guide - Dinnerduty på Render

## Forberedelse før deployment

### 1. Opret en Neon Database (hvis du ikke allerede har en)
- Gå til [neon.tech](https://neon.tech) og opret en konto
- Opret en ny database
- Kopiér din `DATABASE_URL` connection string

### 2. Push din kode til GitHub
- Opret et nyt repository på GitHub
- Push hele Dinnerduty projektet til GitHub

## Deployment på Render

### 1. Opret Render konto
- Gå til [render.com](https://render.com) og opret en konto
- Tilslut din GitHub konto

### 2. Opret ny Web Service
1. Klik på "New +" → "Web Service"
2. Vælg dit GitHub repository med Dinnerduty
3. Udfyld følgende indstillinger:

**Basic indstillinger:**
- **Name**: `dinnerduty` (eller dit ønskede navn)
- **Environment**: `Node`
- **Region**: `Frankfurt` (nærmest Danmark)
- **Branch**: `main`

**Build & Deploy indstillinger:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Tilføj miljøvariabler
I "Environment" sektionen, tilføj:
- **NODE_ENV**: `production`
- **DATABASE_URL**: Din Neon database connection string

### 4. Deploy
- Klik "Create Web Service"
- Render vil automatisk bygge og deploye din app
- Det tager typisk 2-5 minutter

## Efter deployment

### Database setup
Din app vil automatisk oprette de nødvendige tabeller når den starter første gang.

### Custom domain (valgfrit)
- I Render dashboard kan du tilføje et custom domain
- Render giver dig automatisk HTTPS

## Monitoring
- Render giver dig logs og metrics i dashboardet
- Du kan se real-time logs under "Logs" tab

## Kosten
- **Free tier**: 750 timer om måneden (tilstrækkeligt til mindre projekter)
- **Starter tier**: $7/måned for ubegrænset uptime
- Database hosting på Neon er gratis op til 512MB

## Support
Hvis du løber ind i problemer:
1. Tjek logs i Render dashboard
2. Verificer at alle miljøvariabler er sat korrekt
3. Kontroller at din GitHub repository er opdateret

Din app vil være tilgængelig på: `https://dinnerduty.onrender.com` (eller dit valgte navn)