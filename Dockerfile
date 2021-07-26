FROM node:14

# Create app directory
WORKDIR /usr/src/app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . .
EXPOSE 3000
USER node
CMD npm run-script startProd
