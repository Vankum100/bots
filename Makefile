.PHONY: update

update:
	docker-compose down
	git restore .
    git pull
    docker-compose build
    docker-compose up -d