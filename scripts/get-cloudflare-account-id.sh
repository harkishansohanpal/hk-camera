#!/bin/bash
# Script to get Cloudflare Account ID
# Run this to get your account ID for the GitHub secrets

echo "Getting Cloudflare Account ID..."
echo "Please ensure you're logged into wrangler: npx wrangler login"
echo ""

# Try to get account ID from wrangler
if command -v wrangler &> /dev/null; then
    echo "Attempting to get account ID from wrangler..."
    ACCOUNT_ID=$(npx wrangler whoami 2>/dev/null | grep -o 'Account ID: [^ ]*' | cut -d' ' -f3)
    if [ ! -z "$ACCOUNT_ID" ]; then
        echo "Account ID found: $ACCOUNT_ID"
        echo ""
        echo "Add this to your GitHub secrets:"
        echo "CLOUDFLARE_ACCOUNT_ID=$ACCOUNT_ID"
    else
        echo "Could not get account ID from wrangler"
        echo "Please check your wrangler login status: npx wrangler login"
    fi
else
    echo "wrangler not found. Please install it: npm install -g wrangler"
fi

echo ""
echo "Alternative method:"
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Look at the URL - the account ID is in the path"
echo "3. Or go to Account > Overview to find your Account ID"
echo ""
echo "Then add it to GitHub secrets:"
echo "gh secret set CLOUDFLARE_ACCOUNT_ID"