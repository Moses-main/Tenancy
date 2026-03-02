FROM oven/bun:1-alpine

WORKDIR /app

# Install CRE CLI
RUN curl -sSL https://cre.chain.link/install.sh | sh
ENV PATH="/root/.cre/bin:$PATH"

# Copy files
COPY package.json bun.lock ./
RUN bun install --production

COPY . .

# Schedule the workflow via cron in container
CMD ["sh", "-c", "while true; do cre workflow simulate . --target staging-settings --broadcast --env .env; sleep 1800; done"]
