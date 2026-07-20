# Herman AI

**AI Operating System** — A full-stack AI-powered assistant platform with multi-provider LLM support, agent capabilities, tool calling, RAG (Retrieval-Augmented Generation), memory, and cross-platform clients (Android, iOS, Web, Admin).

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile / Web** | React Native (Expo), TypeScript, Zustand, TanStack Query |
| **Backend** | Python 3.13+, FastAPI, Uvicorn, SQLAlchemy (async) |
| **Database** | MySQL 8.0 (production), SQLite (development) |
| **Cache / Queue** | Redis, Celery |
| **Vector DB** | Qdrant (RAG / embeddings) |
| **AI Providers** | DeepSeek, OpenAI, Anthropic, Gemini (pluggable) |
| **Container** | Docker Compose |

## Project Structure

```
herman-ai/
├── apps/                  # Expo (React Native) clients
│   ├── mobile/            #   Android & iOS
│   ├── web/               #   Web app
│   └── admin/             #   Admin dashboard
├── packages/              # Shared monorepo libraries
│   ├── shared/            #   Types, constants, validators
│   ├── ui/                #   Shared UI components
│   ├── ai/                #   AI provider abstraction
│   └── core/              #   Business logic
├── services/
│   └── backend/           # FastAPI backend
│       ├── app/
│       │   ├── api/       #   Route handlers (REST + WebSocket)
│       │   ├── core/      #   Agent, AI, tools, RAG, memory, auth
│       │   ├── models/    #   SQLAlchemy models
│       │   └── schemas/   #   Pydantic schemas
│       └── alembic/       # Database migrations
├── infra/docker/          # Dockerfiles & config
└── docker-compose.yml     # Service orchestration
```

## Instalasi

### Prasyarat

- **Python** 3.13+
- **Node.js** 20+
- **Docker** & **Docker Compose** (opsional, untuk MySQL/Redis/Qdrant)
- **Expo CLI** (untuk develop mobile): `npm install -g expo-cli`

### 1. Clone & Setup Environment

```bash
git clone https://github.com/muhammadroyyan11/herman-ai-apps.git
cd herman-ai-apps
cp .env.example .env
# Isi API key dan konfigurasi di .env
```

### 2. Backend

```bash
cd services/backend
python3 -m venv venv
source venv/bin/activate  # atau `venv\Scripts\activate` di Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt  # untuk development
```

### 3. Database & Services (Docker)

```bash
docker compose up -d      # MySQL, Redis, Qdrant
npm run db:migrate        # Migrasi database
npm run db:seed           # Seed data awal
```

### 4. Jalankan Backend

```bash
npm run backend
# atau manual:
cd services/backend && source venv/bin/activate && uvicorn app.main:app --reload --port 9876
```

Backend akan berjalan di `http://localhost:9876`.

### 5. Jalankan Mobile / Web

```bash
npm install               # Install dependencies monorepo
npm run mobile            # Expo (Android/iOS)
npm run web               # Web app
npm run admin             # Admin dashboard
```

## Scripts Penting

| Perintah | Deskripsi |
|---|---|
| `npm run mobile` | Start Expo mobile app |
| `npm run mobile:android` | Start Expo untuk Android |
| `npm run mobile:ios` | Start Expo untuk iOS |
| `npm run web` | Start web app |
| `npm run backend` | Start FastAPI backend (port 9876) |
| `npm run docker:up` | Start semua services Docker |
| `npm run db:migrate` | Jalankan migrasi database |
| `npm run db:seed` | Seed database |
| `npm run lint` | Lint TypeScript |
| `npm run typecheck` | Type checking |

## Fitur Utama

- **Multi-Provider AI**: DeepSeek, OpenAI, Anthropic, Gemini — switch kapan saja
- **Agent Tools**: Web search, kalkulator, cuaca, konversi mata uang, ekstrak URL, SSH server, file editor, query database
- **RAG (Retrieval-Augmented Generation)**: Upload dokumen (PDF, DOCX, TXT, images), tanya isinya secara kontekstual
- **Memory**: Percakapan per-workspace dengan konteks berkelanjutan
- **Multi-Platform**: Android, iOS, Web, Admin — real-time via WebSocket
- **Workspaces**: Pisahkan konteks percakapan & tools per ruang kerja
- **Auth**: JWT + OAuth (Google/GitHub) + guest mode
