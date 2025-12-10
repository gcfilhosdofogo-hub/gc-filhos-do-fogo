# AI Studio Application Rules

This document outlines the technical stack and specific library usage guidelines for developing and modifying the "Filhos do Fogo" application. Adhering to these rules ensures consistency, maintainability, and alignment with project standards.

## Tech Stack Overview

1.  **Frontend Framework**: React for building dynamic and interactive user interfaces.
2.  **Language**: TypeScript for enhanced type safety, better tooling, and improved code quality.
3.  **Styling**: Tailwind CSS for a utility-first approach to styling, enabling rapid and responsive UI development.
4.  **Build Tool**: Vite for a fast development server and optimized production builds.
5.  **Icons**: Lucide React for a comprehensive and customizable set of SVG icons.
6.  **UI Components**: While existing components are custom-built with Tailwind, new UI elements should prioritize using `shadcn/ui` components, which are built on Radix UI.
7.  **Routing**: The application uses a custom, state-based routing system managed within `src/App.tsx`.
8.  **State Management**: Primarily uses React's built-in `useState` and `useMemo` hooks for component-level state.
9.  **Data Modeling**: TypeScript interfaces and types, defined in `types.ts`, are used to ensure clear and consistent data structures.
10. **Backend/API**: The current application uses mock data. Supabase is available for future backend integration if needed.

## Library Usage Guidelines

*   **General Components**:
    *   For any new UI component, first check if a suitable component exists within the `shadcn/ui` library. If available, use the `shadcn/ui` component.
    *   If `shadcn/ui` does not offer a suitable component, create a new custom component in `src/components/` and style it exclusively using Tailwind CSS utility classes.
    *   **Do not modify `shadcn/ui` component files directly.** If customization is needed, create a new component that wraps or extends the `shadcn/ui` component.
*   **Styling**:
    *   All visual styling must be implemented using Tailwind CSS utility classes. Avoid inline styles or separate CSS files unless absolutely necessary for highly specific, complex scenarios.
    *   Ensure all designs are responsive by utilizing Tailwind's responsive prefixes (e.g., `md:`, `lg:`).
*   **Icons**:
    *   Always use icons from the `lucide-react` library.
    *   Import icons directly from `lucide-react` (e.g., `import { Home, Settings } from 'lucide-react';`).
*   **Routing**:
    *   Maintain the existing custom routing logic implemented in `src/App.tsx`.
    *   When adding new pages or views, integrate them into the `currentView` state and the `renderContent` function in `src/App.tsx`.
    *   New pages should be placed in the `src/pages/` directory.
*   **State Management**:
    *   Use React's `useState` hook for managing local component state.
    *   For state that needs to be shared across multiple components, consider `useContext`. For more complex global state requirements, discuss potential solutions.
*   **Data Types**:
    *   Always define and use TypeScript interfaces and types from `types.ts` for all data structures.
    *   If new data structures are required, add their definitions to `types.ts`.
*   **Dependencies**:
    *   Before introducing new npm packages, verify if existing libraries can fulfill the requirement.
    *   If a new package is essential, use the `<dyad-add-dependency>` command to install it.
*   **Toasts**:
    *   Use toast components to provide users with feedback on important events (e.g., success messages, error notifications, loading indicators). If a toast library is not yet installed, `react-hot-toast` is recommended.