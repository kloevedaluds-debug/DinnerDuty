# Dinnerduty - Danish Household Dinner Task Manager

En dansk app til koordinering af aftensmads opgaver i fælles boligområder.

## Funktioner

- 🍽️ **Dagens ret registrering** - Kokken kan registrere hvilken ret der laves
- 👥 **Opgave tildeling** - Tildel Kok, Indkøb, Dække bord, og Vaske op
- 📝 **Indkøbsliste** - Kokken kan forberede indkøbsliste for indkøberen
- 👤 **Køkken præferencer** - Mulighed for at reservere køkkenet
- 📅 **Ugeoversigt** - Se hele ugens opgave fordeling
- ⚠️ **Påmindelser** - Automatiske påmindelser om opvask for alle der spiser med

## Teknisk stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Neon Database)
- **Styling**: Tailwind CSS + shadcn/ui
- **Hosting**: Optimeret til Render deployment

## Lokal udvikling

```bash
# Installer dependencies
npm install

# Start development server
npm run dev

# Besøg http://localhost:5000
```

## Production deployment

Se [DEPLOYMENT.md](./DEPLOYMENT.md) for detaljeret guide til deployment på Render.

## Miljøvariabler

Kopiér `.env.example` til `.env` og udfyld:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
```

## Licens

MIT License - Se licens fil for detaljer.