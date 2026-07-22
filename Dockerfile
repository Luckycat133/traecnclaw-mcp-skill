# Glama build for traecnclaw-mcp-skill
#
# Installs the MCP server npm package from GitHub Releases.
# Runs traecnclaw-mcp in stdio mode — no gateway token in this image.
#
# Tokens / secrets must be injected at runtime via environment variables
# or Glama’s credential injection, never baked into the image.

FROM node:22-alpine AS runner

RUN apk add --no-cache curl ca-certificates

ARG RELEASE_TAG=v0.3.0-mcp-skill.1
ARG PACKAGE=traecnclaw-0.3.0.tgz
ARG REPO=https://github.com/Luckycat133/traecnclaw-mcp-skill/releases/download

# Install the MCP server globally from the release artifact.
RUN curl -fsSL "${REPO}/${RELEASE_TAG}/${PACKAGE}" \
    | npm install -g --unsafe-perm

# Default profile limits tools to safe public operations.
ENV TRAECN_MCP_TOOL_PROFILE=public
ENV TRAECN_HOST=127.0.0.1
ENV TRAECN_PORT=8788
# TRAECN_GATEWAY_TOKEN is intentionally NOT set here.
# Glama or the runtime injector supplies it.

ENTRYPOINT ["traecnclaw-mcp"]
