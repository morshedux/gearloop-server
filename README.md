# GearLoop Server

REST API for **GearLoop**, an equipment rental marketplace where owners list equipment and customers book it for a chosen period with secure Stripe payments.

- **Live API:** https://gearloop-server-chi.vercel.app
- **Live site:** https://gearloop-client.vercel.app
- **Client repository:** https://github.com/morshedux/gearloop-client

## Key features
- JWT verification with role-based middlewares: `verifyToken`, `verifyRenter`, `verifyOwner`, `verifyAdmin`
- Equipment CRUD with server-side search, filters (category, rental type, price, availability), sorting and pagination
- Stripe Checkout payments; booking and payment records are created after a verified payment
- Availability check to prevent overbooking
- Favorites, reviews, profile and admin user/role management
- Admin and owner dashboard analytics (totals and monthly statistics)
- `node-cron` job (plus Vercel Cron endpoint) that completes bookings after the rental end date and emails renter and owner

## Tech stack
Node.js, Express, MongoDB (Atlas), Stripe, JWT, node-cron, Nodemailer

## npm packages
`express`, `cors`, `dotenv`, `mongodb`, `jsonwebtoken`, `stripe`, `node-cron`, `nodemailer`

## Getting started
```bash
npm install
cp .env.example .env   # fill in your own values
npm run seed           # optional demo data
npm run dev
```

## Environment variables
See `.env.example`. Secrets (MongoDB URI, JWT secret, Stripe key, SMTP) are never committed.
