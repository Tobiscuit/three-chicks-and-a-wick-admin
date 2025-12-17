# Three Chicks and a Wick - Admin Panel

![Project Status](https://img.shields.io/badge/status-production-green)
![Tech Stack](https://img.shields.io/badge/stack-Next.js_15_|_Firebase_|_Shopify_GraphQL-blue)
![AI Powered](https://img.shields.io/badge/AI-Gemini_2.5_Flash-purple)

## 🚀 Project Overview

A high-performance, full-stack administrative dashboard built to manage a headless Shopify storefront. This application serves as the central command center for "Three Chicks and a Wick," bridging the gap between raw e-commerce data and actionable business intelligence.

Beyond standard CRUD operations, this platform features a suite of **Generative AI tools** that automate product photography, description writing, and business strategy analysis, effectively replacing the need for a dedicated creative team.

## ✨ Key Features

### 📸 AI Image Studio ("Nano Banana Pro" Workflow)
A proprietary multi-shot synthesis engine that generates professional product photography from raw inputs.
*   **Multi-Angle Ingestion**: Accepts two distinct camera angles to understand 3D geometry.
*   **Scale-Agnostic Generation**: Generates a context-aware background *first* to ensure correct relative scale.
*   **Context Injection**: Weaves user-defined elements (e.g., "blueberries") into the scene naturally.
*   **Instant Analysis**: Feeds the generated image directly into the Persona Engine for immediate description generation.

### ✍️ "The Creator" Persona Engine
Automates high-converting product descriptions by adopting a specific brand voice.
*   **Archetype**: A custom "Creator + Jester" blend—warm, vibrant, and sophisticated.
*   **Logic**: Applies principles of "Immediacy" and "Potency" to strip away marketing fluff, delivering structured HTML ready for publishing.

### 🪄 Magic Request System
A specialized module for handling custom candle orders with complex validation logic.
*   **Tech**: Multi-step workflow with real-time **Zod** schema validation.
*   **Impact**: Streamlines communication between customer requests and manufacturing.

### 🤖 AI Business Strategist
Ingests real-time sales data to generate actionable advice on Pricing, Marketing, and Inventory.
*   **Innovation**: Flattens complex GraphQL data into a clean JSON structure for high-accuracy AI analysis.

### ⚡ Dual-Layer Caching Architecture
A sophisticated caching system to optimize AI costs and performance.
*   **Layer 1 (Local)**: `localStorage` for instant (<50ms) access.
*   **Layer 2 (Cloud)**: AWS AppSync + DynamoDB for cross-device synchronization.

## 🛠️ Technology Stack

*   **Framework**: Next.js 15 (App Router), React, TypeScript
*   **Styling**: Tailwind CSS, Shadcn UI
*   **Backend**: Firebase (Auth & Admin SDK), AWS AppSync, DynamoDB
*   **Commerce**: Shopify Admin API (GraphQL)
*   **AI**: Google Genkit, Gemini 1.5 Flash / 2.5 Pro
*   **Visualization**: Recharts
*   **Editor**: Tiptap (Headless)

## 🐛 Known Issues

*   **Rich Text Editor Serialization**: The Tiptap editor currently has a serialization issue where specific legacy HTML structures may be stripped or saved as plain text. This is due to an aggressive parsing logic in the custom "Adapter Pattern" used to handle legacy descriptions. A fix involving refined regex parsing and `@tailwindcss/typography` integration is in progress.

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/threechicksandawick-admin.git
    cd threechicksandawick-admin
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with the following keys:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    FIREBASE_PROJECT_ID=...
    SHOPIFY_ADMIN_ACCESS_TOKEN=...
    GOOGLE_GENAI_API_KEY=...
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 📄 License

Private proprietary software. All rights reserved.
