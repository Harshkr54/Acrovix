# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml first to leverage Docker layer caching
COPY pom.xml .

# Pre-fetch dependencies with a retry loop using BuildKit cache mount
# This ensures we don't re-download the world if src/ changes
RUN --mount=type=cache,target=/root/.m2 /bin/bash -c 'set -o pipefail; \
    i=1; max=3; \
    while [ $i -le $max ]; do \
      echo "Downloading dependencies (Attempt $i)..."; \
      if mvn dependency:go-offline -B | tee dep.log; then \
        echo "Dependencies resolved."; exit 0; \
      fi; \
      if grep -qiE "429 Too Many Requests|Transfer failed" dep.log; then \
        echo "Transient error, retrying..."; sleep $((i*5)); \
      else \
        echo "Fatal error in dependency resolution."; exit 1; \
      fi; \
      i=$((i+1)); \
    done; \
    echo "Failed to resolve dependencies after $max attempts."; exit 1'

# Copy source code
COPY src ./src

# Build the application using the cached dependencies
# We use bash and set -o pipefail to correctly capture maven's exit code through the pipe
RUN --mount=type=cache,target=/root/.m2 /bin/bash -c 'set -o pipefail; \
    i=1; \
    max_retries=3; \
    delay=5; \
    while [ $i -le $max_retries ]; do \
      echo "Attempt $i/$max_retries: Running Maven build..."; \
      if mvn clean package -DskipTests | tee build.log; then \
        echo "Maven build succeeded."; \
        if [ -f "target/admin-backend-0.0.1-SNAPSHOT.jar" ]; then \
          echo "Expected JAR artifact found. Build succeeded."; \
          exit 0; \
        else \
          echo "ERROR: Maven build succeeded but expected JAR (target/admin-backend-0.0.1-SNAPSHOT.jar) is missing!"; \
          exit 1; \
        fi; \
      fi; \
      if grep -qiE "429 Too Many Requests|Transfer failed|Connection reset|Read timed out|Could not transfer artifact|Connection timed out" build.log; then \
        if [ $i -lt $max_retries ]; then \
          echo "Transient network/rate-limit error detected. Retrying in $delay seconds..."; \
          sleep $delay; \
          delay=$((delay * 2)); \
        else \
          echo "Max retries reached. Build failed."; \
          exit 1; \
        fi; \
      else \
        echo "Fatal compilation or non-transient error detected. Failing immediately."; \
        exit 1; \
      fi; \
      i=$((i + 1)); \
    done; \
    exit 1'

# Runtime stage
# Using Jammy instead of Alpine to ensure font libraries for PDF generation (OpenPDF) work smoothly
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Run as a non-root user for enhanced security
RUN addgroup --system appgroup && adduser --system --group appuser
USER appuser

# Copy the built JAR file from the build stage
COPY --from=build /app/target/admin-backend-0.0.1-SNAPSHOT.jar app.jar

# Render explicitly provides the PORT environment variable.
# Application will bind to this port automatically via server.port=${PORT:8081}
ENTRYPOINT ["java", "-jar", "app.jar"]
