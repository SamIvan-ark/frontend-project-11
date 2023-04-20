install: #установка зависимостей для первого запуска
	npm ci

publish: #подготовка пакета к публикации (локально)
	npm publish --dry-run

link: #установка пакета в систему
	npm link

lint: #проверка линтером
	npx eslint .

w-build-dev: 
	rm -rf dist
	npx webpack --mode=development

w-build-prod:
	rm -rf dist
	npx webpack --mode=production --node-env=production

w-watch: 
	npx webpack --watch

run-local: w-build-dev
	npx webpack serve