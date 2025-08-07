# Imagen base de Node.js
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar dependencias primero (para aprovechar cache)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código del backend
COPY . .

# Exponer puerto de la app
EXPOSE 3000

# Comando para iniciar la app
CMD ["node", "src/app.js"]
