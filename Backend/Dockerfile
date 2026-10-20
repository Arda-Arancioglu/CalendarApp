# Stage 1: Build the application using Maven Wrapper
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copy project files
COPY . .

# Grant execution permission to mvnw, then build the jar
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

# Stage 2: Run the application with minimal JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-Xmx350m", "-XX:+UseContainerSupport", "-XX:+UseSerialGC", "-jar", "app.jar"]