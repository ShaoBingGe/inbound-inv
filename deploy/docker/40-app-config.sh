#!/bin/sh
# nginx 官方镜像会在启动前执行 /docker-entrypoint.d/ 下的脚本。
# 这里把环境变量渲染成 /config.js（根文件系统只读时写到 /tmp，由 html/config.js 软链指向）。
set -eu

OUT_DIR=/tmp/app-config
mkdir -p "$OUT_DIR"

# 校验 JSON 类变量，避免配置错误时前端白屏
for v in OIDC_PROVIDERS_JSON OIDC_CLAIMS_JSON; do
  eval "val=\${$v:-}"
  case "$val" in
    \[*\]|\{*\}) ;;
    *) echo "[app-config] $v 必须是 JSON 数组或对象，当前值: $val" >&2; exit 1 ;;
  esac
done

envsubst '${APP_ENV} ${API_BASE_URL} ${AGENT_PLATFORM_BASE_URL} ${DATA_MODE} ${DEFAULT_LANG} ${AUTH_MODE} ${OIDC_PROVIDERS_JSON} ${OIDC_CLAIMS_JSON}' \
  < /usr/share/nginx/config.js.template > "$OUT_DIR/config.js"

echo "[app-config] generated config.js (env=${APP_ENV}, auth=${AUTH_MODE}, data=${DATA_MODE})"
