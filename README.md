# BoloSign Frontend

A modern, secure document signing application built with React and Vite.

## Features

- 📄 Upload PDF documents
- ✍️ Draw signatures using mouse or touchpad
- 📍 Place signatures anywhere on the PDF
- 📑 Apply signatures to all pages or specific pages
- 📥 Download signed documents
- 🔒 SHA-256 hash verification for document integrity

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:5000
```

For production, set this to your backend API URL.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Deployment (Vercel)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variable: `VITE_API_URL` = your backend URL
4. Deploy!

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **react-pdf** - PDF rendering
- **react-signature-canvas** - Signature drawing
- **axios** - HTTP client
