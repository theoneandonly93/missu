FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN bun install

EXPOSE 5000
CMD ["bun", "backend/src/bot.ts"]
