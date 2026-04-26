#!/bin/bash

# =============================================================================
# ZARTSA - Zanzibar Road Transport & Safety Authority
# Application Service Manager
# =============================================================================
# Manages all services: PostgreSQL, Redis, MinIO, API server, Frontend
# Supports both development and production modes
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR"
LOG_DIR="/tmp/zartsa"

# Mode: dev or prod (default: dev)
MODE="${ZARTSA_MODE:-dev}"

# =============================================================================
# NVM SETUP (required for Node.js on this server)
# =============================================================================
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# =============================================================================
# SUDO PASSWORD (for PostgreSQL start/stop on this server)
# =============================================================================
# Cache sudo credentials on first use so interactive prompts don't block
SUDO_PASSWORD="${ZARTSA_SUDO_PASSWORD:-}"
sudo_refresh() {
    if [ -n "$SUDO_PASSWORD" ]; then
        echo "$SUDO_PASSWORD" | sudo -S -v >/dev/null 2>&1
    else
        sudo -v 2>/dev/null
    fi
}

# =============================================================================
# SERVICE PORTS
# =============================================================================
POSTGRES_PORT=5432
REDIS_PORT=6379
MINIO_PORT=9000
API_PORT=5000
FRONTEND_PORT=3000
PRISMA_STUDIO_PORT=5555

# =============================================================================
# LOG FILES
# =============================================================================
API_LOG="$LOG_DIR/api.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
PRISMA_STUDIO_LOG="$LOG_DIR/prisma-studio.log"

# =============================================================================
# DATABASE CONFIG
# =============================================================================
DB_NAME="${DB_NAME:-zardb}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-postgres}"

# =============================================================================
# INFRASTRUCTURE SERVICES (managed directly, no sudo)
# =============================================================================

# =============================================================================
# COLORS
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# LOGGING
# =============================================================================

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }

log_header() {
    echo ""
    echo -e "${CYAN}══════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════${NC}"
    echo ""
}

# =============================================================================
# PORT & PROCESS MANAGEMENT
# =============================================================================

# Check if a TCP port has a listener (uses ss + lsof, reliable for all services)
port_is_open() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 && return 0
    ss -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
    return 1
}

# Check if HTTP responds on a port
http_responds() {
    local port=$1
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 --connect-timeout 2 "http://localhost:$port/" 2>/dev/null)
    [ "$code" != "000" ] && [ -n "$code" ]
}

# Get PID occupying a port
port_pid() {
    local pid
    pid=$(lsof -ti:$1 2>/dev/null | head -1)
    if [ -z "$pid" ]; then
        pid=$(ss -tlnp "( sport = :$1 )" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)
    fi
    echo "$pid"
}

# Kill whatever is holding a port (uses fuser -k for app ports, kill for infra)
kill_port() {
    local port=$1
    local label="${2:-port $port}"

    if ! port_is_open "$port"; then
        return 0
    fi

    log_warning "$label: port $port is in use, freeing it..."

    # First try: kill by PID
    local pid
    pid=$(port_pid "$port")
    if [ -n "$pid" ]; then
        kill -9 "$pid" 2>/dev/null || sudo kill -9 "$pid" 2>/dev/null
        sleep 1
    fi

    # Second try: fuser -k (reliable for app processes, especially root-owned)
    if port_is_open "$port"; then
        fuser -k "$port/tcp" 2>/dev/null || sudo fuser -k "$port/tcp" 2>/dev/null
        sleep 1
    fi

    # Final try: sudo kill if still held
    if port_is_open "$port"; then
        pid=$(port_pid "$port")
        if [ -n "$pid" ]; then
            sudo kill -9 "$pid" 2>/dev/null
            sleep 1
        fi
    fi

    if port_is_open "$port"; then
        log_error "$label: could not free port $port (set ZARTSA_SUDO_PASSWORD if process is owned by another user)"
        return 1
    fi

    log_success "$label: port $port freed"
    return 0
}

# Wait for a port to become available before starting
ensure_port_free() {
    local port=$1
    local label="${2:-service}"

    if port_is_open "$port"; then
        log_warning "$label is already running on port $port"
        kill_port "$port" "$label"
        if [ $? -ne 0 ]; then
            log_error "Cannot start $label — port $port is occupied"
            return 1
        fi
    fi
    return 0
}

# Wait for a service to start listening on a port
wait_for_port() {
    local port=$1
    local label="${2:-service}"
    local timeout=${3:-30}
    local elapsed=0

    log_info "Waiting for $label on port $port..."

    while [ $elapsed -lt $timeout ]; do
        if port_is_open "$port"; then
            local pid=$(port_pid "$port")
            if [ -n "$pid" ]; then
                log_success "$label is ready on port $port (PID: $pid)"
            else
                log_success "$label is ready on port $port"
            fi
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_error "$label failed to start within ${timeout}s"
    return 1
}

# =============================================================================
# MODE HELPERS
# =============================================================================

