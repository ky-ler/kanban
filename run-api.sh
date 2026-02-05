#!/bin/bash
set -a
source .env
set +a
cd api && ./mvnw spring-boot:run "$@"
