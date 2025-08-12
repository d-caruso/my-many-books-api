# Clean install
rm -rf node_modules package-lock.json
npm install

# Test build chain
npm run build
npm run lint
npm run format
npm test

echo "✅ Project setup validation complete!"