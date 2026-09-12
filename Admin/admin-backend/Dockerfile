# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application (skipping tests for container build, assuming tests run in CI/CD pipeline)
RUN mvn clean package -DskipTests

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
