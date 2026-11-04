FROM node:18-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto del contenedor
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]