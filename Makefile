# Makefile for simple site tasks

.PHONY: build-index build

build-index:
	python3 scripts/build_index.py

build: build-index
	@echo "Build complete"
