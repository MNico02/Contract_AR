# Imagen base
FROM node:18

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos package.json si existe (lo crea CRA)
COPY package*.json ./

# Instalamos dependencias si ya existe package.json
RUN if [ -f package.json ]; then npm install; fi

# Copiamos el resto del código
COPY frontend .

# Puerto que usa React
EXPOSE 3000

# Comando por defecto (modo desarrollo)
CMD ["npm", "start"]