is_dev()  { [ "$MODE" = "dev" ]; }
is_prod() { [ "$MODE" = "prod" ]; }

mode_label() {
    if is_dev; then echo "DEV"; else echo "PROD"; fi
}

# =============================================================================
# INFRASTRUCTURE (direct process management — no sudo needed)
# =============================================================================

start_infra() {
    log_info "Starting infrastructure services [$(mode_label)]..."
    local failures=0

    start_postgres || failures=$((failures + 1))
    start_redis || failures=$((failures + 1))
    start_minio || failures=$((failures + 1))

    return $failures
}

stop_infra() {
    log_info "Stopping infrastructure services..."
    stop_postgres
    stop_redis
    stop_minio
}

restart_infra() {
    log_info "Restarting infrastructure services..."
    stop_infra
    sleep 1
    start_infra
}

# =============================================================================
# POSTGRESQL
# =============================================================================

start_postgres() {
    if is_postgres_running; then
        log_success "postgresql: already running"
        return 0
    fi
    # Start via sudo — pg_ctlcluster requires cluster owner (postgres) or root
    if command -v systemctl &>/dev/null; then
        sudo systemctl start postgresql 2>/dev/null
    fi
    if ! is_postgres_running && command -v pg_ctlcluster &>/dev/null; then
        sudo pg_ctlcluster 16 main start 2>/dev/null || sudo pg_ctlcluster 15 main start 2>/dev/null || sudo pg_ctlcluster 14 main start 2>/dev/null
    fi
    if ! is_postgres_running && command -v service &>/dev/null; then
        sudo service postgresql start 2>/dev/null
    fi
    # Wait and check
    for i in $(seq 1 10); do
        if is_postgres_running; then
            log_success "postgresql: started"
            return 0
        fi
        sleep 1
    done
    log_error "postgresql: failed to start"
    return 1
}

stop_postgres() {
    if ! is_postgres_running; then
        log_info "postgresql: not running"
        return 0
    fi
    # Graceful shutdown — try systemctl first, then pg_ctlcluster
    if command -v systemctl &>/dev/null; then
        sudo systemctl stop postgresql 2>/dev/null || true
    fi
    if is_postgres_running && command -v pg_ctlcluster &>/dev/null; then
        sudo -u postgres pg_ctlcluster 16 main stop -m fast 2>/dev/null || \
        sudo -u postgres pg_ctlcluster 15 main stop -m fast 2>/dev/null || \
        sudo -u postgres pg_ctlcluster 14 main stop -m fast 2>/dev/null || \
        sudo pg_ctlcluster 16 main stop -m fast 2>/dev/null || true
    fi
    if is_postgres_running && command -v service &>/dev/null; then
        sudo service postgresql stop 2>/dev/null || true
    fi
    # Wait for it to stop
    for i in $(seq 1 5); do
        if ! is_postgres_running; then
            log_success "postgresql: stopped"
            return 0
        fi
        sleep 1
    done
    # Force kill if still running
    local pid
    pid=$(port_pid "$POSTGRES_PORT")
    if [ -n "$pid" ]; then
        sudo kill "$pid" 2>/dev/null
    fi
    log_success "postgresql: stopped"
}

is_postgres_running() {
    PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1
}

