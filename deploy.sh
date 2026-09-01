#!/bin/bash
set -e

REMOTE_USER="dqfqxjrd"
REMOTE_HOST="koperasipkbatam.my.id"
REMOTE_PORT="6401"
REMOTE_DIR="/home/dqfqxjrd/public_html"
LOCAL_DIR="./public_html"
SSH_KEY="./id_rsa"
SSH_CMD="ssh -i $SSH_KEY -p $REMOTE_PORT -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST"
SCP_CMD="scp -i $SSH_KEY -P $REMOTE_PORT -o StrictHostKeyChecking=no"

chmod 600 $SSH_KEY

echo "🚀 Compressing local files..."
cd $LOCAL_DIR
tar -czf /tmp/legacy_deploy.tar.gz --exclude="tests" --exclude="phpunit.xml" --exclude=".gitignore" ./* ./.[!.]* 2>/dev/null || true
cd ..

echo "🧹 Wiping production server directory (Removing Laravel & React assets)..."
$SSH_CMD "find $REMOTE_DIR -mindepth 1 -maxdepth 1 ! -name '.well-known' ! -name 'cgi-bin' -exec rm -rf {} +"

echo "📤 Uploading files to server..."
$SCP_CMD /tmp/legacy_deploy.tar.gz $REMOTE_USER@$REMOTE_HOST:/tmp/legacy_deploy.tar.gz

echo "📦 Extracting files on server..."
$SSH_CMD "tar -xzf /tmp/legacy_deploy.tar.gz -C $REMOTE_DIR && rm /tmp/legacy_deploy.tar.gz"

echo "✅ Deployment completed successfully!"
rm /tmp/legacy_deploy.tar.gz
