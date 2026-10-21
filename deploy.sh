#!/bin/bash
# =======================================================
# Koperasi PK Batam - Production Deployment Script
# Target: koperasipkbatam.my.id (Shared Apache Hosting)
#
# Usage:
#   ./deploy.sh          → Full deploy (snapshot + frontend + backend)
#   ./deploy.sh snapshot → Safety snapshot backup only
#   ./deploy.sh frontend → Snapshot + Frontend only
#   ./deploy.sh backend  → Snapshot + Backend only
# =======================================================

set -e

REMOTE_HOST="koperasipkbatam.my.id"
REMOTE_PORT="6401"
REMOTE_USER="dqfqxjrd"
REMOTE_PATH="/home/$REMOTE_USER/public_html"
# Always resolve key relative to this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$DEPLOY_SSH_KEY" ]; then
    SSH_KEY="$DEPLOY_SSH_KEY"
elif [ -f "$HOME/.ssh/koperasi_deploy_ed25519" ]; then
    SSH_KEY="$HOME/.ssh/koperasi_deploy_ed25519"
elif [ -f "$SCRIPT_DIR/id_rsa" ]; then
    SSH_KEY="$SCRIPT_DIR/id_rsa"
else
    echo "ERROR: Deployment SSH key not found."
    exit 1
fi
SSH="ssh -i $SSH_KEY -p $REMOTE_PORT -o StrictHostKeyChecking=yes"
SCP="scp -i $SSH_KEY -P $REMOTE_PORT -o StrictHostKeyChecking=yes"
DEPLOY_TARGET="${1:-all}"
LOCAL_TMP="${TMPDIR:-/tmp}"

chmod 600 "$SSH_KEY"

echo "=============================================="
echo "  Koperasi PK Batam — Production Deploy"
echo "  Target: https://koperasipkbatam.my.id"
echo "=============================================="

# ── Upload via tar+ssh (no rsync needed on server) ─────
upload_dir() {
    local LOCAL_DIR="$1"
    local REMOTE_DIR="$2"
    echo "  → Packing and uploading $(basename $LOCAL_DIR)..."
    tar -czf "$LOCAL_TMP/koperasi_upload.tar.gz" -C "$LOCAL_DIR" .
    $SCP "$LOCAL_TMP/koperasi_upload.tar.gz" "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_upload.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR && tar -xzf /tmp/koperasi_upload.tar.gz -C $REMOTE_DIR && rm /tmp/koperasi_upload.tar.gz"
    rm "$LOCAL_TMP/koperasi_upload.tar.gz"
}

# ── Remote Snapshot Backup (Safety Snapshot) ───────────
snapshot_backup() {
    if [ "$SKIP_SNAPSHOT" = "1" ] || [ "$SKIP_SNAPSHOT" = "true" ]; then
        echo ""
        echo "[SNAPSHOT] Skipping snapshot backup (SKIP_SNAPSHOT is set)."
        return 0
    fi

    local TIMESTAMP
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILENAME="production_public_html_backup_${TIMESTAMP}.tar.gz"
    local BACKUP_PATH="/home/$REMOTE_USER/$BACKUP_FILENAME"

    echo ""
    echo "[SNAPSHOT] Creating safety snapshot backup on server..."
    echo "  Target: $BACKUP_PATH"
    echo "  Source: $REMOTE_PATH"

    $SSH "$REMOTE_USER@$REMOTE_HOST" bash -s "$BACKUP_PATH" "$REMOTE_USER" << 'ENDSSH'
set -e
BACKUP_PATH="$1"
REMOTE_USER="$2"
MIN_SIZE=1048576

echo "  → Archiving /home/$REMOTE_USER/public_html to $BACKUP_PATH..."
tar -czf "$BACKUP_PATH" -C "/home/$REMOTE_USER" public_html

if [ ! -f "$BACKUP_PATH" ]; then
    echo "  ✗ ERROR: Backup file was not created: $BACKUP_PATH" >&2
    exit 1
fi

BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH" 2>/dev/null || stat -f%z "$BACKUP_PATH")
echo "  → Archive created successfully: $BACKUP_PATH ($BACKUP_SIZE bytes)"

if [ "$BACKUP_SIZE" -le "$MIN_SIZE" ]; then
    echo "  ✗ ERROR: Backup archive size ($BACKUP_SIZE bytes) is <= 1MB ($MIN_SIZE bytes)." >&2
    exit 1
fi

echo "  → Verifying archive integrity via tar -tzf..."
tar -tzf "$BACKUP_PATH" | head -n 30 > /dev/null
echo "  ✓ Archive integrity verified. Size: $BACKUP_SIZE bytes (> 1MB)"
ENDSSH

    echo "[SNAPSHOT] ✓ Safety snapshot backup completed and verified."
}