check_database() {
    if PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# REDIS
# =============================================================================

start_redis() {
    if is_redis_running; then
        log_success "redis: already running"
        return 0
    fi
    # Try systemctl first (no sudo), fall back to direct start
    if command -v systemctl &>/dev/null && systemctl is-active --quiet "redis-server" 2>/dev/null; then
        log_success "redis: already running (systemd)"
        return 0
    fi
    # Start redis-server directly
    redis-server --daemonize yes 2>/dev/null
    for i in $(seq 1 5); do
        if is_redis_running; then
            log_success "redis: started"
            return 0
        fi
        sleep 1
    done
    log_error "redis: failed to start"
    return 1
}

stop_redis() {
    if command -v redis-cli &>/dev/null; then
        redis-cli shutdown 2>/dev/null
        log_success "redis: stopped"
    else
        local pid
        pid=$(port_pid "$REDIS_PORT")
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null
            log_success "redis: stopped"
        else
            log_info "redis: not running"
        fi
    fi
}

is_redis_running() {
    port_is_open "$REDIS_PORT"
}

# =============================================================================
# MINIO
# =============================================================================

MINIO_BIN="${MINIO_BIN:-/home/nextjs/minio}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-/var/lib/postgresql/minio-data}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"

start_minio() {
    if is_minio_running; then
        log_success "minio: already running"
        return 0
    fi

    # Resolve MinIO binary
    local minio_bin="$MINIO_BIN"
    if [ ! -x "$minio_bin" ]; then
        # Fallback: check PATH
        minio_bin="$(command -v minio 2>/dev/null)"
    fi
    if [ -z "$minio_bin" ]; then
        log_error "minio: binary not found at $MINIO_BIN and not in PATH"
        return 1
    fi

    mkdir -p "$MINIO_DATA_DIR"
    MINIO_ROOT_USER="$MINIO_ACCESS_KEY" MINIO_ROOT_PASSWORD="$MINIO_SECRET_KEY" nohup "$minio_bin" server "$MINIO_DATA_DIR" --address ":$MINIO_PORT" --console-address ":$((MINIO_PORT + 1))" > /tmp/minio.log 2>&1 &
    local pid=$!
    # Wait for MinIO to be ready
    for i in $(seq 1 15); do
        if port_is_open "$MINIO_PORT"; then
            # Ensure bucket exists
            sleep 1
            if command -v mc &>/dev/null; then
                mc alias set local "http://localhost:$MINIO_PORT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --quiet 2>/dev/null
                mc mb "local/zartsa" --quiet 2>/dev/null || true
            fi
            log_success "minio: started (PID $pid)"
            return 0
        fi
        sleep 1
    done
    log_error "minio: failed to start"
    return 1
}

stop_minio() {
    local pid
    pid=$(port_pid "$MINIO_PORT")
    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null
        log_success "minio: stopped"
    else
        log_info "minio: not running"
    fi
}

is_minio_running() {
    port_is_open "$MINIO_PORT"
}

# =============================================================================
# API SERVER (Express)
# =============================================================================

is_api_running() {
    port_is_open "$API_PORT"
}

get_api_pid() {
    port_pid "$API_PORT"
}

start_api() {
    log_info "Starting API server on port $API_PORT [$(mode_label)]..."

    ensure_port_free "$API_PORT" "API server"
    [ $? -ne 0 ] && return 1

    # Verify dependencies
    if ! is_postgres_running; then
        log_error "PostgreSQL is not running. Start it first: ./manage.sh start postgres"
        return 1
    fi
    if ! is_redis_running; then
        log_error "Redis is not running. Start it first: ./manage.sh start redis"
        return 1
    fi

    # Ensure Prisma client is generated
    if [ ! -d "$APP_DIR/server/src/generated" ]; then
        log_warning "Prisma client not generated. Running db-generate..."
        db_generate
    fi

    mkdir -p "$LOG_DIR"

    if is_dev; then
        cd "$APP_DIR"
        nohup npm run dev:server > "$API_LOG" 2>&1 &
    else
        # Production: build first if needed
        if [ ! -f "$APP_DIR/server/dist/index.js" ]; then
            log_warning "Production build not found. Building server..."
            cd "$APP_DIR/server"
            npm run build
        fi

        if command -v pm2 &>/dev/null; then
            cd "$APP_DIR"
            pm2 start server/dist/index.js --name zartsa-api --cwd "$APP_DIR"
        else
            cd "$APP_DIR/server"
            NODE_ENV=production nohup node dist/index.js > "$API_LOG" 2>&1 &
        fi
    fi

    wait_for_port "$API_PORT" "API server" 20
}

stop_api() {
    log_info "Stopping API server..."
    if command -v pm2 &>/dev/null && pm2 describe zartsa-api >/dev/null 2>&1; then
        pm2 stop zartsa-api 2>/dev/null
        pm2 delete zartsa-api 2>/dev/null
    fi
    pkill -f "tsx watch src/index.ts" 2>/dev/null
    pkill -f "node dist/index.js" 2>/dev/null
    kill_port "$API_PORT" "API server"
    log_success "API server stopped"
}

restart_api() {
    log_info "Restarting API server..."
    stop_api
    sleep 1
    start_api
}

# =============================================================================
# FRONTEND (Next.js)
# =============================================================================

is_frontend_running() {
    port_is_open "$FRONTEND_PORT"
}

get_frontend_pid() {
    port_pid "$FRONTEND_PORT"
}

start_frontend() {
    log_info "Starting frontend on port $FRONTEND_PORT [$(mode_label)]..."

    ensure_port_free "$FRONTEND_PORT" "Frontend"
    [ $? -ne 0 ] && return 1

    mkdir -p "$LOG_DIR"

    if is_dev; then
        cd "$APP_DIR"
        nohup npm run dev:client > "$FRONTEND_LOG" 2>&1 &
    else
        # Production: build first if needed
        if [ ! -d "$APP_DIR/client/.next" ]; then
            log_warning "Production build not found. Building client..."
            cd "$APP_DIR/client"
            npm run build
        fi

        if command -v pm2 &>/dev/null; then
            pm2 start "npx next start" --name zartsa-web --cwd "$APP_DIR/client"
        else
            cd "$APP_DIR/client"
            NODE_ENV=production nohup npx next start > "$FRONTEND_LOG" 2>&1 &
        fi
    fi

    wait_for_port "$FRONTEND_PORT" "Frontend" 45
}

stop_frontend() {
    log_info "Stopping frontend..."
    if command -v pm2 &>/dev/null && pm2 describe zartsa-web >/dev/null 2>&1; then
        pm2 stop zartsa-web 2>/dev/null
        pm2 delete zartsa-web 2>/dev/null
    fi
    pkill -f "next dev" 2>/dev/null
    pkill -f "next start" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    kill_port "$FRONTEND_PORT" "Frontend"
    log_success "Frontend stopped"
}

restart_frontend() {
    log_info "Restarting frontend..."
    stop_frontend
    sleep 1
    start_frontend
}

# =============================================================================
# PRISMA STUDIO
# =============================================================================

is_prisma_studio_running() {
    port_is_open "$PRISMA_STUDIO_PORT"
}

start_prisma_studio() {
    log_info "Starting Prisma Studio on port $PRISMA_STUDIO_PORT..."

    ensure_port_free "$PRISMA_STUDIO_PORT" "Prisma Studio"
    [ $? -ne 0 ] && return 1

    mkdir -p "$LOG_DIR"
    cd "$APP_DIR"
    nohup npm run db:studio > "$PRISMA_STUDIO_LOG" 2>&1 &

    wait_for_port "$PRISMA_STUDIO_PORT" "Prisma Studio" 20
}

stop_prisma_studio() {
    log_info "Stopping Prisma Studio..."
    pkill -f "prisma studio" 2>/dev/null
    pkill -f "prisma-studio" 2>/dev/null
    kill_port "$PRISMA_STUDIO_PORT" "Prisma Studio"
    log_success "Prisma Studio stopped"
}

# =============================================================================
# PRODUCTION START (build + start)
# =============================================================================

start_prod_all() {
    log_header "Starting all services [PROD]"

    # 1. Build first
    log_info "Building server and client for production..."
    build_all
    if [ $? -ne 0 ]; then
        log_error "Build failed. Aborting production start."
        return 1
    fi

    # 2. Set mode to prod
    MODE="prod"

    # 3. Start infrastructure
    start_infra
    local infra_fail=$?
    if [ $infra_fail -gt 0 ]; then
        log_warning "Some infrastructure services failed to start"
    fi

    # 4. API server
    start_api
    local api_result=$?

    # 5. Frontend
    start_frontend
    local fe_result=$?

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  Production Start Summary${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local result=0

    if is_postgres_running; then
        echo -e "  ${GREEN}● PostgreSQL${NC}  port $POSTGRES_PORT  db: $DB_NAME"
    else
        echo -e "  ${RED}● PostgreSQL${NC}  NOT RUNNING"
        result=1
    fi

    if is_redis_running; then
        echo -e "  ${GREEN}● Redis${NC}       port $REDIS_PORT"
    else
        echo -e "  ${RED}● Redis${NC}       NOT RUNNING"
        result=1
    fi

    if is_minio_running; then
        echo -e "  ${GREEN}● MinIO${NC}       port $MINIO_PORT  bucket: zartsa"
    else
        echo -e "  ${RED}● MinIO${NC}       NOT RUNNING"
        result=1
    fi

    if [ $api_result -eq 0 ]; then
        echo -e "  ${GREEN}● API Server${NC}  port $API_PORT  http://localhost:$API_PORT/health  (PROD)"
    else
        echo -e "  ${RED}● API Server${NC}  FAILED TO START"
        result=1
    fi

    if [ $fe_result -eq 0 ]; then
        echo -e "  ${GREEN}● Frontend${NC}    port $FRONTEND_PORT  http://localhost:$FRONTEND_PORT  (PROD)"
    else
        echo -e "  ${RED}● Frontend${NC}    FAILED TO START"
        result=1
    fi

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ $result -eq 0 ]; then
        log_success "All services started in PRODUCTION mode. Access: http://localhost:$FRONTEND_PORT"
    else
        log_error "Some services failed to start"
    fi

    return $result
}

# =============================================================================
# START / STOP / RESTART ALL
# =============================================================================

start_all() {
    log_header "Starting all services [$(mode_label)]"
    local result=0

    # 1. Infrastructure first
    start_infra
    local infra_fail=$?
    if [ $infra_fail -gt 0 ]; then
        log_warning "Some infrastructure services failed to start"
    fi

    # 2. API server (depends on infra)
    start_api
    local api_result=$?

    # 3. Frontend (depends on API)
    start_frontend
    local fe_result=$?

    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  Start Summary${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # PostgreSQL
    if is_postgres_running; then
        echo -e "  ${GREEN}● PostgreSQL${NC}  port $POSTGRES_PORT  db: $DB_NAME"
    else
        echo -e "  ${RED}● PostgreSQL${NC}  NOT RUNNING"
        result=1
    fi

    # Redis
    if is_redis_running; then
        echo -e "  ${GREEN}● Redis${NC}       port $REDIS_PORT"
    else
        echo -e "  ${RED}● Redis${NC}       NOT RUNNING"
        result=1
    fi

    # MinIO
    if is_minio_running; then
        echo -e "  ${GREEN}● MinIO${NC}       port $MINIO_PORT  bucket: zartsa"
    else
        echo -e "  ${RED}● MinIO${NC}       NOT RUNNING"
        result=1
    fi

    # API
    if [ $api_result -eq 0 ]; then
        echo -e "  ${GREEN}● API Server${NC}  port $API_PORT  http://localhost:$API_PORT/health"
    else
        echo -e "  ${RED}● API Server${NC}  FAILED TO START"
        result=1
    fi

    # Frontend
    if [ $fe_result -eq 0 ]; then
        echo -e "  ${GREEN}● Frontend${NC}    port $FRONTEND_PORT  http://localhost:$FRONTEND_PORT"
    else
        echo -e "  ${RED}● Frontend${NC}    FAILED TO START"
        result=1
    fi

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ $result -eq 0 ]; then
        log_success "All services started. Access: http://localhost:$FRONTEND_PORT"
    else
        log_error "Some services failed to start"
    fi

    return $result
}

stop_all() {
    log_header "Stopping all services"

    # Stop in reverse order: app layer first, then infra
    stop_frontend
    stop_api
    stop_prisma_studio
    stop_infra

    log_success "All services stopped"
}

restart_all() {
    stop_all
    sleep 2
    start_all
}

# =============================================================================
# STATUS
# =============================================================================

_service_status_line() {
    local label=$1
    local port=$2
    local extra=$3

    if port_is_open "$port"; then
        local pid=$(port_pid "$port")
        local pid_info=""
        [ -n "$pid" ] && pid_info=" (PID: $pid)"
        echo -e "  ${GREEN}● ${label}${NC}  port ${port}${pid_info}  ${extra}"
    else
        echo -e "  ${RED}● ${label}${NC}  port ${port}  ${RED}Stopped${NC}"
    fi
}

_systemd_status_line() {
    local label=$1
    local svc=$2
    local port=$3
    local extra=$4

    if systemctl is-active --quiet "$svc" 2>/dev/null || port_is_open "$port"; then
        local pid=$(port_pid "$port")
        local pid_info=""
        [ -n "$pid" ] && pid_info=" (PID: $pid)"
        echo -e "  ${GREEN}● ${label}${NC}  port ${port}${pid_info}  ${extra}"
    else
        echo -e "  ${RED}● ${label}${NC}  port ${port}  ${RED}Stopped${NC}"
    fi
}

check_status() {
    log_header "ZARTSA Service Status [$(mode_label)]"

    echo -e "  ${BOLD}Infrastructure${NC}"
    echo -e "  ${CYAN}─────────────────────────────────────────────${NC}"
    _systemd_status_line "PostgreSQL " "postgresql" "$POSTGRES_PORT" "db: $DB_NAME"
    _systemd_status_line "Redis      " "redis-server" "$REDIS_PORT" ""
    _systemd_status_line "MinIO      " "minio" "$MINIO_PORT" "bucket: zartsa"

    echo ""
    echo -e "  ${BOLD}Application${NC}"
    echo -e "  ${CYAN}─────────────────────────────────────────────${NC}"
    _service_status_line "API Server " "$API_PORT" "http://localhost:$API_PORT/health"
    _service_status_line "Frontend   " "$FRONTEND_PORT" "http://localhost:$FRONTEND_PORT"

    echo ""
    echo -e "  ${BOLD}Dev Tools${NC}"
    echo -e "  ${CYAN}─────────────────────────────────────────────${NC}"
    _service_status_line "Prisma Std " "$PRISMA_STUDIO_PORT" "http://localhost:$PRISMA_STUDIO_PORT"

    echo ""
}

# =============================================================================
# LOGS
# =============================================================================

show_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"

    case "$service" in
        api|server|backend)
            log_info "API server logs (last $lines lines):"
            tail -n "$lines" "$API_LOG" 2>/dev/null || log_error "No API log found at $API_LOG"
            ;;
        frontend|client|web)
            log_info "Frontend logs (last $lines lines):"
            tail -n "$lines" "$FRONTEND_LOG" 2>/dev/null || log_error "No frontend log found at $FRONTEND_LOG"
            ;;
        prisma-studio|studio)
            log_info "Prisma Studio logs (last $lines lines):"
            tail -n "$lines" "$PRISMA_STUDIO_LOG" 2>/dev/null || log_error "No Prisma Studio log found at $PRISMA_STUDIO_LOG"
            ;;
        postgres|postgresql)
            log_info "PostgreSQL logs (last $lines lines):"
            if [ -f /var/log/postgresql/postgresql-16-main.log ]; then
                sudo tail -n "$lines" /var/log/postgresql/postgresql-16-main.log 2>/dev/null || tail -n "$lines" /var/log/postgresql/postgresql-16-main.log 2>/dev/null || log_error "Could not read PostgreSQL logs (try: sudo ./manage.sh logs postgres)"
            elif [ -f /var/log/postgresql/postgresql-15-main.log ]; then
                sudo tail -n "$lines" /var/log/postgresql/postgresql-15-main.log 2>/dev/null || tail -n "$lines" /var/log/postgresql/postgresql-15-main.log 2>/dev/null || log_error "Could not read PostgreSQL logs"
            else
                journalctl -u postgresql -n "$lines" --no-pager 2>/dev/null || log_error "Could not read PostgreSQL logs"
            fi
            ;;
        redis)
            log_info "Redis logs (last $lines lines):"
            if [ -f /var/log/redis/redis-server.log ]; then
                tail -n "$lines" /var/log/redis/redis-server.log 2>/dev/null
            else
                # Redis was started with --daemonize yes, logs go to stdout by default
                log_info "Redis running in background mode (check /var/log/redis/ or use redis-cli INFO)"
            fi
            ;;
        minio)
            log_info "MinIO logs (last $lines lines):"
            tail -n "$lines" /tmp/minio.log 2>/dev/null || log_error "Could not read MinIO logs (check /tmp/minio.log)"
            ;;
        all|"")
            for svc_label in "API server:$API_LOG" "Frontend:$FRONTEND_LOG" "Prisma Studio:$PRISMA_STUDIO_LOG"; do
                local name="${svc_label%%:*}"
                local file="${svc_label##*:}"
                echo ""
                log_info "=== $name (last 30 lines) ==="
                tail -n 30 "$file" 2>/dev/null || log_error "No log found at $file"
            done
            ;;
        *)
            log_error "Unknown service: $service"
            log_info "Valid: api, frontend, prisma-studio, postgres, redis, minio, all"
            ;;
    esac
}

