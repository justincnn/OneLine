# build stage
FROM oven/bun:1 as build

WORKDIR /app

# install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# copy app files
COPY . .

# Create an empty public directory if it doesn't exist
RUN mkdir -p public

# build app
RUN bun run build

# final image
FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=build /app/package.json .
COPY --from=build /app/bun.lock .
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "run", "start"]