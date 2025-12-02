#!/bin/bash

# Test Upload Script
# This script demonstrates a full image upload flow and verifies the generated public URL.
#
# Prerequisites:
# - Server running on localhost:3000
# - Valid admin session (or disable auth for testing)
# - NEXT_PUBLIC_SUPABASE_URL environment variable set
#
# Usage:
#   ./scripts/test-upload.sh [image-file] [club-id]
#
# Example:
#   ./scripts/test-upload.sh test-image.jpg abc-123-def

set -e

# Default values
IMAGE_FILE="${1:-test-image.jpg}"
CLUB_ID="${2:-test-club-id}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Image Upload Test ===${NC}"
echo "Base URL: $BASE_URL"
echo "Image File: $IMAGE_FILE"
echo "Club ID: $CLUB_ID"
echo ""

# Check if image file exists or create a test image
if [ ! -f "$IMAGE_FILE" ]; then
  echo -e "${YELLOW}Creating test image...${NC}"
  # Create a simple 1x1 pixel red PNG
  printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x01\x01\x01\x00\x05\xfe\x01\x4a\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/test-image.png
  IMAGE_FILE="/tmp/test-image.png"
  echo "Created test image at $IMAGE_FILE"
fi

# Step 1: Upload the image
echo -e "\n${YELLOW}Step 1: Uploading image...${NC}"
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@$IMAGE_FILE" \
  "$BASE_URL/api/admin/clubs/$CLUB_ID/images" 2>&1)

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✓ Upload successful!${NC}"
  
  # Extract the URL from the response
  URL=$(echo "$RESPONSE_BODY" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  KEY=$(echo "$RESPONSE_BODY" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
  
  echo "Stored path: $URL"
  echo "Image key: $KEY"
  
  # Step 2: Construct the public URL
  echo -e "\n${YELLOW}Step 2: Constructing public URL...${NC}"
  if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    PUBLIC_URL="$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/uploads/$URL"
    echo "Public URL: $PUBLIC_URL"
    
    # Step 3: Verify the URL is accessible
    echo -e "\n${YELLOW}Step 3: Verifying public URL...${NC}"
    VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_URL")
    
    if [ "$VERIFY_RESPONSE" = "200" ]; then
      echo -e "${GREEN}✓ Public URL returns 200 - Image is accessible!${NC}"
    else
      echo -e "${RED}✗ Public URL returned HTTP $VERIFY_RESPONSE${NC}"
      echo "The image may not be accessible. Check bucket permissions."
    fi
  else
    echo -e "${YELLOW}NEXT_PUBLIC_SUPABASE_URL not set - skipping URL verification${NC}"
    echo "In development mode, the stored URL is a mock path: $URL"
  fi
  
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}✗ Authentication required${NC}"
  echo "This script requires an authenticated admin session."
  echo "For testing without auth, temporarily modify the API route."
  
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "${RED}✗ Forbidden - Admin role required${NC}"
  
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗ Club not found${NC}"
  echo "Make sure the club ID '$CLUB_ID' exists in the database."
  
else
  echo -e "${RED}✗ Upload failed with HTTP $HTTP_CODE${NC}"
fi

echo -e "\n${YELLOW}=== Test Complete ===${NC}"
