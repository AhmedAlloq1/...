# Discord Team & Ticket Management Bot

A production-ready Discord bot for staff/ticket management: a ticket panel,
claim system, staff-only commands, welcome messages, and an optional
mention/reply AI chat with a safe fallback.

## 1. Files created

```
discord-ticket-bot/
├── index.js              Bot entrypoint — loads commands/events, logs in
├── deploy-commands.js    Registers slash commands to your guild
├── package.json          Dependencies + npm scripts
├── .env.example          Template for your environment variables
├── .gitignore            Keeps .env and node_modules out of git
├── data/                 JSON storage for ticket state (auto-created)
├── commands/
│   ├── ticket-panel.js   /ticket-panel — sends the ticket creation embed
│   ├── rename.js         /rename ticket name:<x>
│   ├── close.js          /close request, /close ticket
│   └── add.js            /add user:<@user>
├── events/
│   ├── ready.js               Login/startup logging
│   ├── interactionCreate.js   Routes slash commands + all buttons
│   ├── guildMemberAdd.js      Welcome message
│   └── messageCreate.js       Mention/reply chat system
└── utils/
    ├── config.js          Loads & validates environment variables
    ├── dataStore.js       JSON-backed ticket storage
    ├── permissions.js     Staff role check
    ├── embeds.js          Shared embed builders
    ├── ticketManager.js   Create/claim/close/add/rename logic
    ├── ticketLogger.js    Sends close logs + transcript
    └── chatResponder.js   AI reply with fallback if no AI_API_KEY
```

## 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `TOKEN` | Yes | Bot token from the Developer Portal |
| `CLIENT_ID` | Yes | Application ID |
| `GUILD_ID` | Yes | Server ID to register commands to |
| `STAFF_ROLE_IDS` | Recommended | Comma-separated role IDs (Owner, Co-Owner, Admin, Moderator, Helper, Trial Staff) |
| `TICKET_CATEGORY_ID` | Recommended | Category new ticket channels are created under |
| `TICKET_PANEL_CHANNEL_ID` | Optional | Informational — you send the panel with `/ticket-panel` in whichever channel you want |
| `TICKET_LOG_CHANNEL_ID` | Optional | Where close logs/transcripts are posted |
| `WELCOME_CHANNEL_ID` | Optional | Where welcome messages are posted |
| `AI_API_KEY` | Optional | If unset, the bot uses simple built-in fallback replies |

Never commit a real `.env` file — it's already in `.gitignore`.

## 3. Install dependencies

```bash
npm install
```

## 4. Register slash commands

```bash
node deploy-commands.js
```

Re-run this any time you add or change a command. It registers guild
commands (`GUILD_ID`), which update almost instantly — good for
development. Re-run it any time you change GUILD_ID too.

## 5. Start the bot

```bash
npm start
```

## 6. Discord Developer Portal — required intents

In your application → **Bot** tab, enable these **Privileged Gateway Intents**:

- **Server Members Intent** — needed for welcome messages
- **Message Content Intent** — needed for the mention/reply chat system

`Guilds` and `Guild Messages` are not privileged and don't need to be toggled.

## 7. Bot permissions

When generating an invite link (OAuth2 → URL Generator → scope `bot` +
`applications.commands`), grant at least:

- View Channels
- Send Messages
- Read Message History
- Embed Links
- Attach Files
- Manage Channels
- Manage Roles/Permissions (needed to set per-ticket channel overwrites)

Avoid granting Administrator — it isn't needed.

## 8. Invite the bot

OAuth2 → URL Generator → check `bot` and `applications.commands`,
select the permissions above, copy the generated URL, open it, and
add the bot to your server.

## 9. Test the ticket system

1. Run `/ticket-panel` in the channel you want the panel in (Staff only).
2. Click **🎫 Create Ticket** as a normal member — a private `ticket-<name>`
   channel appears under `TICKET_CATEGORY_ID`.
3. As a staff member, click **🎯 Claim** — every other staff role loses
   view access to *this* channel only; roles themselves are untouched.
4. Try `/add user:@someone` to bring in an extra person with limited access.
5. Try `/rename ticket name:payment-issue`.
6. Try `/close request` (only the ticket owner can Confirm/Cancel) and
   `/close ticket` / the 🔒 Close button (immediate close, Staff only).
7. Check `TICKET_LOG_CHANNEL_ID` for the close log + transcript file.

## Notes

- Ticket state is stored in `data/tickets.json`. A restart won't lose
  open tickets.
- Every missing optional config value (log channel, welcome channel,
  category) is handled gracefully — the bot logs a warning instead of
  crashing.
- All destructive/staff actions check `STAFF_ROLE_IDS` by role **ID**,
  not name.
