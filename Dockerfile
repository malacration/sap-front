FROM node:18 as build
WORKDIR /app
COPY package*.json /app/
RUN npm install
COPY . /app
RUN npm run web:build

FROM nginx
COPY --from=build /app/dist/ /usr/share/nginx/html
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf
