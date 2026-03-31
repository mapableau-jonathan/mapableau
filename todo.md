Provider pages

- data call in server components

===Practical hybrid (usually the sweet spot)
= Server Component: auth() + Prisma for the initial payload
= uses the client for editing, optimistic updates, and calling PATCH (or server actions) after mutations.

===TODO: test that data doesn't load instantly

types:

- error handling? - see agent output

- Add autocomplete to provider search
