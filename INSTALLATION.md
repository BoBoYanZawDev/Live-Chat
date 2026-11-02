# Installation guide

This guide runs the complete Live Chat project locally: the backend API, the operator web portal, and the customer mobile app.

## 1. Prerequisites

Install these tools before continuing:

- **Node.js 24.x, version 24.3.0 or newer**, with npm. This satisfies the Node engine requirements in the project's lockfiles.
- **MySQL**, running locally, and a MySQL client with permission to create a database and user.
- **Expo Go compatible with the project's Expo SDK 58** on a physical Android or iOS device. A configured Android emulator or iOS simulator is optional; the iOS simulator requires macOS and Xcode.
- A browser for the operator portal.

Check that the command-line tools are available:

```bash
node --version
npm --version
mysql --version
```

Open a terminal in the project root, the folder containing `backend/`, `frontend/`, and `mobile/`. The commands below use a macOS/Linux shell; on Windows, use the equivalent file-copy command for `cp`.

There is no root npm package. Install dependencies separately in each application using its committed lockfile.

## 2. Create the database

Connect using a MySQL administrator account:

```bash
mysql -u root -p
```

Run the following SQL, replacing `replace_with_a_database_password` with your own password:

```sql
CREATE DATABASE live_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'live_chat'@'localhost' IDENTIFIED BY 'replace_with_a_database_password';
GRANT ALL PRIVILEGES ON live_chat.* TO 'live_chat'@'localhost';
EXIT;
```

If you already have a database and application user, use those credentials in the next step instead.

## 3. Configure and start the backend

From the project root:

```bash
cd backend
cp .env.example .env
```

If `.env` already exists, edit it instead of overwriting it. Set these values in `backend/.env`:

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL="mysql://live_chat:replace_with_a_database_password@localhost:3306/live_chat"
JWT_SECRET=replace_with_generated_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_admin_password
ADMIN_NAME=Admin
```

Use the database password from step 2. Percent-encode special characters in the username or password when putting them in `DATABASE_URL`; for example, `@` becomes `%40`.

Generate a signing secret with this command and paste its output into `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The remaining values in `.env.example` can stay at their defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `UPLOAD_DIR` | `uploads` | Media directory, relative to the backend working directory |
| `MAX_IMAGE_MB` | `15` | Maximum size per image |
| `MAX_VIDEO_MB` | `100` | Maximum size per video |
| `OPERATOR_TOKEN_TTL` | `12h` | Operator sign-in duration |
| `CUSTOMER_TOKEN_TTL` | `30d` | Customer sign-in duration |

Install dependencies, apply the existing migrations, and start the API:

```bash
npm ci
npm run db:deploy
npm run dev
```

`npm ci` also generates the Prisma client through the backend's `postinstall` script. Configure `.env` before installing because Prisma reads `DATABASE_URL` during setup.

On a fresh database, the server creates the first admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`. These variables are only used when there are no operators; changing them later does not update an existing account. An admin can reset operator passwords from the portal's Team page.

Leave this terminal running. In another terminal, check the API:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"ok":true}
```

The backend creates the upload directory automatically. A successful health response confirms HTTP availability; the first-chat check below also verifies database-backed operations.

## 4. Start the operator portal

Open a second terminal at the project root:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173** and sign in with the admin credentials configured above.

The portal does not need an environment file for local setup. Vite forwards `/api`, `/uploads`, and `/socket.io` to `http://localhost:4000` through `frontend/vite.config.ts`. If you change the backend port or host, update that proxy target too. If you change the portal origin, update `CLIENT_ORIGIN` in the backend and restart it.

## 5. Start the customer mobile app

Open a third terminal at the project root:

```bash
cd mobile
cp .env.example .env
npm ci
npm start
```

If `mobile/.env` already exists, preserve it and review its settings. For a backend running on the same computer as Expo, leave the API override empty:

```dotenv
EXPO_PUBLIC_API_URL=
```

Connect the phone and computer to the same Wi-Fi network, then open the Expo QR code in Expo Go. The app uses the Expo host's IP address with port `4000` to find the backend automatically. Allow the computer's firewall to accept local network connections to the backend and Expo development server.

