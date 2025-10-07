
FROM oven/bun:latest

WORKDIR /workspaces/missu
COPY . .

RUN bun install

EXPOSE 5000
CMD ["bun", "backend/src/bot.ts"]
