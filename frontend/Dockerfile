# Archivo: frontend/Dockerfile (desarrollo)

FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar codigo fuente
COPY . .

# No correr como root
RUN chown -R node:node /app
USER node

# Exponer puerto
EXPOSE 3000

# Comando por defecto (desarrollo)
CMD ["npm", "run", "dev"]