To use a backend on another machine or a different port, set its base URL explicitly, without `/api`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

Replace the example address with the backend computer's LAN IP. On a physical phone, `localhost` refers to the phone itself. For an Android Studio emulator accessing the host computer, use `http://10.0.2.2:4000` if automatic detection cannot reach the API.

After changing `mobile/.env`, stop Expo and restart with its cache cleared:

```bash
npm start -- --clear
```

An Expo tunnel exposes the app's development server; it does not expose this backend. When using a tunnel, set `EXPO_PUBLIC_API_URL` to a backend URL reachable from the device. These `EXPO_PUBLIC_*` values are included in the app bundle and must not contain secrets.

For an already configured emulator or simulator, run `npm run android` or `npm run ios` from `mobile/` instead of `npm start`.

## 6. Verify the first conversation

1. Sign in to the web portal as the admin.
2. Open the mobile app and enter a customer name and phone number.
3. Send a message from the mobile app and confirm it appears in the portal inbox.
4. Reply from the portal and confirm the mobile app receives the reply without reloading.
5. Send an image to verify uploads and media access.
6. Mark the conversation Done in the portal, then send another customer message to confirm it reopens.

Keep all three development processes running while using the project. Stop each with `Ctrl+C`.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| npm reports an unsupported Node engine | Use Node 24.x at version 24.3.0 or newer, then rerun `npm ci` in the affected folder. |
| `Missing required env var JWT_SECRET` or `DATABASE_URL` | Check `backend/.env`, replace empty placeholders, and start the backend from `backend/`. |
| Database connection or access denied error | Check that MySQL is running, the database exists, and the URL matches the database user's credentials and host. |
| Missing database tables | Run `npm run db:deploy` from `backend/` against the same database used by the API. |
| Prisma client is missing | Run `npm run db:generate` from `backend/`. |
| Portal requests fail or return a proxy error | Confirm the API health URL works and Vite's proxy points to the backend's actual port. |
| Portal starts on a port other than 5173 | Free port 5173 or update `CLIENT_ORIGIN` to match the actual portal origin and restart the backend. |
| Mobile reports a network error | Verify Wi-Fi connectivity, firewall rules, and the API override. Try opening `http://<computer-LAN-IP>:4000/api/health` in the phone's browser. Restart Expo after changing `.env`. |
| Expo Go reports an incompatible SDK | Use an Expo Go version compatible with the SDK declared in `mobile/package.json`, or set up a compatible development build. |
| Admin credentials do not change after editing `.env` | The first-run values do not modify existing operators. Reset the password through an admin account on the Team page. |
| Incoming message sounds are silent | Click or type in the portal to enable browser audio; check the mute toggle. Mobile audio follows the device's silent setting. |

## Build and maintenance commands

Run commands from the indicated application folder:

| Folder | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm run typecheck` | Check backend TypeScript |
| `backend/` | `npm run build` | Compile the API into `dist/` |
| `backend/` | `npm start` | Run the compiled API after building |
| `backend/` | `npm run db:deploy` | Apply committed migrations |
| `backend/` | `npm run db:migrate -- --name <change>` | Create a migration after a development schema change and regenerate the client |
| `frontend/` | `npm run typecheck` | Check portal TypeScript |
| `frontend/` | `npm run build` | Build the portal into `dist/` |
| `frontend/` | `npm run preview` | Preview the portal build locally |
| `mobile/` | `npx tsc --noEmit` | Check mobile TypeScript |

Creating development migrations with `db:migrate` requires access to a Prisma shadow database or permission to create one. Use `db:deploy` for the initial installation with the migrations already committed here.

Sound assets are included. To regenerate them, run `node scripts/generate-sounds.mjs` from the project root.

For deployment, serve the portal build with a web server that forwards `/api`, `/uploads`, and `/socket.io` to the backend, including WebSocket upgrade support. The Vite development proxy does not become part of the static build. Set the backend's `CLIENT_ORIGIN` to the portal's actual origin, configure the mobile app with the reachable API URL before bundling, and persist both the MySQL database and upload directory. Mobile release packaging requires a separate native build and signing setup.
