**Kane's Bookstore Reader 📚🚀**

A premium, feature-rich web application designed for a modern reading experience. Built with **Next.js 15**, **React 19**, and **Tailwind CSS**.

---

### ✨ Key Features

- **📖 Immersive Reading Experience**: Focused reader view with customizable settings for a comfortable experience.
- **🔍 Smart Discovery**: Browse a vast collection of books with advanced filtering and search capabilities.
- **📊 Personal Dashboard**: Track your reading progress, statistics, and manage your library in one place.
- **👥 Book Clubs**: Join or create book clubs to discuss your favorite titles with other readers.
- **🛡️ Admin Suite**: Robust management tools for library oversight, user management, and book cataloging.
- **📱 Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.
- **🌓 Dark Mode Support**: Premium aesthetic with dynamic theme switching.

---

### 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) + [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)

---

### 🚀 Getting Started

#### Prerequisites

- Node.js (Latest LTS recommended)
- npm (standardized package manager for this project)

#### Installation

1. **Clone the repository**
    
    ```bash
    git clone 
    ```
    
2. **Install dependencies**
    
    ```bash
    npm install
    ```
    
3. **Set up environment variables**
    - Create a `.env` file in the root directory and add your configuration.
    - See `.env.example` if available.
4. **Run the development server**
    
    ```bash
    npm run dev
    ```
    
    Open http://localhost:3000/ in your browser.
    

---

### 🔧 Backend Development

This project uses the **approved backend defaults**:

- **Backend provider**: Supabase
- **Runtime**: Supabase Edge Functions (Deno)
- **Language**: TypeScript
- **Auth**: Supabase Auth
- **Data layer**: Supabase-managed Postgres

#### Backend API

- Base URL: https://tcbrxygfssdxwfhlpxhk.supabase.co/functions/v1/kanes-bookstore

#### How to work on the backend (high level)

1. Use Supabase for local development (Postgres + Auth) when implementing backend changes.
2. Develop and test API functionality as **Edge Functions**.
3. Keep API boundaries explicit and modular.

#### Deviation rule

If you deviate from the defaults (for example AWS or Node.js), document the justification at the project or module level.

---

### 📂 Project Structure

- `/app`: Next.js App Router pages and layouts
- `/components`: Reusable UI components (Sidebar, Cards, Reader Panels)
- `/lib`: Utility functions and shared logic
- `/public`: Static assets like images and fonts
- `/styles`: Global styles and Tailwind configurations

---

### 📝 License

This project is private and intended for use by authorized users only.

*Built with passion by the Inner G Complete Agency Team.*