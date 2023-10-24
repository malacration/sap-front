FROM node:18 as build
WORKDIR /app

ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY package*.json /app/

RUN npm install
RUN npm install -g @angular/cli
RUN npm install --save-dev @angular-devkit/build-angular --force
COPY . /app
RUN ng build

FROM nginx
COPY entrypoint-config.sh /docker-entrypoint.d
RUN chmod +x /docker-entrypoint.d/entrypoint-config.sh
COPY --from=build /app/dist/ /usr/share/nginx/html
COPY nginx-custom.conf /etc/nginx/conf.d/default.conf