tail_logs() {
    local service="${1:-all}"

    case "$service" in
        api|server|backend)
            log_info "Tailing API server logs (Ctrl+C to stop)..."
            tail -f "$API_LOG" 2>/dev/null || log_error "No API log found"
            ;;
        frontend|client|web)
            log_info "Tailing frontend logs (Ctrl+C to stop)..."
            tail -f "$FRONTEND_LOG" 2>/dev/null || log_error "No frontend log found"
            ;;
        prisma-studio|studio)
            log_info "Tailing Prisma Studio logs (Ctrl+C to stop)..."
            tail -f "$PRISMA_STUDIO_LOG" 2>/dev/null || log_error "No Prisma Studio log found"
            ;;
        all|"")
            log_info "Tailing all logs (Ctrl+C to stop)..."
            tail -f "$API_LOG" "$FRONTEND_LOG" "$PRISMA_STUDIO_LOG" 2>/dev/null || log_error "No log files found"
            ;;
        *)
            log_error "Unknown service: $service"
            ;;
    esac
}

# =============================================================================
# DATABASE COMMANDS
# =============================================================================

db_push() {
    log_info "Pushing database schema..."
    cd "$APP_DIR"
    npm run db:push
    log_success "Schema pushed"
}

db_seed() {
    log_info "Seeding database..."
    cd "$APP_DIR"
    npm run db:seed
    log_success "Database seeded"
}

