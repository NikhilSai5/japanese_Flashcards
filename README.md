# Japanese Flashcards - React App

A modern React application for studying Japanese flashcards with Supabase integration. Converted from the original vanilla JavaScript `withdb.html` to a professional React setup with Vite, Tailwind CSS, and custom hooks.

## 🚀 Features

- **Card Flipping**: Interactive 3D card flip animation
- **Lesson Filtering**: Filter by "All" or specific lesson numbers
- **Progress Tracking**: Visual progress ring showing current card position
- **Study Progress**: Automatic saving of correct/incorrect counts to Supabase
- **Reverse Mode**: Study in both directions (Japanese→English and English→Japanese)
- **Shuffle Deck**: Randomize card order
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Beautiful loading overlay while fetching data

## 📁 Project Structure

```
flashcards-app/
├── src/
│   ├── components/
│   │   ├── App.jsx
│   │   ├── Card.jsx
│   │   ├── Header.jsx
│   │   ├── LessonControls.jsx
│   │   ├── Navigation.jsx
│   │   ├── ProgressRing.jsx
│   │   ├── ScoreButtons.jsx
│   │   ├── Stats.jsx
│   │   ├── BottomControls.jsx
│   │   └── LoadingOverlay.jsx
│   ├── hooks/
│   │   ├── useFlashcards.js
│   │   ├── useCardNavigation.js
│   │   └── useSupabase.js
│   ├── config/
│   │   └── supabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

## 📦 Technologies

- **React 19** - UI framework
- **Vite 8** - Build tool
- **Tailwind CSS 4** - Utility-first CSS framework
- **Supabase JS Client** - Database integration
- **PostCSS** - CSS processing

## 🎮 Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Production Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🎨 Styling

Uses Tailwind CSS v4 with custom design system:
- Custom color palette (ink, paper, cream, red, gold, muted, border)
- Google Fonts integration (Noto Sans JP, DM Serif Display, DM Mono)
- Responsive design for desktop and mobile

## 📊 State Management

Custom React hooks handle all state:
- `useFlashcards()` - Card data and lesson filtering
- `useCardNavigation()` - Navigation and scoring
- `useSupabase()` - Database client

## 🔌 Supabase Integration

Connects to your Supabase project for:
- Loading flashcards from the database
- Saving study progress (correct/incorrect counts)

Requires `flashcards` and `study_progress` tables with proper RLS policies.

## ☝️ Key Differences from Original HTML

- ✅ Component-based React architecture
- ✅ Custom hooks for reusable logic
- ✅ Professional build pipeline with Vite
- ✅ Tailwind CSS for maintainable styling
- ✅ Better code organization
- ✅ Easier to extend and maintain
