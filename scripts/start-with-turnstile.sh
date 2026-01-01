#!/bin/bash

# LibreChat Turnstile Docker Startup Script
# This script checks for Turnstile environment variables and starts LibreChat accordingly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 LibreChat Turnstile Docker Startup Script${NC}"
echo "=================================================="

# Function to check if environment variable is set and not empty
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -n "$var_value" ]; then
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $var_name is not set${NC}"
        return 1
    fi
}

# Function to validate Turnstile keys format
validate_turnstile_key() {
    local key_name=$1
    local key_value=$2
    
    if [[ $key_value =~ ^[0-9a-zA-Z_-]+$ ]]; then
        echo -e "${GREEN}✅ $key_name format is valid${NC}"
        return 0
    else
        echo -e "${RED}❌ $key_name format is invalid${NC}"
        return 1
    fi
}

# Check for required environment variables
echo -e "\n${BLUE}🔍 Checking Turnstile Environment Variables...${NC}"

TURNSTILE_ENABLED=false

if check_env_var "TURNSTILE_SITE_KEY" && check_env_var "TURNSTILE_SECRET_KEY"; then
    echo -e "${GREEN}✅ Both Turnstile keys are configured${NC}"
    
    # Validate key formats
    if validate_turnstile_key "TURNSTILE_SITE_KEY" "$TURNSTILE_SITE_KEY" && \
       validate_turnstile_key "TURNSTILE_SECRET_KEY" "$TURNSTILE_SECRET_KEY"; then
        TURNSTILE_ENABLED=true
        echo -e "${GREEN}🛡️  Turnstile protection will be ENABLED${NC}"
        
        # Show configuration summary
        echo -e "\n${BLUE}📋 Turnstile Configuration Summary:${NC}"
        echo "   Site Key: ${TURNSTILE_SITE_KEY:0:10}..."
        echo "   Secret Key: [HIDDEN]"
        echo "   Language: ${TURNSTILE_LANGUAGE:-auto}"
        echo "   Size: ${TURNSTILE_SIZE:-normal}"
        echo "   Theme: ${TURNSTILE_THEME:-auto}"
    else
        echo -e "${RED}❌ Invalid Turnstile key format detected${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Turnstile keys not configured - running without Turnstile protection${NC}"
fi

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found - using environment variables only${NC}"
fi

# Check Docker Compose file
COMPOSE_FILE="docker-compose.yml"
if [ "$TURNSTILE_ENABLED" = true ] && [ -f "docker-compose.turnstile.yml" ]; then
    COMPOSE_FILE="docker-compose.turnstile.yml"
    echo -e "${BLUE}📄 Using Turnstile-specific Docker Compose file${NC}"
fi

# Start the application
echo -e "\n${BLUE}🚀 Starting LibreChat...${NC}"
echo "Using compose file: $COMPOSE_FILE"

# Export environment variables for docker-compose
export TURNSTILE_SITE_KEY
export TURNSTILE_SECRET_KEY
export TURNSTILE_LANGUAGE=${TURNSTILE_LANGUAGE:-auto}
export TURNSTILE_SIZE=${TURNSTILE_SIZE:-normal}
export TURNSTILE_THEME=${TURNSTILE_THEME:-auto}

# Start with docker-compose
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$COMPOSE_FILE" up -d
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose -f "$COMPOSE_FILE" up -d
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi

# Wait for services to start
echo -e "\n${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

# Check if services are running
if docker ps | grep -q "LibreChat"; then
    echo -e "${GREEN}✅ LibreChat is running${NC}"
    
    # Show access information
    PORT=${PORT:-3080}
    echo -e "\n${GREEN}🎉 LibreChat is ready!${NC}"
    echo "   📱 Access URL: http://localhost:$PORT"
    
    if [ "$TURNSTILE_ENABLED" = true ]; then
        echo -e "   🛡️  Turnstile protection: ${GREEN}ENABLED${NC}"
        echo "   📝 Test registration at: http://localhost:$PORT/register"
    else
        echo -e "   🛡️  Turnstile protection: ${YELLOW}DISABLED${NC}"
    fi
    
    echo -e "\n${BLUE}📊 View logs with:${NC}"
    echo "   docker-compose -f $COMPOSE_FILE logs -f"
    
else
    echo -e "${RED}❌ Failed to start LibreChat${NC}"
    echo "Check logs with: docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi