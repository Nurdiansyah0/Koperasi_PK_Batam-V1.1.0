#!/bin/bash
# =======================================================
# Koperasi PK Batam - Production Deployment Script
# Target: koperasipkbatam.my.id (Shared Apache Hosting)
#
# Usage:
#   ./deploy.sh          → Full deploy (frontend + backend)
#   ./deploy.sh frontend → Frontend only
#   ./deploy.sh backend  → Backend only
# =======================================================

set -e

REMOTE_HOST="koperasipkbatam.my.id"
REMOTE_PORT="6401"
REMOTE_USER="dqfqxjrd"
REMOTE_PATH="/home/$REMOTE_USER/public_html"
# Always resolve key relative to this script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="$SCRIPT_DIR/id_rsa"
SSH="ssh -i $SSH_KEY -p $REMOTE_PORT -o StrictHostKeyChecking=no"
SCP="scp -i $SSH_KEY -P $REMOTE_PORT -o StrictHostKeyChecking=no"
DEPLOY_TARGET="${1:-all}"

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
    tar -czf /tmp/koperasi_upload.tar.gz -C "$LOCAL_DIR" .
    $SCP /tmp/koperasi_upload.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_upload.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR && tar -xzf /tmp/koperasi_upload.tar.gz -C $REMOTE_DIR && rm /tmp/koperasi_upload.tar.gz"
    rm /tmp/koperasi_upload.tar.gz
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
    tar -czf /tmp/koperasi_frontend.tar.gz -C "$TMPDIR" .
    rm -rf "$TMPDIR"
    $SCP /tmp/koperasi_frontend.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_frontend.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "tar -xzf /tmp/koperasi_frontend.tar.gz -C $REMOTE_PATH && rm /tmp/koperasi_frontend.tar.gz && chmod 750 $REMOTE_PATH"
    rm /tmp/koperasi_frontend.tar.gz

    # Upload .htaccess last (always overwrite)
    $SCP "$SCRIPT_DIR/public_html/.htaccess" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/.htaccess"

    echo "[FRONTEND] ✓ Uploaded successfully"
    cd "$SCRIPT_DIR"
}

# ── Laravel Backend Deploy ─────────────────────────────
deploy_backend() {
    echo ""
    echo "[BACKEND] Checking server .env..."

    if ! $SSH "$REMOTE_USER@$REMOTE_HOST" "test -f $REMOTE_PATH/laravel/.env"; then
        echo ""
        echo "⚠️  No .env on server at $REMOTE_PATH/laravel/.env"
        echo "   Run these steps first:"
        echo ""
        echo "   1) Upload the template:"
        echo "      $SCP $SCRIPT_DIR/backend-laravel/.env.production.example $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/laravel/.env"
        echo ""
        echo "   2) Edit DB credentials on server:"
        echo "      $SSH $REMOTE_USER@$REMOTE_HOST 'nano $REMOTE_PATH/laravel/.env'"
        echo ""
        echo "   3) Then re-run:  ./deploy.sh backend"
        echo ""
        exit 1
    fi

    echo "[BACKEND] Packing Laravel (excluding vendor, .env, logs)..."
    TMPDIR=$(mktemp -d)
    cp -r "$SCRIPT_DIR/backend-laravel/." "$TMPDIR/"
    rm -rf "$TMPDIR/vendor"
    rm -rf "$TMPDIR/node_modules"
    rm -f  "$TMPDIR/.env"
    rm -f  "$TMPDIR/.env.production.example"
    rm -f  "$TMPDIR/server.log"
    find "$TMPDIR/storage" -name "*.log" -delete
    find "$TMPDIR/storage/framework" -name "*.php" -not -name ".gitignore" -delete 2>/dev/null || true

    tar -czf /tmp/koperasi_backend.tar.gz -C "$TMPDIR" .
    rm -rf "$TMPDIR"

    echo "[BACKEND] Uploading to server..."
    $SCP /tmp/koperasi_backend.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/koperasi_backend.tar.gz"
    $SSH "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH/laravel && tar -xzf /tmp/koperasi_backend.tar.gz -C $REMOTE_PATH/laravel && rm /tmp/koperasi_backend.tar.gz"
    rm /tmp/koperasi_backend.tar.gz

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
    PHP_BIN="php"
fi

# Auto-detect Composer binary
if [ -f "/usr/local/bin/composer" ]; then
    COMPOSER_CMD="$PHP_BIN /usr/local/bin/composer"
elif [ -f "$HOME/composer.phar" ]; then
    COMPOSER_CMD="$PHP_BIN $HOME/composer.phar"
elif which composer >/dev/null 2>&1; then
    COMPOSER_CMD="composer"
else
    COMPOSER_CMD="$PHP_BIN /usr/local/bin/composer"
fi

echo "  → Installing Composer dependencies..."
$COMPOSER_CMD install --no-dev --optimize-autoloader --quiet

echo "  → Running database migrations..."
$PHP_BIN artisan migrate --force

echo "  → Generating app key (if not set)..."
grep -q "^APP_KEY=.\+" .env || $PHP_BIN artisan key:generate --no-interaction --force

echo "  → Caching config, routes & views..."
$PHP_BIN artisan config:clear && $PHP_BIN artisan config:cache
$PHP_BIN artisan route:clear && $PHP_BIN artisan route:cache
$PHP_BIN artisan view:clear && $PHP_BIN artisan view:cache

echo "  → Setting storage permissions..."
chmod -R 775 storage bootstrap/cache
chmod 644 .env

echo "  ✓ Server setup complete"
ENDSSH

    echo "[BACKEND] ✓ Deployed successfully"
}

# ── Run ────────────────────────────────────────────────
case "$DEPLOY_TARGET" in
    frontend) deploy_frontend ;;
    backend)  deploy_backend ;;
    all|*)    deploy_frontend; deploy_backend ;;
esac

echo ""
echo "=============================================="
echo "  ✅ Deploy Complete!"
echo "  🌐 App:  https://koperasipkbatam.my.id"
echo "  🔌 API:  https://koperasipkbatam.my.id/laravel/api"
echo "=============================================="
