# Modern Node.js Application

A modern Node.js REST API built with Express.js, MongoDB, and JWT authentication.

## Features

- ✅ Express.js with modern ES6+ syntax
- ✅ MongoDB with Mongoose ODM
- ✅ JWT Authentication
- ✅ Role-based authorization
- ✅ Input validation
- ✅ Error handling
- ✅ Logging with Winston
- ✅ Security best practices
- ✅ Rate limiting
- ✅ CORS enabled
- ✅ Environment configuration

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Start MongoDB
5. Run the application: `npm run dev`

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Products
- GET `/api/products` - Get all products
- POST `/api/products` - Create product (Admin)
- PUT `/api/products/:id` - Update product (Admin)
- DELETE `/api/products/:id` - Delete product (Admin)

## Environment Variables

See `.env.example` for required environment variables.