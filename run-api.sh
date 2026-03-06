#!/bin/bash
set -a
source .env
set +a
cd api && ./mvnw clean spring-boot:run -Dspring-boot.run.profiles=dev "$@"
