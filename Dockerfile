# Lumen monolith — Kestrel serves API, SignalR, and Angular SPA (requires PostgreSQL)
FROM node:22-alpine AS angular-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
COPY src ./src
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY src-backend/Lumen.API/Lumen.API.csproj src-backend/Lumen.API/
RUN dotnet restore src-backend/Lumen.API/Lumen.API.csproj
COPY src-backend/Lumen.API/ src-backend/Lumen.API/
RUN dotnet publish src-backend/Lumen.API/Lumen.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=api-build /app/publish .
COPY --from=angular-build /app/dist/lumen-angular/browser ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Lumen.API.dll"]
