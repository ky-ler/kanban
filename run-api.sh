#!/bin/bash
set -a
source .env
set +a
docker compose up -d
cd api && ./mvnw clean spring-boot:run -Dspring-boot.run.profiles=dev "$@"
