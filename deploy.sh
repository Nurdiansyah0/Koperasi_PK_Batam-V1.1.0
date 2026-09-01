#!/bin/bash
# Script to deploy public_html contents to the production server

# Variables
REMOTE_USER="dqfqxjrd"
REMOTE_HOST="koperasipkbatam.my.id"
REMOTE_PORT="6401"
REMOTE_DIR="/home/dqfqxjrd/public_html/"
LOCAL_DIR="./public_html/"
SSH_KEY="./id_rsa"

# Ensure SSH key has correct permissions
chmod 600 $SSH_KEY

echo "🚀 Starting deployment to $REMOTE_HOST..."

# Use rsync to upload only updated files. 
# We sync the contents of LOCAL_DIR/ to REMOTE_DIR/
# We exclude tests and the SSH keys themselves just in case.
rsync -avz --no-perms --no-owner --no-group --delete \
  --exclude="tests" \
  --exclude="phpunit.xml" \
  --exclude=".gitignore" \
  --exclude="deploy.sh" \
  -e "ssh -i $SSH_KEY -p $REMOTE_PORT -o StrictHostKeyChecking=no" \
  $LOCAL_DIR $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR

echo "✅ Deployment completed successfully!"
