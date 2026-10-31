#!/bin/sh
# Deploy commit $1 on the server: build, migrate, restart, then check the live site.
# If the check fails, go back to the commit that was running and rebuild it.
# Run by .github/workflows/deploy.yml over SSH; by hand: sh ops/deploy.sh <commit>
# Migrations are not undone on rollback: a migration must work with the code before it.
set -eu
cd ~/hootan-site
compose="docker compose -f docker-compose.prod.yml"
site="https://hootanseifi.pro"

# Chained with && because set -e is off inside an if condition.
release() {
	git reset -q --hard "$1" &&
		$compose build api worker web &&
		$compose run --rm -T api alembic upgrade head &&
		$compose up -d api worker web
}

healthy() {
	for _ in $(seq 30); do
		if curl -sf -o /dev/null "$site/api/ready" && curl -sf -o /dev/null "$site/fa"; then
			return 0
		fi
		sleep 2
	done
	return 1
}

git fetch -q origin
previous=$(git rev-parse HEAD)
echo "deploy: $previous -> $1"
if release "$1" && healthy; then
	echo "deploy: $1 is live"
	exit 0
fi
echo "deploy: $1 failed the health check; rolling back to $previous"
release "$previous"
healthy && echo "deploy: rolled back to $previous"
exit 1
