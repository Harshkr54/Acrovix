# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Create settings.xml to use Google's Maven Central mirror to avoid HTTP 429 rate limits
RUN echo '<settings><mirrors><mirror><id>google-maven-central</id><name>Google Maven Central</name><url>https://maven-central.storage-download.googleapis.com/maven2/</url><mirrorOf>central</mirrorOf></mirror></mirrors></settings>' > settings.xml

# Build the application using the cached dependencies and mirror
# We use bash and set -o pipefail to correctly capture maven's exit code through the pipe
RUN --mount=type=cache,target=/root/.m2 /bin/bash -c 'set -o pipefail; \
    i=1; \
    max_retries=3; \
    delay=5; \
    while [ $i -le $max_retries ]; do \
      echo "Attempt $i/$max_retries: Running Maven build..."; \
      if mvn -s settings.xml clean package -DskipTests | tee build.log; then \
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