db_studio() {
    if is_prisma_studio_running; then
        log_info "Prisma Studio already running on port $PRISMA_STUDIO_PORT"
        echo -e "  ${BLUE}→ http://localhost:$PRISMA_STUDIO_PORT${NC}"
    else
        start_prisma_studio
    fi
}

db_generate() {
    log_info "Generating Prisma client..."
    cd "$APP_DIR/server"
    npx prisma generate
    log_success "Prisma client generated"
}

db_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$APP_DIR/backups/zartsa_${timestamp}.sql.gz"
    mkdir -p "$APP_DIR/backups"
    log_info "Backing up database '$DB_NAME'..."
    PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME" | gzip > "$backup_file"
    if [ $? -eq 0 ]; then
        log_success "Database backed up to $backup_file"
    else
        log_error "Database backup failed"
        return 1
    fi
}

db_restore() {
    local backup_file="${2:-}"
    if [ -z "$backup_file" ]; then
        # Find the most recent backup
        backup_file=$(ls -t "$APP_DIR"/backups/zartsa_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$backup_file" ]; then
            log_error "No backup files found in $APP_DIR/backups/"
            return 1
        fi
        log_info "Using most recent backup: $backup_file"
    fi

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_warning "This will REPLACE the current database '$DB_NAME' with the backup!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        log_info "Cancelled"
        return 0
    fi

    log_info "Restoring database from $backup_file..."
    gunzip -c "$backup_file" | PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -p "$POSTGRES_PORT" -d "$DB_NAME"
    if [ $? -eq 0 ]; then
        log_success "Database restored from $backup_file"
    else
        log_error "Database restore failed"
        return 1
    fi
}

db_reset() {
    log_warning "This will DELETE ALL DATA from database '$DB_NAME'!"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        log_info "Resetting database..."
        cd "$APP_DIR"
        npm run db:push -- --force-reset
        log_success "Database reset"
    else
        log_info "Cancelled"
    fi
}

# =============================================================================
# BUILD & UTILITIES
# =============================================================================

build_all() {
    log_info "Building all workspaces [$(mode_label)]..."
    cd "$APP_DIR"
    npm run build
    log_success "Build complete"
}

install_deps() {
    log_info "Installing dependencies..."
    cd "$APP_DIR"
    npm install
    log_success "Dependencies installed"
}

clean_build() {
    log_info "Cleaning build artifacts..."
    rm -rf "$APP_DIR/client/.next"
    rm -rf "$APP_DIR/server/dist"
    rm -rf "$APP_DIR/node_modules/.cache"
    log_success "Cleaned"
}

health_check() {
    log_info "Running health checks..."
    echo ""

    # Check each service port
    for svc in "PostgreSQL:$POSTGRES_PORT" "Redis:$REDIS_PORT" "MinIO:$MINIO_PORT" "API:$API_PORT" "Frontend:$FRONTEND_PORT"; do
        local name="${svc%%:*}"
        local port="${svc##*:}"
        if port_is_open "$port"; then
            echo -e "  ${GREEN}● $name${NC} port $port — listening"
        else
            echo -e "  ${RED}● $name${NC} port $port — not listening"
        fi
    done

    # HTTP health checks
    echo ""
    if http_responds "$API_PORT"; then
        echo -e "  ${GREEN}● API /health${NC} — responding"
    else
        echo -e "  ${RED}● API /health${NC} — not responding"
    fi

    if http_responds "$FRONTEND_PORT"; then
        echo -e "  ${GREEN}● Frontend${NC} — responding"
    else
        echo -e "  ${RED}● Frontend${NC} — not responding"
    fi

    echo ""
}

# =============================================================================
# HELP
# =============================================================================

show_help() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   ZARTSA — Service Manager                             ║${NC}"
    echo -e "${CYAN}║   Zanzibar Road Transport & Safety Authority           ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Mode: ${BOLD}dev${NC} (default) or ${BOLD}prod${NC} (set ZARTSA_MODE=prod)"
    echo ""
    echo -e "  ${BOLD}Usage:${NC} ./manage.sh <command> [service]"
    echo ""
    echo -e "  ${BOLD}Service Control:${NC}"
    echo "    start [service]       Start service or all (dev mode)"
    echo "    start-prod            Build & start all in PRODUCTION mode"
    echo "    stop [service]        Stop service or all"
    echo "    restart [service]     Restart service or all"
    echo "    status                Status of all services"
    echo "    health                HTTP health checks"
    echo ""
    echo -e "  ${BOLD}Services:${NC}"
    echo "    all          All services (default)"
    echo "    postgres     PostgreSQL database"
    echo "    redis        Redis server"
    echo "    minio        MinIO object storage"
    echo "    api          Express API server"
    echo "    frontend     Next.js frontend"
    echo "    infra        Infrastructure only (postgres + redis + minio)"
    echo "    prisma-studio  Prisma Studio (database GUI)"
    echo ""
    echo -e "  ${BOLD}Database:${NC}"
    echo "    db-push               Push schema to database"
    echo "    db-seed               Seed database with test data"
    echo "    db-generate           Generate Prisma client"
    echo "    db-backup             Backup database to backups/ directory"
    echo "    db-restore [file]     Restore database from backup (uses latest if no file given)"
    echo "    db-reset              Reset database (destructive)"
    echo "    db-studio             Open Prisma Studio"
    echo ""
    echo -e "  ${BOLD}Logs:${NC}"
    echo "    logs [service]        View logs (api, frontend, prisma-studio, postgres, redis, minio)"
    echo "    tail [service]        Tail logs in real-time"
    echo ""
    echo -e "  ${BOLD}Utilities:${NC}"
    echo "    install               Install npm dependencies"
    echo "    build                 Build all workspaces"
    echo "    clean                 Clean build artifacts"
    echo ""
    echo -e "  ${BOLD}Examples:${NC}"
    echo "    ./manage.sh start              # Start everything in dev mode"
    echo "    ./manage.sh start-prod         # Build & start everything in production mode"
    echo "    ZARTSA_MODE=prod ./manage.sh start  # Start in production mode"
    echo "    ./manage.sh start api          # Start only the API server"
    echo "    ./manage.sh stop frontend      # Stop only the frontend"
    echo "    ./manage.sh logs api           # View API logs"
    echo "    ./manage.sh tail frontend      # Tail frontend logs"
    echo "    ./manage.sh status             # Check all services"
    echo "    ./manage.sh health             # HTTP health checks"
    echo ""
}

