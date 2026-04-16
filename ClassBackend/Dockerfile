FROM eclipse-temurin:21-jre-jammy
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
WORKDIR /app
COPY build/libs/*1.0.0.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]