# Compliance Chatbot

Enterprise-grade AI Compliance Chatbot using RAG (Retrieval-Augmented Generation) architecture.

## 🏦 Overview

This chatbot is designed to help compliance officers verify whether documents or queries comply with banking and regulatory policies, specifically:

- **Regulatory** requirements and circulars
- **Internal** compliance policies
- **Industry guidelines** and best practices

### Key Features

- ✅ **Document Upload & Processing**: Upload PDF, DOCX, TXT files for compliance analysis
- ✅ **RAG-based Analysis**: Retrieves relevant policy clauses from the knowledge base
- ✅ **Structured Responses**: Compliance status, analysis, violations, and recommendations
- ✅ **Citation Support**: Always cites specific clauses from the knowledge base
- ✅ **Audit Trail**: Logs all compliance queries for audit purposes
- ✅ **Professional UI**: Modern interface designed for compliance officers

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Metadata Database**: PostgreSQL 16
- **Vector Database**: Milvus 2.4 (with Minio for object storage, etcd for metadata)
- **ORM**: SQLAlchemy with async support
- **Migrations**: Alembic
- **LLM**: Google Gemini 2.5 Flash
- **Embeddings**: Google Gemini text-embedding-004 (768 dimensions)

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (for Milvus stack: Milvus, Minio, etcd)
- Google Cloud account with Gemini API access

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd compliance-chatbot
```

### 2. Infrastructure Setup (Docker)

Start all infrastructure services:
```bash
docker-compose up -d db etcd minio milvus
```

This starts:
- **PostgreSQL**: Metadata storage (port 5432)
- **etcd**: Milvus metadata store
- **MinIO**: Object storage for Milvus (ports 9000, 9001)
- **Milvus**: Vector database (port 19530)

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🐳 Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── compliance.py # Compliance endpoints
│   │   │   ├── documents.py  # Document management
│   │   │   └── health.py     # Health check
│   │   ├── core/             # Configuration
│   │   ├── db/               # Database models & session
│   │   ├── services/
│   │   │   ├── rag/          # RAG engine
│   │   │   │   ├── chunker.py
│   │   │   │   ├── document_processor.py
│   │   │   │   ├── embeddings.py
│   │   │   │   ├── engine.py
│   │   │   │   └── vector_store.py
│   │   │   └── compliance/   # Compliance analyzer
│   │   └── schemas/          # Pydantic schemas
│   ├── alembic/              # Database migrations
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities & API client
│   │   └── types/            # TypeScript types
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 🔒 Compliance Response Format

Every compliance response follows this structure:

```
1. Compliance Status
   - COMPLIANT / PARTIALLY COMPLIANT / NON-COMPLIANT / INSUFFICIENT INFORMATION

2. Summary (2-3 lines)

3. Compliance Analysis
   - Bullet points with specific clause references
   - Document name + section number

4. Violations (if applicable)
   - WHAT is violated
   - WHY it is a violation
   - WHICH clause is violated

5. Recommendations
   - Concrete steps to become compliant

6. Disclaimer
```

## 🛡️ Guardrails

The system enforces strict guardrails:

- ❌ Never hallucinate compliance rules
- ❌ Never fabricate SBP or HBL policies
- ❌ Never provide legal advice beyond compliance interpretation
- ✅ Always cite specific clauses from the knowledge base
- ✅ SBP policy always overrides internal policy
- ✅ Confidence < 90% results in "INSUFFICIENT INFORMATION"

## 📊 API Endpoints

### Documents
- `POST /api/v1/documents/upload` - Upload a document
- `GET /api/v1/documents` - List all documents
- `GET /api/v1/documents/{id}` - Get document details
- `DELETE /api/v1/documents/{id}` - Delete a document

### Compliance
- `POST /api/v1/compliance/analyze` - Analyze a compliance query
- `POST /api/v1/compliance/check-document/{id}` - Check document compliance
- `POST /api/v1/compliance/chat` - Interactive compliance chat
- `POST /api/v1/compliance/search` - Search knowledge base
- `GET /api/v1/compliance/history` - Get query history

### Health
- `GET /health` - Health check

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `GEMINI_MODEL` | Gemini model name | gemini-2.5-flash-preview-05-20 |
| `GEMINI_EMBEDDING_MODEL` | Gemini embedding model | text-embedding-004 |
| `MILVUS_HOST` | Milvus server host | localhost |
| `MILVUS_PORT` | Milvus server port | 19530 |
| `MILVUS_COLLECTION_NAME` | Milvus collection name | hbl_compliance_docs |
| `EMBEDDING_DIMENSION` | Embedding vector dimension | 768 |
| `CHUNK_SIZE` | Token chunk size | 400 |
| `TOP_K_RESULTS` | Number of retrieval results | 5 |
| `CONFIDENCE_THRESHOLD` | Minimum confidence | 0.9 |

## 📝 License

Proprietary - HBL Bank Pakistan

## 🤝 Support

For support, contact the HBL IT Compliance Team.