# =============================================================================
# INTERACTIVE MENU
# =============================================================================

show_menu() {
    local mode_str="$(mode_label)"

    echo ""
    echo -e "${CYAN}══════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ZARTSA Service Manager  [${BOLD}${mode_str}${NC}${CYAN}]${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}Infrastructure${NC}"
    echo "    1)  Start all infrastructure"
    echo "    2)  Stop all infrastructure"
    echo "    3)  Start PostgreSQL"
    echo "    4)  Start Redis"
    echo "    5)  Start MinIO"
    echo ""
    echo -e "  ${BOLD}Application${NC}"
    echo "    6)  Start all (infra + api + frontend) [DEV]"
    echo "    7)  Start all (build + start)         [PROD]"
    echo "    8)  Stop all"
    echo "    9)  Restart all"
    echo "   10)  Start API server"
    echo "   11)  Stop API server"
    echo "   12)  Restart API server"
    echo "   13)  Start Frontend"
    echo "   14)  Stop Frontend"
    echo "   15)  Restart Frontend"
    echo ""
    echo -e "  ${BOLD}Dev Tools${NC}"
    echo "   16)  Start Prisma Studio"
    echo "   17)  Stop Prisma Studio"
    echo ""
    echo -e "  ${BOLD}Database${NC}"
    echo "   18)  Push schema"
    echo "   19)  Seed database"
    echo "   20)  Generate Prisma client"
    echo "   21)  Backup database"
    echo "   22)  Restore database"
    echo "   23)  Reset database"
    echo ""
    echo -e "  ${BOLD}Monitoring${NC}"
    echo "   24)  Check status"
    echo "   25)  Health check"
    echo "   26)  View API logs"
    echo "   27)  View Frontend logs"
    echo "   28)  View all logs"
    echo "   29)  Tail API logs"
    echo "   30)  Tail Frontend logs"
    echo "   31)  Tail all logs"
    echo ""
    echo -e "  ${BOLD}Utilities${NC}"
    echo "   32)  Install dependencies"
    echo "   33)  Build all"
    echo "   34)  Clean build artifacts"
    echo "   35)  Toggle dev/prod mode"
    echo ""
    echo "    0)  Exit"
    echo -e "${CYAN}══════════════════════════════════════════════${NC}"
}