# ── Frontend Build & Deploy ─────────────────────────────
deploy_frontend() {
    echo ""
    echo "[FRONTEND] Building React app..."
    cd "$SCRIPT_DIR/frontend"

    echo "VITE_API_URL=" > .env.production
    npm run build
    echo "[FRONTEND] ✓ Build complete"

    echo "[FRONTEND] Uploading assets to server..."

    # Create a clean temp copy excluding files we don't want to overwrite
    TMPDIR=$(mktemp -d)
    cp -r "$SCRIPT_DIR/public_html/." "$TMPDIR/"
    rm -f "$TMPDIR/.htaccess"     # handled separately
    rm -rf "$TMPDIR/laravel"      # backend folder, not touched by frontend
    rm -rf "$TMPDIR/api"          # legacy PHP, keep on server
    rm -f "$TMPDIR/composer.phar"
    rm -f "$TMPDIR/fix_rocky_bcrypt.php"

    # Upload packed assets
    tar -czf "$LOCAL_TMP/koperasi_frontend.tar.gz" -C "$TMPDIR" .
    rm -rf "$TMPDIR"
    $SCP "$LOCAL_TMP/koperasi_frontend.tar.gz" "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_frontend.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "rm -rf $REMOTE_PATH/assets $REMOTE_PATH/dist $REMOTE_PATH/workbox-*.js && tar -xzf /tmp/koperasi_frontend.tar.gz -C $REMOTE_PATH && rm /tmp/koperasi_frontend.tar.gz && chmod 750 $REMOTE_PATH"
    rm "$LOCAL_TMP/koperasi_frontend.tar.gz"

    # Upload .htaccess last (always overwrite)
    $SCP "$SCRIPT_DIR/public_html/.htaccess" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/.htaccess"

    echo "[FRONTEND] ✓ Uploaded successfully"
    cd "$SCRIPT_DIR"
}

