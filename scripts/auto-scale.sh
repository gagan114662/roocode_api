#!/bin/bash

# Get current queue length from Redis
QUEUE_LENGTH=$(redis-cli -h redis llen job_queue)

# Define scaling thresholds
MIN_REPLICAS=1
MAX_REPLICAS=10
JOBS_PER_WORKER=5

# Calculate desired number of workers
DESIRED_WORKERS=$(( ($QUEUE_LENGTH + $JOBS_PER_WORKER - 1) / $JOBS_PER_WORKER ))

# Ensure within limits
if [ $DESIRED_WORKERS -lt $MIN_REPLICAS ]; then
    DESIRED_WORKERS=$MIN_REPLICAS
fi
if [ $DESIRED_WORKERS -gt $MAX_REPLICAS ]; then
    DESIRED_WORKERS=$MAX_REPLICAS
fi

# Scale the worker service
docker service scale roocode_worker=$DESIRED_WORKERS