run_interactive() {
    while true; do
        show_menu
        echo -n "  Enter choice [0-35]: "
        read -r choice

        case $choice in
            # Infrastructure
            1)  start_infra ;;
            2)  stop_infra ;;
            3)  start_postgres ;;
            4)  start_redis ;;
            5)  start_minio ;;
            # Application
            6)  start_all ;;
            7)  start_prod_all ;;
            8)  stop_all ;;
            9)  restart_all ;;
            10) start_api ;;
            11) stop_api ;;
            12) restart_api ;;
            13) start_frontend ;;
            14) stop_frontend ;;
            15) restart_frontend ;;
            # Dev tools
            16) start_prisma_studio ;;
            17) stop_prisma_studio ;;
            # Database
            18) db_push ;;
            19) db_seed ;;
            20) db_generate ;;
            21) db_backup ;;
            22) db_restore ;;
            23) db_reset ;;
            # Monitoring
            24) check_status ;;
            25) health_check ;;
            26) show_logs api ;;
            27) show_logs frontend ;;
            28) show_logs all ;;
            29) tail_logs api ;;
            30) tail_logs frontend ;;
            31) tail_logs all ;;
            # Utilities
            32) install_deps ;;
            33) build_all ;;
            34) clean_build ;;
            35)
                if is_dev; then
                    MODE="prod"
                    log_info "Switched to PRODUCTION mode"
                else
                    MODE="dev"
                    log_info "Switched to DEVELOPMENT mode"
                fi
                ;;
            0)  log_info "Bye"; exit 0 ;;
            *)  log_error "Invalid option" ;;
        esac

        # Don't pause for tail commands
        case $choice in
            27|28|29) ;;
            *)
                echo ""
                echo -n "  Press Enter to continue..."
                read -r
                ;;
        esac
    done
}

