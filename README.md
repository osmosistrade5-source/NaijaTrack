# NaijaTrack Backend

Production-ready backend for NaijaTrack, connecting brands with influencers for paid campaigns.

## Tech Stack
- **Backend:** Node.js (Express.js)
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** JWT + Role-Based Authentication
- **Payments:** Paystack

## Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL database (or use SQLite for local development)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the values.
4. Initialize the database:
   ```bash
   npx prisma db push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Auth
- `POST /api/auth/register`: Register a new user (Brand, Influencer, Admin)
- `POST /api/auth/login`: Login and receive a JWT token

### Brands
- `GET /api/brands`: List all brands
- `GET /api/brands/wallet`: Get brand wallet balance (Brand only)
- `POST /api/brands/subscribe`: Pay monthly subscription fee (Brand only)

### Campaigns
- `POST /api/campaigns`: Create a new campaign (Brand only)
- `GET /api/campaigns`: List all campaigns

### Payments
- `POST /api/payments/fund`: Initialize wallet funding via Paystack
- `POST /api/payments/webhook`: Paystack webhook for payment verification
- `POST /api/payments/payout`: Process influencer payout (Admin only)

### Admin
- `GET /api/admin/stats`: Get platform statistics
- `GET /api/admin/users`: List all users
- `GET /api/admin/transactions`: List all transactions
