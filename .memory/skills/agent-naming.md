# Skill: Agent Naming

How to name agents when you create or rename them in `.memory/agents/`.

## The rule

**Every agent folder is named after a real human first name.** The folder name is the *person*. The *role* (devops, nextjs full-stack, backend, QA, data, mobile, infra, etc.) lives inside `persona.md`, not in the folder name.

- Folder name: lowercase, ASCII, single word - e.g. `agents/kevin/`
- Inside `persona.md`: `# Kevin - DevOps Engineer` followed by what he owns
- Inside `skills.md`: the technologies this person is responsible for

## Why human names

- Ownership feels real. "Ask Kevin about the deployment setup" is more memorable than "ask devops-agent".
- Names survive role changes. If the DevOps work expands into infra + CI, Kevin keeps the folder; his skills list grows.
- No duplication. Two agents can't both be `backend`, but Kevin and Priya can clearly split backend work.

## How to pick a name

1. Draw from a diverse pool spanning cultures - American, Indian, European, African, East Asian, Middle Eastern, Latin American. Worldwide, not regional.
2. Names must be distinct within the team - never reuse a name already in `agents/`.
3. Prefer common, easy-to-pronounce first names. Skip surnames, nicknames, and anything ambiguous with a technology (`Django`, `Ruby`).
4. Use `agents/<lowercase>/` for the folder and `Firstname` (title case) inside docs.

## Seed name pool

Pick any name from here, or any other real human first name. This is a suggestion, not a whitelist.

```
Aaliyah   Adaeze   Aditi    Aisha    Anders
Ananya    Anya     Arjun    Astrid   Björn
Camille   Carlos   Chen     Chiara   Chidi
Daniel    Dayo     Diego    Elena    Elin
Emeka     Fatima   Finn     Hiroshi  Ingrid
Ivan      Isla     Jamal    Kenji    Kevin
Kofi      Kwame    Leila    Luca     Marco
Mateo     Matthew  Mei      Miriam   Nadia
Noah      Olumide  Omar     Priya    Rafael
Raj       Rania    Rashid   Rohan    Sakura
Santiago  Saoirse  Sofía    Soren    Sven
Tariq     Tobias   Yara     Yuki     Zainab
Zara
```

## Example

The project has a Next.js frontend, a MongoDB backend, and Vercel-based deploys. After reading the codebase you decide you need three agents:

```
agents/
  priya/    # persona.md → "Priya - Next.js Fullstack Engineer"
  mateo/    # persona.md → "Mateo - UI Frontend Engineer"
  kevin/    # persona.md → "Kevin - DevOps Engineer"
```

Each `persona.md` states the role. Each `skills.md` lists the technologies and files that person owns. The manager's team roster and task router reference them by name: "Route deployment questions to Kevin."
