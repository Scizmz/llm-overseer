#!/bin/bash
# docker-commands.sh

case "$1" in
  start)
    echo "Starting LLM Orchestrator..."
    docker-compose up -d
    echo "Services started. Access at http://localhost"
    ;;
  stop)
    echo "Stopping LLM Orchestrator..."
    docker-compose down
    ;;
  restart)
    echo "Restarting LLM Orchestrator..."
    docker-compose restart
    ;;
  logs)
    docker-compose logs -f $2
    ;;
  build)
    echo "Building services..."
    docker-compose build
    ;;
  reset)
    echo "WARNING: This will delete all data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
      docker-compose down -v
      docker-compose up -d
    fi
    ;;
  status)
    docker-compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|build|reset|status}"
    exit 1
esac
