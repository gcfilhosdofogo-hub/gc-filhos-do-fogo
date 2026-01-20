# Filhos do Fogo - Capoeira Management App

## Overview

Filhos do Fogo is a community management and educational platform for a Capoeira martial arts group. The application provides role-based dashboards for students (alunos), professors, and administrators to manage classes, events, payments, assignments, uniforms, music, and student progress tracking.

The app is built as a Progressive Web App (PWA) with offline capabilities, allowing members to access key features on mobile devices. It integrates with Supabase for authentication, database storage, and file uploads.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** for utility-first styling with a custom dark theme (stone/orange color palette)

### Routing Strategy
- Custom state-based routing managed in `App.tsx` using `currentView` state
- No React Router - navigation handled through `onNavigate` callbacks passed to components
- Views organized in `/views` directory, pages in `/src/pages` directory

### Component Architecture
- Custom components in `/components` directory styled with Tailwind
- AI_RULES.md specifies preference for shadcn/ui components for new UI elements
- Lucide React for all iconography
- Error boundaries for graceful error handling

### State Management
- React's built-in `useState` and `useCallback` hooks for component state
- `SessionContextProvider` wraps the app for authentication state management
- Data states (events, payments, assignments, etc.) managed at App.tsx level and passed down as props

### Authentication & Authorization
- Supabase Auth for user authentication (email/password)
- Role-based access control with three roles: `admin`, `professor`, `aluno`
- Profile setup flow for new users via `ProfileSetup` component
- Session management through `useSession` hook

### Data Models
- TypeScript interfaces defined in `types.ts` at root level
- Key entities: User, ClassSession, GroupEvent, Assignment, PaymentRecord, UniformOrder, StudentGrade, MusicItem, HomeTraining, SchoolReport, EventRegistration

### PWA Configuration
- Vite PWA plugin configured in `vite.config.ts`
- Service worker for offline caching
- Custom manifest with Capoeira branding

## External Dependencies

### Backend Services
- **Supabase**: Primary backend providing:
  - Authentication (email/password signup/login)
  - PostgreSQL database for all data storage
  - File storage for profile photos and proof uploads
  - Real-time subscriptions (potential)

### Third-Party Libraries
- `@supabase/supabase-js` - Supabase client SDK
- `@supabase/auth-ui-react` - Pre-built auth UI components
- `heic2any` - HEIC to JPEG conversion for iOS photo uploads
- `lucide-react` - Icon library
- `vite-plugin-pwa` - PWA functionality

### External Integrations
- Instagram social link (https://www.instagram.com/filhosdofogo2005)
- Discord community link (https://discord.gg/AY2kk9Ubk)
- Google Fonts (Inter font family)

### Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - Referenced in README (AI Studio integration)