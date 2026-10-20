# Stage 1: Build the application using Maven Wrapper
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy project files
COPY . .

# Build the jar (skipping tests to speed up deployment)
RUN ./mvnw clean package -DskipTests

# Stage 2: Run the application with minimal JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the built jar from stage 1
COPY --from=build /app/target/*.jar app.jar

# Run with tuned JVM arguments for Render's 512MB limit
ENTRYPOINT ["java", "-Xmx350m", "-XX:+UseContainerSupport", "-XX:+UseSerialGC", "-jar", "app.jar"]