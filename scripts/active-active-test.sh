#!/bin/bash

# Active-Active Disaster Recovery Test Script
# Tests the system's ability to handle active-active scenarios

set -euo pipefail

echo "🚀 Starting Active-Active DR Test"

# Test 1: Database Replication
echo "📊 Testing database replication..."
kubectl exec -it postgres-primary -- psql -c "INSERT INTO test_table VALUES ('test-data-$(date +%s)');"
sleep 5
kubectl exec -it postgres-secondary -- psql -c "SELECT COUNT(*) FROM test_table WHERE data LIKE 'test-data-%';"

# Test 2: Application Load Balancing
echo "⚖️  Testing load balancing..."
for i in {1..10}; do
  curl -s http://load-balancer/api/health | jq -r '.region'
done

# Test 3: Session Affinity
echo "🔗 Testing session affinity..."
SESSION_ID=$(curl -s -c cookies.txt http://load-balancer/api/auth/login -d '{"username":"test","password":"test"}' | jq -r '.sessionId')
curl -s -b cookies.txt http://load-balancer/api/user/profile | jq -r '.region'

# Test 4: Data Consistency
echo "📋 Testing data consistency..."
PRIMARY_COUNT=$(kubectl exec -it postgres-primary -- psql -c "SELECT COUNT(*) FROM users;" | grep -o '[0-9]*')
SECONDARY_COUNT=$(kubectl exec -it postgres-secondary -- psql -c "SELECT COUNT(*) FROM users;" | grep -o '[0-9]*')

if [ "$PRIMARY_COUNT" -eq "$SECONDARY_COUNT" ]; then
  echo "✅ Data consistency verified"
else
  echo "❌ Data inconsistency detected"
  exit 1
fi

# Test 5: Failover Simulation
echo "🔄 Testing failover simulation..."
kubectl scale deployment ayazlogistics-app --replicas=0
sleep 10
kubectl scale deployment ayazlogistics-app --replicas=3

# Test 6: Recovery Verification
echo "🔍 Verifying recovery..."
sleep 30
curl -s http://load-balancer/api/health | jq -r '.status'

echo "✅ Active-Active DR Test completed successfully"
