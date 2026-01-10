# Kanban

A full-stack Kanban board application featuring real-time collaboration, drag-and-drop task management, and role-based access control. Built with Spring Boot and React.

## Features

- **Multi-Board Management** - Create and manage multiple boards with customizable columns
- **Real-Time Collaboration** - WebSocket synchronization keeps all users in sync
- **Drag & Drop Interface** - Smooth task management with optimistic UI updates
- **Task Management** - Full CRUD with assignments, comments, labels, due dates, and activity tracking
- **Board Invitations** - Secure invite links with role-based access control (Creator, Admin, Member)
- **OAuth2 Authentication** - Auth0 integration with JWT validation
- **Type-Safe API** - Auto-generated TypeScript client from OpenAPI specification

## Tech Stack

**Backend:** Spring Boot 3.5, Java 21, PostgreSQL, Spring Security OAuth2, Spring Data JPA, Flyway

**Frontend:** React 19, TypeScript, Vite, TanStack Router/Query/Form, Tailwind CSS 4, shadcn/ui, Auth0 React

## Prerequisites

- Java 21
- Node.js 20+
- Docker (or PostgreSQL 16+)
- [Auth0 Account](https://auth0.com/)

## Quick Start

### 1. Database Setup

Start PostgreSQL via Docker Compose:

```bash
docker compose up -d
```

Update `api/src/main/resources/application.yml` if you changed credentials in `docker-compose.yml`.

### 2. Auth0 Configuration

Create an Auth0 application (Single Page Application) and API with identifier.

**Backend** (`api/src/main/resources/application.yml`):

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://your-tenant.auth0.com/
          audiences: your-api-identifier
```

**Frontend** (`client/.env`):

```env
VITE_API_URL=http://localhost:8080/api
VITE_OPENAPI_YAML_URL=http://localhost:8080/api-docs.yaml
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-identifier
VITE_AUTH0_CALLBACK_URL=http://localhost:5173/callback
```

### 3. Run the Application

**Backend:**

```bash
cd api
./mvnw spring-boot:run
```

API runs on `http://localhost:8080`

**Frontend:**

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173`

## API Documentation

When the backend is running:

- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **OpenAPI Docs:** http://localhost:8080/api-docs

## License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) file for details.
