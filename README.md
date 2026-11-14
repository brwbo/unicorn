# Unicorn

Unicorn is your own team of AI bots in a chat app.

Each bot in the sidebar is a real agent with its own personality and model. You talk to them like contacts, watch them work, and approve what matters.

## What it does

- **A sidebar of bots.** Every bot is a conversation in the sidebar, like a contact in a messaging app. You can pin, rename, duplicate or hide them.
- **Real agents.** Each bot is backed by an agent process, such as the Claude or Codex command line tools, running on your machine. Each has its own personality, instructions and model, and you can change the model mid-conversation.
- **Approvals first.** Before a bot runs a shell command, edits a file or does anything else important, it asks. Approval and question cards appear inline in the chat, and you allow, deny or answer.
- **Local first.** A small server on `127.0.0.1` owns the agent processes. Transcripts, keys and events stay on your machine, in `~/.unicorn`.
- **Tools and computers.** Bots can use connected apps, a working folder, a browser, and an isolated desktop environment where one is available.

The full user documentation lives in `apps/docs/`.

## Requirements

- Node.js 24 or later
- pnpm 10
- At least one agent CLI, such as `claude` or `codex`, installed and signed in

## Quick start

Install dependencies:

```sh
pnpm install
```

Start the harness server, which runs the agents:

```sh
pnpm dev:server
```

In a second terminal, start the web app:

```sh
pnpm dev
```

Open the address that Vite prints. To run the desktop app instead:

```sh
pnpm dev:desktop
```

To build everything:

```sh
pnpm build
```

To work on the documentation site:

```sh
pnpm docs:dev
```

## Project layout

| Path | Contents |
|---|---|
| `src/` | The React front end: sidebar, chat, bot panel and shared components |
| `server/` | The local harness server that starts and supervises agent processes |
| `electron/` | The desktop app shell and its tests |
| `shared/` | Types and helpers used by both the front end and the server |
| `packages/` | Workspace packages, such as `phone-protocol` |
| `apps/docs/` | The documentation site |

Other folders include `companion/`, `relay/`, `scripts/`, `evals/` and `third_party/`. Read `AGENTS.md` and `CONTRIBUTING.md` before making changes.

## The Unicorn look

The default skin is a warm beige theme with dark ink and a single yellow button. It is meant to stay calm: the resting screen is quiet, and colour appears only where you need to act. `DESIGN.md` holds the rules for tokens, components, wording and states. Other skins are checked against the same contrast rules.

## Testing and linting

```sh
pnpm typecheck           # TypeScript project references, server and phone-protocol
pnpm lint                # oxlint, warnings denied
pnpm test                # unit tests, broker tests, Electron tests, packaged server tests
pnpm test:electron       # Electron tests only
pnpm check:contrast      # contrast check for the skins
```

Run `pnpm typecheck`, `pnpm lint` and `pnpm test` before opening a pull request.

## Security

Report vulnerabilities as described in `SECURITY.md`.

## License

Unicorn is licensed under the Apache License 2.0. See `LICENSE`. Third-party notices are in `NOTICE` and `third_party/`.
