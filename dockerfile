# Use official Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Run the bot
CMD [ "npm", "start" ]