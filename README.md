# Splitwise MVP

A simplified expense-splitting API built with Node.js, Express, Sequelize, and SQLite.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **ORM:** Sequelize
- **Database:** SQLite (no setup required — file is auto-created on first run)
- **Auth:** JWT + bcrypt

## Getting Started

```bash
# Clone the repo
git clone https://github.com/bhavyasharma5/Propsoch.git
cd Propsoch

# Install dependencies
npm install

# Copy env file and configure (defaults work out of the box)
cp .env.example .env

# Start the server
npm run dev
```

Server runs on `http://localhost:3000`

> To reset the database, delete `database.sqlite` and restart the server.

## Database Schema

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER | PK, auto-increment |
| name | STRING | |
| email | STRING | unique |
| password_hash | STRING | bcrypt hashed |
| defaultCurrency | STRING | e.g. INR, USD |

### Expenses
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER | PK |
| name | STRING | |
| totalAmount | DECIMAL | |
| currency | STRING | |
| date | DATEONLY | |
| paidBy | INTEGER | FK → Users |
| splitType | ENUM | `equal` or `exact` |
| notes | TEXT | optional |

### ExpenseMembers
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER | PK |
| expenseId | INTEGER | FK → Expenses |
| userId | INTEGER | FK → Users |
| share | DECIMAL | amount this person owes |

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | View profile |
| PUT | `/api/users/me` | Update name, email, currency |
| DELETE | `/api/users/me` | Delete account |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Add expense |
| GET | `/api/expenses/:id` | Get expense by ID |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/activity` | Activity log grouped by month |

**Activity log query params:**
- Default — returns current month + last month
- Custom range — `?startDate=2026-04-01&endDate=2026-04-30`

### Balances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balances` | All balances with all users |
| GET | `/api/balances/:userId` | Balance with a specific user |
| POST | `/api/balances/monthly-report` | Send monthly summary email |

## Authentication

Two ways to pass identity (no auth layer as per assignment spec):

1. **Header (for testing):** `X-User-Id: 1`
2. **JWT:** `Authorization: Bearer <token>` — token returned from signup/login

## Creating an Expense

**Equal split** — just pass member user IDs:
```json
{
  "name": "Dinner",
  "totalAmount": 1200,
  "currency": "INR",
  "date": "2026-05-05",
  "splitType": "equal",
  "members": [2, 3]
}
```

**Exact split** — specify each person's share:
```json
{
  "name": "Groceries",
  "totalAmount": 500,
  "currency": "INR",
  "date": "2026-05-05",
  "splitType": "exact",
  "members": [
    { "userId": 2, "share": 300 },
    { "userId": 3, "share": 200 }
  ]
}
```

> The payer is automatically included as a member. You don't need to add them explicitly.

## Balance Logic

- **Positive** `netAmount` → the other user owes you
- **Negative** `netAmount` → you owe the other user
- Settled-up pairs (net = 0) are excluded from the response

## Testing

Import `splitwise-mvp.postman_collection.json` into Postman and run the collection. All 15 requests are pre-configured and run end-to-end in order.
