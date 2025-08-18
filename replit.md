# Overview

This is a task assignment web application built for managing household chores among residents. The system allows users to assign daily tasks (cooking, shopping, table setting, dishwashing) to residents and track who should be alone in the kitchen. The application features a React frontend with TypeScript and an Express.js backend, using PostgreSQL for data persistence through Drizzle ORM.

# User Preferences

Preferred communication style: Simple, everyday language.

## Recent User Requests (August 2025)
- Users should be able to input their own names instead of selecting from predefined lists
- Kitchen preference should be a simple Yes/No toggle instead of name input
- All changes should be saved automatically (no manual save button needed)
- Weekly overview functionality is essential for planning
- Dish selection feature requested for residents to specify what they're cooking
- "Dagens ret" (Dish of the Day) section should appear at the very top of the page
- Shopping list should be accessible before shopper assignment (cook can prepare in advance)
- Clear notice required: residents not taking other tasks must participate in dishwashing unless agreed with staff
- User successfully deployed app to Render hosting platform (August 18, 2025)

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **UI Components**: shadcn/ui component library built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod for validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with structured error responses
- **Request Logging**: Custom middleware for API request/response logging
- **Development**: Hot reloading with tsx for development server

## Data Storage
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless driver for PostgreSQL connections
- **Validation**: Drizzle-Zod integration for runtime schema validation

## API Structure
- **GET /api/tasks/:date?** - Retrieve task assignments for a specific date (defaults to today)
- **POST /api/tasks/assign** - Assign a specific task to a resident
- **POST /api/tasks/alone** - Set which resident should be alone in kitchen
- **POST /api/tasks/reset** - Reset all task assignments for a date

## Development Environment
- **Build System**: Vite for frontend bundling, esbuild for backend compilation
- **Development Tools**: TypeScript compiler, Replit-specific plugins for error handling
- **Code Quality**: Strict TypeScript configuration with path mapping

## Storage Strategy
The application implements a dual storage approach:
- **Memory Storage**: In-memory storage class for development and testing
- **Database Storage**: PostgreSQL storage for production persistence
- **Storage Interface**: Abstract storage interface allowing easy switching between implementations

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **Drizzle Kit**: Database migration and schema management tool

## UI and Styling
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static typing for JavaScript
- **React Router (Wouter)**: Lightweight client-side routing
- **TanStack Query**: Data fetching and caching library
- **React Hook Form**: Form handling and validation
- **Zod**: Schema validation library

## Utilities
- **date-fns**: Date manipulation and formatting library
- **clsx**: Utility for conditional CSS class names
- **class-variance-authority**: Utility for creating component variants
- **nanoid**: Unique ID generation for development