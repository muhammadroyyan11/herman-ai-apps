# Herman AI Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Android   │  │   iOS    │  │   Web    │  │  Admin   │   │
│  │ (Expo/RN) │  │ (Expo/RN)│  │(RN Web)  │  │(RN Web)  │   │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│        │             │             │             │          │
│        └─────────────┴─────────────┴─────────────┘          │
│                       HTTP/WS                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   API GATEWAY (Nginx)                        │
│              Rate Limiting | CORS | SSL                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API LAYER                          │   │
│  │  Auth ─ Chat ─ Agent ─ Tools ─ RAG ─ Memory ─ Admin  │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │                   CORE LAYER                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │AI Engine │ │  Agent   │ │  Tool    │ │Memory  │ │   │
│  │  │(Provider)│ │  Loop    │ │ Registry │ │ Store  │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │   RAG    │ │ Security │ │  Search  │ │Storage │ │   │
│  │  │  Engine  │ │   Auth   │ │  Engine  │ │Manager │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   DATA LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   MySQL  │  │   Redis  │  │  Qdrant  │  │   S3     │   │
│  │ (Primary)│  │ (Cache)  │  │ (Vector) │  │ (Files)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Multi-Provider AI Architecture
- Abstract `AIProvider` base class with common interface
- Each provider (DeepSeek, OpenAI, Anthropic, Gemini, Ollama) implements the same interface
- Providers are selected at runtime via config/settings
- All providers support: chat completion, streaming, tool calling, embeddings

### 2. Agent Loop with Tool Calling
```
User Input → LLM → Tool Call? → Execute Tool → Feedback to LLM → Final Response
                                 ↓
                          Max 10 iterations → Force Response
```

### 3. Modular Tool Registry
- Tools are self-contained with schema, permissions, timeout
- Built-in tools: calculator, web search, weather, currency, URL extractor
- Tools can be enabled/disabled per workspace
- Each tool validates input and logs output

### 4. Cross-Platform Frontend
- Expo/React Native with shared code between Mobile and Web
- Expo Router for navigation
- Zustand for state management
- React Query for server state

### 5. Security
- JWT + OAuth for authentication
- Guest mode with local-only storage (MMKV)
- Role-based access control
- Encrypted API keys
- Rate limiting per IP
- Input validation on all endpoints

## Data Flow: Chat Request

```
1. User sends message (REST or WebSocket)
2. Message saved to MySQL (conversation + message)
3. Load conversation history (last 50 messages)
4. Load relevant memories (if logged in)
5. Create AgentEngine with provider + tools
6. Build system prompt (base + workspace + memories + RAG)
7. Execute agent loop (max 10 iterations)
   a. Send to LLM with tool definitions
   b. If tool_calls → execute → append result → goto a
   c. If no tools → return response
8. Save assistant response to MySQL
9. Stream response to client (if streaming)
```

## Directory Structure

```
herman-ai/
├── apps/
│   ├── mobile/          # Expo React Native (Android/iOS/Web)
│   ├── web/             # Web-specific (shares code via packages)
│   └── admin/           # Admin dashboard
├── packages/
│   ├── shared/          # Types, utils, constants, validators
│   ├── ui/              # Shared UI components
│   ├── ai/              # AI provider abstraction
│   └── core/            # Business logic
├── services/
│   └── backend/         # FastAPI Python backend
│       ├── app/
│       │   ├── api/     # Route handlers (v1)
│       │   ├── core/    # Business logic
│       │   ├── models/  # SQLAlchemy models
│       │   └── config/  # Settings
│       └── alembic/     # Migrations
└── infra/               # Docker, k8s, monitoring
```

## Future Extensions
- Plugin Marketplace (MCP support)
- Desktop apps (Electron/Tauri)
- Wear OS / Android Auto / Apple Watch
- Voice wake word
- Smart home / IoT integration
- Offline AI support (local LLM via Ollama/Ollama)
- Team/Organization workspaces
- AI workflow builder & automation engine
