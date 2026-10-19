#!/usr/bin/env bash
set -euo pipefail

container_name="${P360_BACKEND_CONTAINER:-poultry360-backend}"
role="${1:-all}"
confirmation="${2:-}"

case "$role" in
  farmer|dealer|hatchery|all) ;;
  *)
    echo "Usage: $0 {farmer|dealer|hatchery|all} [--yes]" >&2
    exit 2
    ;;
esac

if [[ "$confirmation" != "--yes" && "${P360_DEMO_SEED_CONFIRMED:-0}" != "1" ]]; then
  if [[ ! -t 0 ]]; then
    echo "Refusing a non-interactive production seed without --yes or P360_DEMO_SEED_CONFIRMED=1." >&2
    exit 2
  fi
  read -r -p "Confirm that a recent production DB backup exists, then type SEED: " answer
  if [[ "$answer" != "SEED" ]]; then
    echo "Cancelled."
    exit 1
  fi
fi

if ! docker inspect "$container_name" >/dev/null 2>&1; then
  echo "Backend container '$container_name' was not found." >&2
  exit 1
fi

# Each demo seed refuses non-local databases unless this is set; this script
# only gets here after the backup confirmation above.
docker_exec=(docker exec --env P360_DEMO_SEED_CONFIRMED=1)
for variable_name in P360_DEMO_PASSWORD P360_DEMO_FARMER_PASSWORD P360_DEMO_DEALER_PASSWORD P360_DEMO_COMPANY_PASSWORD P360_DEMO_HATCHERY_PASSWORD; do
  if [[ -n "${!variable_name:-}" ]]; then
    docker_exec+=(--env "$variable_name=${!variable_name}")
  fi
done

run_seed() {
  local selected_role="$1"
  local script_path="/app/dist/scripts/seedDemo${selected_role^}.js"
  echo "Running ${selected_role} demo seed in ${container_name}..."
  "${docker_exec[@]}" "$container_name" node "$script_path"
}

if [[ "$role" == "all" || "$role" == "farmer" ]]; then
  run_seed farmer
fi
if [[ "$role" == "all" || "$role" == "dealer" ]]; then
  run_seed dealer
fi
if [[ "$role" == "all" || "$role" == "hatchery" ]]; then
  run_seed hatchery
fi

echo "Demo seed completed successfully."
