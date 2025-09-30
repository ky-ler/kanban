# Full-Stack Kanban Application

This repository contains the complete source code for a full-stack Kanban-style project management application. The project is organized using Git submodules to manage the frontend and backend codebases within this single parent repository.

- **Backend (`kanban-backend`):** A robust RESTful API built with Java and Spring Boot, secured with Keycloak.
- **Frontend (`kanban-web`):** A modern, responsive web application built with React, TypeScript, and Vite.

## Tech Stack

| Area         | Technologies                                                              |
| :----------- | :------------------------------------------------------------------------ |
| **Backend**  | Java 21, Spring Boot 3, Spring Security, PostgreSQL, JPA/Hibernate, Maven |
| **Frontend** | React 19, TypeScript, Vite, TanStack Router, React Query, Tailwind CSS    |
| **Security** | Keycloak (Identity and Access Management)                                 |
| **DevOps**   | Docker                                                                    |

## Key Features

- **Full CRUD Functionality:** Manage projects, tasks, and collaborators with ease.
- **Role-Based Access Control (RBAC):** Secure API with fine-grained permissions for different user roles (e.g., ADMIN, MEMBER).
- **Modern User Interface:** A clean, responsive, and intuitive interface for managing your workflow.
- **Collaborator Management:** Add, remove, and update roles for team members on a per-project basis.
- **Containerized Environment:** The entire backend infrastructure (PostgreSQL, Keycloak) is containerized with Docker for easy setup and consistent development.

## Getting Started

Follow these instructions to get the entire application running locally.

### Prerequisites

- Java 21 (or later)
- Maven
- Node.js (v18 or later)
- Docker

### 1. Clone the Repository with Submodules

This repository uses Git submodules. To clone it correctly, you must use the `--recurse-submodules` flag:

```sh
git clone --recurse-submodules https://github.com/ky-ler/kanban.git
cd kanban
```

If you have already cloned the repository without the flag, you can initialize the submodules by running:

```sh
git submodule update --init --recursive
```

### 2. Run Backend Services with Docker

The backend infrastructure, including PostgreSQL and Keycloak, is managed by Docker Compose. From the root of the project, run:

```sh
# This command starts the database and identity server in detached mode.
docker-compose up -d
```

- **Keycloak** will be available at `http://localhost:9090`. Log in and configure a realm and client as needed.
- **PostgreSQL** will be available on port `8778`.

### 3. Configure and Run the Backend

Navigate to the backend directory and run the Spring Boot application using Maven.

```sh
# Navigate into the backend submodule
cd kanban-backend

# Ensure the issuer-uri in application.yml matches your Keycloak realm URL
# (src/main/resources/application.yml)

# Run the backend application
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 4. Configure and Run the Frontend

In a new terminal, navigate to the frontend directory, install dependencies, and start the development server.

```sh
# Navigate into the web submodule (from the root directory)
cd kanban-web

# Install dependencies
npm install

# Create a .env file from the example
cp .env.example .env

# Ensure the variables in .env point to your running services
# VITE_KEYCLOAK_URL=http://localhost:9090
# VITE_API_URL=http://localhost:8080/api

# Run the frontend application
npm run dev
```

The web application will be available at `http://localhost:5173`.

You should now have the full application running locally\!
