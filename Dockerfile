FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY public ./public
COPY next.config.ts postcss.config.mjs tsconfig.json ./

ARG NEXT_PUBLIC_STREAM_BASE_URL=https://stream.ojocams.com
ENV NEXT_PUBLIC_STREAM_BASE_URL=${NEXT_PUBLIC_STREAM_BASE_URL}
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["./node_modules/.bin/vinext", "start", "--hostname", "0.0.0.0", "--port", "3000"]
