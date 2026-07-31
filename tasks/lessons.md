# Lessons

Patterns worth not re-learning. Each entry is a mistake that was actually made,
or a trap that was actually hit, during this build.

---

## L1 — `**/` terminates a block comment

**What happened.** File header comments referenced paths like
`app/api/**/route.ts`. The `*/` inside `**/` closed the comment early, and
`tsc` produced ~60 cascading syntax errors in two files that looked fine.

**Rule.** Never write `**/` inside a `/* */` comment. Use `app/api/<route>/route.ts`
or backtick the path in a way that avoids the sequence.

**Detection.** `grep -rn '\*\*/' --include='*.ts' --include='*.tsx' .`

---

## L2 — Verify SDK exports at runtime, not just in the typings

**What happened.** `TxRaw` is exported from `@injectivelabs/sdk-ts` and appears
in the `.d.ts`, so `TxRaw.encode(...)` looked correct. It is a **type-only**
export — there is no runtime value.

**Rule.** Before building on an SDK symbol you intend to *call*, check it exists
at runtime:

```bash
node -e "const s=require('pkg'); console.log(typeof s.Thing, typeof s.Thing?.method)"
```

A `.d.ts` entry proves the type exists. It does not prove a value does.

---

## L3 — Chain error strings interpolate values; match with regex

**What happened.** `toAppError` checked `includes('account not found')`. The real
message from Injective is `account inj1abc…xyz not found`. The check never
matched, and a well-understood failure fell through to the generic `UNKNOWN`
branch with an unhelpful message.

**Rule.** Cosmos errors are formatted Go strings with values spliced in. Match
with a regex that spans the variable part (`/account\s+\S+\s+not found/`), and
verify against a live node rather than against what you assume the message says.

---

## L4 — Error mapping must be exercised, not reasoned about

**What happened.** Two of the mappings in `lib/errors.ts` were wrong (L3, plus
`failed to marshal error message` falling through). Both looked correct on
inspection. Both were found within minutes of `curl`-ing real endpoints.

**Rule.** Error-handling code is the least-exercised code in any project and the
most consequential in a teaching one. Trigger every branch you can reach:
unfunded account, wrong prefix, bad checksum, malformed body, unsigned
transaction. Read the actual response, not the intended one.

---

## L5 — Verify the plumbing even when you cannot verify the whole flow

**What happened.** The signing stage needs a browser extension, which cannot be
automated here. Rather than declaring the write path untested, a throwaway key
signed a real `MsgSend` locally and POSTed it to the broadcast route.

The account was unfunded, so the chain rejected it — but the rejection came from
`cosmos/tx/v1beta1/txs`, which proved encode → HTTP → decode → broadcast worked
end to end, and surfaced the L3/L4 mapping bugs.

**Rule.** When one link in a chain cannot be tested, substitute it and test
everything else. A rejection from the right place is strong evidence.

---

## L6 — Check npm versions before writing `package.json`

**What happened.** Two installs failed on invented version ranges
(`eslint@^9.40.0` and `@types/react-dom@^19.2.7` do not exist).

**Rule.** `npm view <pkg> version` — or `npm view <pkg>@<major> version` for a
pinned major — before writing a range. Model knowledge of version numbers is
unreliable and the failure is immediate but noisy.

---

## L7 — Prefer the stable major when a dependency tree is heavy

**What happened.** Next 16 was the latest, but the Injective SDK's protobuf/gRPC
tree has historically needed webpack fallbacks that behave differently under
Turbopack. Next 15.5 was chosen instead.

**Rule.** For a workshop repository, a build that works on every attendee's
machine beats being on the newest major by three weeks. Note the choice and the
reason so it can be revisited deliberately.

---

## L8 — Distinguish "no data" from "failed to load"

**Pattern, not a mistake — worth keeping.** A brand-new wallet legitimately holds
nothing, and the bank module returns an empty array rather than an error.
Rendering that as a blank box or as an error both make a working app look broken.

**Rule.** Every remote data region needs four states: not-requested, loading,
error, and success — where success splits into with-data and without-data.
Whenever you write `data.map(...)`, design `data.length === 0` deliberately.
