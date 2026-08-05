<div align="center">

# 🚀 Snèh AI — Private, High-Speed AI Assistant

> **Your Private, Web-Connected AI Companion Powered by Sneh V3® LPU™ Hardware Speed & Zero-Retention Data Privacy.**

[![Netlify Status](https://api.netlify.com/api/v1/badges/snehaidbc/deploy-status)](https://snehaidbc.netlify.app/)
![Version](https://img.shields.io/badge/version-5.2.5-0B57CF?style=flat-square)
![PWA Ready](https://img.shields.io/badge/PWA-Installable-34c759?style=flat-square)
![Privacy](https://img.shields.io/badge/Data_Privacy-Zero_Retention-ff9500?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

[**🌐 Launch Live Web Application**](https://snehaidbc.netlify.app/) • [**✨ Features**](https://snehaidbc.netlify.app/features/) • [**🔒 Privacy Architecture**](https://snehaidbc.netlify.app/privacy/) • [**📚 Documentation**](https://snehaidbc.netlify.app/docs/)

</div>

---

## 📌 Executive Overview

**Snèh AI** (also known as **Sneh AI**) is an advanced, web-grounded artificial intelligence companion engineered by **DBC Technologies** (DBC Technologies Narwana) in collaboration with **VIDHI Projects Chandigarh**. 

Designed to prioritize user data sovereignty and real-time responsiveness, Snèh AI routes user queries through optimized **Sneh V3® Language Processing Units (LPUs)**, delivering sub-100ms response streaming latency with zero public model training on private messages.

---

## 🌟 Primary Capabilities & Key Features

- ⚡ **Sneh V3® LPU™ Hardware Acceleration**: Engineered for ultra-fast token streaming, reducing initial token wait times for real-time coding and reasoning.
- 🔒 **Zero-Retention RAM Architecture**: Conversations exist strictly in volatile server RAM during answer generation and are flushed immediately upon connection closure. Prompts are **never** used to train public LLMs.
- 🌐 **Real-Time Web Grounding**: Integrated live web search toggle enables Snèh AI to fetch up-to-date facts, documentation, and news with URL citations.
- 💻 **Developer Code Tools**: Built-in syntax highlighting, multi-language code debugging, prompt templates, and PDF export capabilities.
- 📱 **Progressive Web Application (PWA)**: Full offline-capable PWA support for Android, iOS, Windows, macOS, and Linux without requiring an app store download.
- 🌍 **Multilingual Engine**: Native support for English, Hindi, and regional language translations via interactive floating controls.

---

## 📊 Technical Architecture & Comparison

| Feature Dimension | Snèh AI | Standard Consumer AI Chatbots |
| :--- | :--- | :--- |
| **Inference Hardware** | Dedicated Sneh V3® LPU™ Accelerators | Standard Shared GPU Clusters |
| **User Message Privacy** | **Zero User Data Retention** | Retained for Model Training (Unless Opted Out) |
| **Session Processing** | Volatile RAM Buffer Session Flushing | Persistent Server Database Logging |
| **Web Search Integration** | Free Integrated Toggleable Search | Account-Gated / Subscription Tier |
| **Account Requirement** | Instant Browser / Guest Access | Mandatory Account Registration |
| **Platform Availability** | Standalone Installable PWA | Centralized Web Browser Only |

---

## 🔗 Official Platform Ecosystem Links

| Resource Node | Canonical URL | Description |
| :--- | :--- | :--- |
| **App Launcher** | [snehaidbc.netlify.app](https://snehaidbc.netlify.app/) | Official Live Application Interface |
| **Features & Tech Stack** | [/features/](https://snehaidbc.netlify.app/features/) | Complete breakdown of model hardware & tools |
| **Privacy Architecture** | [/privacy/](https://snehaidbc.netlify.app/privacy/) | Official Zero-Retention privacy policy & DPDP Act compliance |
| **Security Specifications** | [/security/](https://snehaidbc.netlify.app/security/) | Cloud infrastructure, TLS 1.3, and security policies |
| **Platform Documentation** | [/docs/](https://snehaidbc.netlify.app/docs/) | User guides, shortcuts, and model navigation |
| **PWA Installation Guide** | [/install/](https://snehaidbc.netlify.app/install/) | Step-by-step setup for iOS, Android, and Desktop |
| **Frequently Asked Questions** | [/faq/](https://snehaidbc.netlify.app/faq/) | Detailed platform answers and billing information |
| **Version History** | [/changelog/](https://snehaidbc.netlify.app/changelog/) | Active release updates and platform improvements |
| **Platform Comparison** | [/vs-chatgpt/](https://snehaidbc.netlify.app/vs-chatgpt/) | Objective comparison between Snèh AI and ChatGPT |

---

## 📲 Progressive Web App (PWA) Installation

Snèh AI can be installed directly onto your desktop or mobile device as a native standalone app:

### 🍏 iOS (iPhone / iPad)
1. Open **Safari** and visit `https://snehaidbc.netlify.app/`.
2. Tap the **Share** icon at the bottom bar.
3. Scroll down and tap **Add to Home Screen**.

### 🤖 Android (Chrome / Edge)
1. Open **Chrome** and navigate to `https://snehaidbc.netlify.app/`.
2. Tap the three dots menu in the top-right corner.
3. Select **Install App** or **Add to Home Screen**.

### 💻 Desktop (Windows / macOS / ChromeOS)
1. Visit `https://snehaidbc.netlify.app/` in Chrome, Edge, or Brave.
2. Click the **Install Snèh AI** icon in the browser address bar.

---

## 📂 Project Directory Structure

```text
snehaidbc/
├── index.html               # Main SPA Web Application & Connected JSON-LD Schema
├── sidebar-content.html     # Crawlable internal link graph & navigation drawer
├── robots.txt               # Robots exclusion policy
├── sitemap.xml              # Multi-page XML sitemap with image metadata
├── llms.txt                 # AI documentation index for LLM crawlers
├── netlify.toml             # HTTP headers, 301 redirects, and asset caching
├── _headers                 # Netlify Edge security headers
├── manifest.json            # PWA manifest with shortcuts and file handlers
│
├── features/index.html      # Product features landing page
├── privacy/index.html       # Zero-retention privacy policy
├── about/index.html         # Corporate organization profile
├── changelog/index.html     # Platform version history
├── vs-chatgpt/index.html    # Platform comparison guide
├── install/index.html       # PWA installation documentation
├── security/index.html      # Cloud infrastructure & security overview
├── faq/index.html           # Platform FAQ page
└── docs/index.html          # User and developer usage guide
