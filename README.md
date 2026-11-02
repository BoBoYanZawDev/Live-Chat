# Live Chat — Call Center

Customer support chat that works like a Facebook Page's Messenger inbox:

- **Customers** use the mobile app (`mobile/`, Expo React Native). Each has one conversation with "Support".
- **Operators** use the web portal (`frontend/`, Vite React). All operators share one inbox and can reply to any conversation, assign it, and mark it **Done**. A new customer message reopens a Done conversation.
- Real-time over Socket.IO: messages, typing indicators, "Seen" receipts, online presence, emoji reactions.
- Photos are optimized with sharp; videos are stored as uploaded.
- Message sounds on both sides: a chime for incoming messages and a pop when yours is sent, with a 🔔/🔕 mute toggle (portal sidebar, app header). The sounds are synthesized by `node scripts/generate-sounds.mjs` into `frontend/public/sounds` and `mobile/assets/sounds`; edit the notes there to change them.

| Folder | Stack |
|---|---|
| `backend/` | Express 5, TypeScript, service pattern, Socket.IO, Prisma 7 + MySQL, JWT auth |
| `frontend/` | Operator portal: Vite, React, TypeScript, Zustand, TanStack Query |
| `mobile/` | Customer app: Expo SDK 58, React Native, TypeScript, Zustand, TanStack Query |

`backend/src/contracts.ts` defines the REST and socket types. The portal and the mobile app import it with `import type`, so all three stay in sync.

## Run

For prerequisites, database creation, environment configuration, mobile networking, and troubleshooting, see the [installation guide](INSTALLATION.md).

Requires a running MySQL server.

```bash
# 1. Backend: http://localhost:4000
cd backend
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm install
npm run db:deploy             # apply migrations
npm run dev                   # on first start, creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD

# 2. Operator portal: http://localhost:5173
cd frontend && npm install && npm run dev

# 3. Customer app: scan the QR code with Expo Go
cd mobile && npm install && npx expo start
```

The default first admin is `admin@example.com` / `admin12345`. Change it in `.env` before first start, or reset the password from the Team page.

The mobile app finds the backend at `http://<your computer's LAN IP>:4000` automatically. The phone must be on the same Wi-Fi network. Set `EXPO_PUBLIC_API_URL` in `mobile/.env` when using `--tunnel` or a remote server.

After changing `prisma/schema.prisma`, run `npm run db:migrate -- --name <change>`. It creates the migration and regenerates the client.

### Sound behavior

- **Portal:** chimes for every customer message, including in conversations that aren't open. Rapid bursts chime at most once per 0.8s. Browsers only allow audio after the first click or keypress on the page, which signing in provides.
- **Mobile:** chimes for operator messages while the app is open. It follows the iPhone silent switch and plays alongside the user's music instead of stopping it. Sound when the app is closed would need push notifications, which aren't set up.

## Auth (JWT)

- Operators sign in with email + password (bcrypt). Customers sign in with name + phone number. The phone number identifies the customer.
- Both receive an HS256 JWT (`sub`, `typ` = OPERATOR/CUSTOMER, `ver`). Operator tokens last `OPERATOR_TOKEN_TTL` (12h) and customer tokens `CUSTOMER_TOKEN_TTL` (30d).
- Each request and socket connection also checks the account's `tokenVersion`. Deactivating an operator or resetting their password bumps the version, which revokes their tokens immediately and disconnects their sockets.
- Logout is client-side (the app discards the token).
- Roles: `ADMIN` manages the team (add, role, deactivate, reset password). `OPERATOR` handles chats. Both can reply to every conversation.

## Backend layout (`backend/src`)

| Layer | Purpose |
|---|---|
| `routes/` | HTTP route table |
| `controllers/` | Validate input (zod), call services, shape responses |
| `services/` | `auth`, `token` (JWT), `operator`, `conversation`, `message`, `reaction`, `media` (sharp), `presence`, `realtime` (socket fan-out) |
| `repositories/` | Data access with Prisma (`prisma/schema.prisma`) |
| `mappers/` | Prisma rows → wire DTOs |
| `middlewares/` | `requireOperator` / `requireAdmin` / `requireCustomer`, multer uploads, error handler |
| `socket/` | Socket.IO handshake (JWT) and event handlers |

### REST (`Authorization: Bearer <jwt>`)

| | |
|---|---|
| `POST /api/operator/auth/login` `{email,password}` | Operator JWT |
| `POST /api/customer/auth/login` `{name,phone}` | Customer JWT + their conversation |
| `GET /api/auth/me` | Current operator or customer |
| `GET /api/conversations?filter=all\|unread\|mine\|done&search=&cursor=` | Operator inbox (newest activity first) |
| `GET/PATCH /api/conversations/:id` `{status?, assigneeId?}` | Details, assign, mark done/reopen |
| `GET/POST /api/conversations/:id/messages` | History / multipart reply with files |
| `POST /api/conversations/:id/read` | Mark read for the team |
| `GET /api/customer/conversation` | Customer's own conversation |
| `GET/POST /api/customer/conversation/messages` | Customer history / multipart send |
| `POST /api/customer/conversation/read` | Customer read receipt |
| `POST /api/messages/:id/reactions` `{emoji}` | Toggle reaction (either side) |
| `GET/POST /api/operators`, `PATCH /api/operators/:id` | Team list / admin management |
| `GET /uploads/<file>` | Media (immutable cache) |

### Socket events

- Client → server: `message:send`, `reaction:toggle`, `conversation:read`, `typing:start`, `typing:stop`. Customers omit `conversationId`; the server uses their own conversation.
- Server → client: `message:new`, `reaction:update`, `read:update`, `typing:update`, `presence:update`, and `conversation:updated` (operators only).
- Channels: every operator socket joins `operators` (the shared inbox). A customer's sockets join `customer:<id>`, so a customer only ever receives their own conversation.

### Media

- Photos (jpeg/png/webp/gif/avif, ≤15 MB) are auto-rotated, resized to fit 1920px, re-encoded to WebP q80, and get a 480px thumbnail. Animated GIF/WebP stay animated.
- Videos (mp4/webm/mov, ≤100 MB) are stored as uploaded; transcoding would need ffmpeg. On iOS the mobile app exports picked videos as 720p H.264.
