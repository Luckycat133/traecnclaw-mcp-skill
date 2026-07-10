FROM node:22-slim

COPY npm-package/traecnclaw-0.3.0.tgz /tmp/traecnclaw-0.3.0.tgz

RUN npm install -g /tmp/traecnclaw-0.3.0.tgz \
  && rm /tmp/traecnclaw-0.3.0.tgz

ENV TRAECN_HOST=127.0.0.1 \
  TRAECN_PORT=8788 \
  TRAECN_GATEWAY_TOKEN= \
  TRAECN_MCP_TOOL_PROFILE=public

ENTRYPOINT ["traecnclaw-mcp"]