# ── Laravel Backend Deploy ─────────────────────────────
deploy_backend() {
    echo ""
    echo "[BACKEND] Preparing server .env..."
    $SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH/laravel"

    # Auto-restore production .env from verified backup if not already present
    local BACKUP_ENV="/home/$REMOTE_USER/production_public_html_backup_20260927_030311/laravel/.env"
    $SSH "$REMOTE_USER@$REMOTE_HOST" bash -s "$REMOTE_PATH" "$BACKUP_ENV" << 'ENDSSH'
set -e
REMOTE_PATH="$1"
BACKUP_ENV="$2"

if [ ! -f "$REMOTE_PATH/laravel/.env" ]; then
    if [ -f "$BACKUP_ENV" ]; then
        echo "  → Auto-restoring production .env from $BACKUP_ENV..."
        cp "$BACKUP_ENV" "$REMOTE_PATH/laravel/.env"
        chmod 600 "$REMOTE_PATH/laravel/.env"
        echo "  ✓ Production .env restored successfully (mode 0600)."
    else
        echo "  ✗ WARNING: Backup .env not found at $BACKUP_ENV" >&2
    fi
else
    chmod 600 "$REMOTE_PATH/laravel/.env"
fi
ENDSSH

    if ! $SSH "$REMOTE_USER@$REMOTE_HOST" "test -f $REMOTE_PATH/laravel/.env"; then
        echo "  ✗ Production .env is missing on the server."
        echo "    Create/configure $REMOTE_PATH/laravel/.env manually before deployment."
        echo "    deploy.sh will never provision database credentials automatically."
        exit 1
    fi
    echo "  ✓ Production .env exists; preserving server configuration."

    echo "[BACKEND] Packing Laravel (excluding vendor, .env, logs, runtime caches, sqlite, tests)..."
    TMPDIR=$(mktemp -d)
    cp -r "$SCRIPT_DIR/backend-laravel/." "$TMPDIR/"
    rm -rf "$TMPDIR/vendor"
    rm -rf "$TMPDIR/node_modules"
    rm -rf "$TMPDIR/tests"
    rm -f  "$TMPDIR"/.env*
    rm -f  "$TMPDIR/phpunit.xml"
    rm -f  "$TMPDIR/.phpunit.result.cache"
    rm -f  "$TMPDIR/test_results.log"
    rm -f  "$TMPDIR/server.log"
    rm -f  "$TMPDIR"/patch* "$TMPDIR"/fix_* "$TMPDIR"/sync_stok.php

    # Strictly exclude local SQLite databases (database.sqlite, restored.sqlite, testing.sqlite, etc.)
    rm -f "$TMPDIR/database/"*.sqlite*
    find "$TMPDIR" -type f \( -name "*.sqlite" -o -name "*.sqlite-*" -o -name "*.orig" -o -name "*.patch" -o -name "*.rej" \) -delete 2>/dev/null || true

    # Clean local logs
    find "$TMPDIR/storage" -name "*.log" -delete 2>/dev/null || true

    # Never deploy local runtime cache/session/testing state
    find "$TMPDIR/storage/framework/cache/data" -mindepth 1 -not -name ".gitignore" -delete 2>/dev/null || true
    find "$TMPDIR/storage/framework/sessions" -mindepth 1 -not -name ".gitignore" -delete 2>/dev/null || true
    find "$TMPDIR/storage/framework/testing" -mindepth 1 -not -name ".gitignore" -delete 2>/dev/null || true

    # Remove compiled Blade/runtime artifacts
    find "$TMPDIR/storage/framework/views" -type f ! -name ".gitignore" -delete 2>/dev/null || true
    find "$TMPDIR/storage/framework" -name "*.php" -not -name ".gitignore" -delete 2>/dev/null || true

    # Remove generated bootstrap cache
    rm -f "$TMPDIR/bootstrap/cache/"*.php

    # Ensure required framework runtime directory structure exists
    mkdir -p "$TMPDIR/storage/framework/cache/data" \
             "$TMPDIR/storage/framework/sessions" \
             "$TMPDIR/storage/framework/views" \
             "$TMPDIR/storage/framework/testing" \
             "$TMPDIR/storage/logs" \
             "$TMPDIR/bootstrap/cache"

    tar -czf "$LOCAL_TMP/koperasi_backend.tar.gz" -C "$TMPDIR" .
    rm -rf "$TMPDIR"

    echo "[BACKEND] Uploading to server..."
    $SCP "$LOCAL_TMP/koperasi_backend.tar.gz" "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_backend.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH/laravel && tar -xzf /tmp/koperasi_backend.tar.gz -C $REMOTE_PATH/laravel && rm /tmp/koperasi_backend.tar.gz"
    rm "$LOCAL_TMP/koperasi_backend.tar.gz"

    echo "[BACKEND] Running post-deploy setup on server..."
    $SSH "$REMOTE_USER@$REMOTE_HOST" bash << 'ENDSSH'
set -e
cd ~/public_html/laravel
chmod 755 .
chmod 755 public

# Auto-detect PHP 8.2 EA path or system php
if [ -x "/opt/cpanel/ea-php82/root/usr/bin/php" ]; then
    PHP_BIN="/opt/cpanel/ea-php82/root/usr/bin/php"
else
    PHP_BIN="$(which php)"
fi

# Auto-detect Composer binary
if [ -f "/usr/local/bin/composer" ]; then
    COMPOSER_BIN="/usr/local/bin/composer"
elif [ -f "$HOME/composer.phar" ]; then
    COMPOSER_BIN="$HOME/composer.phar"
elif which composer >/dev/null 2>&1; then
    COMPOSER_BIN="$(which composer)"
else
    COMPOSER_BIN="/usr/local/bin/composer"
fi

COMPOSER_CMD="$PHP_BIN $COMPOSER_BIN"

echo "  → Installing Composer dependencies ($COMPOSER_CMD)..."
$COMPOSER_CMD install --no-dev --optimize-autoloader

echo "  → Verifying APP_KEY (generating if not set)..."
grep -q "^APP_KEY=.\+" .env || $PHP_BIN artisan key:generate --no-interaction --force

echo "  → Running database migrations..."
$PHP_BIN artisan migrate --force

echo "  → Caching config, routes & views..."
$PHP_BIN artisan config:clear && $PHP_BIN artisan config:cache
$PHP_BIN artisan route:clear && $PHP_BIN artisan route:cache
$PHP_BIN artisan view:clear && $PHP_BIN artisan view:cache

echo "  → Setting storage permissions..."
chmod -R 775 storage bootstrap/cache
chmod 600 .env

echo "  ✓ Server setup complete"
ENDSSH

    echo "[BACKEND] ✓ Deployed successfully"
}

# ── Run ────────────────────────────────────────────────
case "$DEPLOY_TARGET" in
    snapshot) snapshot_backup ;;
    frontend) snapshot_backup; deploy_frontend ;;
    backend)  snapshot_backup; deploy_backend ;;
    all|*)    snapshot_backup; deploy_frontend; deploy_backend ;;
esac

echo ""
echo "=============================================="
echo "  ✅ Deploy Complete!"
echo "  🌐 App:  https://koperasipkbatam.my.id"
echo "  🔌 API:  https://koperasipkbatam.my.id/laravel/api"
echo "=============================================="
