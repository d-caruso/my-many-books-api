# My Many Books - API Backend

> **⚠️ MIGRATION NOTICE**: This repository has been migrated to a monorepo structure. Please use the new repository: [my-many-books](https://github.com/d-caruso/my-many-books)
> 
> This repository is now in maintenance mode and will not receive new updates.

A serverless API backend for managing personal book collections with ISBN scanning, reading progress tracking, and automated book information retrieval.

## Features

- **ISBN Integration**: Automatic book data retrieval from Open Library API
- **Reading Progress**: Track books as "in progress", "paused", or "finished"
- **Database Management**: AWS RDS (MariaDB) with remote start/stop capability
- **Serverless Architecture**: AWS Lambda + API Gateway
- **Type Safety**: Full TypeScript implementation
- **Scalable**: Auto-scaling serverless infrastructure

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: AWS Lambda + API Gateway
- **Database**: AWS RDS (MariaDB) with Sequelize ORM
- **External APIs**: Open Library for ISBN lookup
- **Testing**: Jest with TypeScript
- **Code Quality**: ESLint + Prettier
- **Infrastructure**: AWS SAM / Serverless Framework

## API Documentation

### Endpoints

- `GET /books` - List all books
- `GET /books/search/{isbn}` - Search book by ISBN
- `POST /books` - Create new book
- `PUT /books/{id}` - Update existing book
- `DELETE /books/{id}` - Delete book
- `GET /books/search/title/{title}` - Search by title

## Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── models/          # Sequelize database models
├── handlers/        # AWS Lambda handlers
├── utils/           # Helper functions
└── types/           # TypeScript type definitions
```
## License

MIT License - see LICENSE file for details