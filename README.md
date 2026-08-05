<div align="center">

# 🍽️ AIVORA Frontend

### AI-Powered Voice Restaurant Ordering Interface

*An intelligent customer-facing web application that enables natural voice conversations with an AI waiter for a seamless private dining experience.*

<br>

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![OpenAI](https://img.shields.io/badge/OpenAI-Realtime-412991?style=for-the-badge)

</div>

---

# 📖 Overview

AIVORA Frontend is the customer-facing application for an AI-powered restaurant ordering system.

Customers can naturally speak with an AI waiter using their microphone, receive voice responses in real time, and watch their order update live throughout the conversation.

The application communicates securely with the AIVORA Backend, which manages AI requests and authentication with OpenAI.

---

# ✨ Features

- 🎤 Voice-first restaurant ordering
- 🤖 AI-powered dining assistant
- 💬 Live conversation interface
- 📝 Real-time order updates
- 🔊 AI voice responses
- ⚡ OpenAI Realtime API integration
- 🎨 Modern responsive UI
- 📱 Mobile-friendly design
- 🔐 Secure backend authentication
- 🚀 Fast Next.js App Router architecture

---

# 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js | React Framework |
| React | User Interface |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| OpenAI Realtime API | Voice AI |
| WebRTC | Audio Streaming |
| Fetch API | Backend Communication |

---

# 📂 Project Structure

```text
app
│
├── customer
│   └── page.tsx
│
├── layout.tsx
│
└── page.tsx
│
components
│
├── Conversation.tsx
├── Header.tsx
├── OrderSummary.tsx
├── StatusCard.tsx
└── VoiceButton.tsx
│
lib
│
├── api.ts
├── microphone.ts
├── realtime.ts
└── constants.ts
│
public
```

---

# 🎤 Voice Ordering Flow

```text
Customer

     │

     ▼

Tap Microphone

     │

     ▼

Speak Naturally

     │

     ▼

Realtime Audio Streaming

     │

     ▼

OpenAI Realtime

     │

     ▼

AI Voice Response

     │

     ▼

Live Conversation

     │

     ▼

Current Order Updated
```

---

# 🔄 Application Architecture

```text
Customer

     │

     ▼

Next.js Frontend

     │

     ▼

Express Backend

     │

     ▼

OpenAI Realtime API
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/yourusername/aivora-frontend.git
```

> Replace with your repository URL.

---

## Install Dependencies

```bash
npm install
```

---

## Start Development Server

```bash
npm run dev
```

---

## Production Build

```bash
npm run build
```

---

# ⚙️ Configuration

Update the backend API URL if required.

```ts
export const API_URL = "http://localhost:3001";
```

---

# 🎯 User Experience

The customer can:

- Tap the microphone
- Speak naturally
- Receive AI voice responses
- View conversation history
- Watch their order update in real time

Example:

> Customer

*"I'd like two Wagyu Ribeyes and one Coke."*

↓

AI

*"Certainly! I've added two Wagyu Ribeyes and one Coke. Would you like anything else today?"*

---

# 🔒 Security

The frontend never stores or exposes the OpenAI API key.

All authentication and AI communication are securely handled through the backend.

---

# 🎯 Future Improvements

- Kitchen Dashboard
- Admin Dashboard
- Table Management
- User Authentication
- Reservation Integration
- Payment Integration
- Loyalty Program
- Multi-language Support
- Restaurant Branding
- Theme Customization

---

# 👨‍💻 Author

**Mark Tamang**

Software Engineer

Portfolio

https://marktmg.com

LinkedIn

https://linkedin.com/in/marktmng

---

# 📄 License

This project is currently provided for demonstration and portfolio purposes.

---

<div align="center">

## 🍽️ AIVORA

### AI Restaurant Assistant

*Transforming restaurant experiences through intelligent voice conversations.*

</div>
