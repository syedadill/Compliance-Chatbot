# HBL Compliance Chatbot - Development Instructions

## Project Overview
Enterprise-grade AI Compliance Chatbot for HBL Bank Pakistan using RAG architecture.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, PostgreSQL with pgvector, SQLAlchemy, Alembic
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **LLM**: Google Gemini 2.5 Flash
- **Vector Store**: PostgreSQL with pgvector extension

## Project Structure
```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── db/             # Database models & sessions
│   │   ├── services/       # Business logic
│   │   │   ├── rag/        # RAG engine
│   │   │   └── compliance/ # Compliance analyzer
│   │   └── schemas/        # Pydantic schemas
│   ├── alembic/            # Database migrations
│   └── tests/              # Backend tests
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
└── docs/                  # Documentation
```

## Compliance Response Format
All compliance responses must follow this structure:
1. Compliance Status (COMPLIANT/PARTIALLY COMPLIANT/NON-COMPLIANT/INSUFFICIENT INFORMATION)
2. Summary (2-3 lines)
3. Compliance Analysis (bullet points with clause references)
4. Violations (if applicable)
5. Recommendations
6. Disclaimer

## Key Principles
- Never hallucinate compliance rules
- Always cite specific clauses from knowledge base
- SBP policy overrides internal policy in conflicts
- Prefer refusal over hallucination
- Confidence < 90% = "INSUFFICIENT INFORMATION"

## Running the Project
### Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
