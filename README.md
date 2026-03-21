# Hanouti - Smart Inventory & POS System

## Overview
Hanouti is a modern, AI-powered inventory management and Point of Sale (POS) system designed for retail businesses.

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript + Vite + MUI
- **Database**: PostgreSQL
- **Deployment**: Docker

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.10+)

### Setup

1. **Database**:
   ```bash
   docker compose up -d
   ```

2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
