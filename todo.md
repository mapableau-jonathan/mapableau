Provider pages

- data call in server components

Practical hybrid (usually the sweet spot)
= Server Component: auth() + Prisma for the initial payload
= uses the client for editing, optimistic updates, and calling PATCH (or server actions) after mutations.

TODO: test that data doesn't load instantly
"// todo: create shared logic between here and the API route"

types:

- make types in frontend logic match backend types
- on frontend: ensure name can't be updated to blank value for workers
- test types

- review all generated code and identify problems

- error handling? - see agent output

- Add autocomplete to provider search
