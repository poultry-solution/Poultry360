#!/bin/bash
set -e

IMAGE_NAME="${1:-poultry360-backend}"
TAG="${2:-latest}"

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-siddjuugi}"
FULL_IMAGE="$DOCKERHUB_USERNAME/$IMAGE_NAME"

echo "==> Building $FULL_IMAGE:$TAG ..."
docker build -t "$FULL_IMAGE:$TAG" -t "$FULL_IMAGE:latest" .

echo "==> Pushing $FULL_IMAGE:$TAG ..."
docker push "$FULL_IMAGE:$TAG"

echo "==> Pushing $FULL_IMAGE:latest ..."
docker push "$FULL_IMAGE:latest"

echo "==> Done. Pushed:"
echo "    $FULL_IMAGE:$TAG"
echo "    $FULL_IMAGE:latest"