# =============================================================================
# COMMAND ROUTER
# =============================================================================

# Service name resolver for start/stop/restart
resolve_service() {
    local action=$1
    local service="${2:-all}"

    case "$service" in
        all|"")         ${action}_all ;;
        infra)          ${action}_infra ;;
        postgres|postgresql) ${action}_postgres ;;
        redis)          ${action}_redis ;;
        minio)          ${action}_minio ;;
        api|server|backend) ${action}_api ;;
        frontend|client|web) ${action}_frontend ;;
        prisma-studio|studio) ${action}_prisma_studio ;;
        *)
            log_error "Unknown service: $service"
            log_info "Valid: all, infra, postgres, redis, minio, api, frontend, prisma-studio"
            exit 1
            ;;
    esac
}

case "${1:-}" in
    start)
        resolve_service start "${2:-all}"
        ;;
    start-prod)
        start_prod_all
        ;;
    stop)
        resolve_service stop "${2:-all}"
        ;;
    restart)
        resolve_service restart "${2:-all}"
        ;;
    status)
        check_status
        ;;
    health)
        health_check
        ;;
    logs)
        show_logs "${2:-all}" "${3:-50}"
        ;;
    tail|tail-logs)
        tail_logs "${2:-all}"
        ;;
    db-push)
        db_push
        ;;
    db-seed)
        db_seed
        ;;
    db-backup)
        db_backup
        ;;
    db-restore)
        db_restore "$2"
        ;;
    db-generate)
        db_generate
        ;;
    db-reset)
        db_reset
        ;;
    db-studio)
        db_studio
        ;;
    install)
        install_deps
        ;;
    build)
        build_all
        ;;
    clean)
        clean_build
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        run_interactive
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

exit 0