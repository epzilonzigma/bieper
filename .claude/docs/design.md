# Design document

Claude and all other coding agents shall refer to contents of this document as bases for the UI and UX design of the application.

## Design palette

A cool-toned palette built for high-contrast readability during intense training. Dark backgrounds reduce eye strain; vibrant accent colours provide instant visual feedback for timer states.

### Core colours

| Role               | Name           | Hex       | Usage                                              |
| ------------------- | -------------- | --------- | -------------------------------------------------- |
| Background          | Midnight       | `#0B1120` | Main app background                                |
| Surface             | Deep Navy      | `#131B2E` | Cards, panels, dialogs                             |
| Surface raised      | Slate          | `#1C2640` | Elevated elements, input fields                    |
| Border              | Steel          | `#2A3550` | Borders, dividers                                  |
| Text primary        | Ice White      | `#E8EDF5` | Headings, timer digits                             |
| Text secondary      | Cool Grey      | `#8B95A8` | Labels, descriptions, muted text                   |
| Text disabled       | Dim Grey       | `#4D576A` | Disabled / placeholder text                        |

### Accent colours

| Role               | Name           | Hex       | Usage                                              |
| ------------------- | -------------- | --------- | -------------------------------------------------- |
| Primary             | Electric Blue  | `#3B82F6` | Primary buttons, active timer ring, links           |
| Primary hover       | Bright Blue    | `#60A5FA` | Hover / focus state for primary                    |
| Secondary           | Cyan           | `#06B6D4` | Secondary actions, interval indicators             |
| Success / Go        | Emerald        | `#10B981` | Timer running, "go" state, start button            |
| Warning / Ready     | Amber          | `#F59E0B` | Get-ready countdown, warning prompts               |
| Danger / Stop       | Red            | `#EF4444` | Timer stopped, reset, destructive actions          |
| Reaction flash      | Vivid Violet   | `#8B5CF6` | Reaction-time flash cue, highlight on trigger      |

### Semantic mapping (CSS variables)

These map to the shadcn/ui theme variables in `app/globals.css`:

| CSS variable             | Palette token    | Hex       |
| ------------------------ | ---------------- | --------- |
| `--background`           | Midnight         | `#0B1120` |
| `--foreground`           | Ice White        | `#E8EDF5` |
| `--card`                 | Deep Navy        | `#131B2E` |
| `--card-foreground`      | Ice White        | `#E8EDF5` |
| `--popover`              | Deep Navy        | `#131B2E` |
| `--popover-foreground`   | Ice White        | `#E8EDF5` |
| `--primary`              | Electric Blue    | `#3B82F6` |
| `--primary-foreground`   | Ice White        | `#E8EDF5` |
| `--secondary`            | Slate            | `#1C2640` |
| `--secondary-foreground` | Ice White        | `#E8EDF5` |
| `--muted`                | Slate            | `#1C2640` |
| `--muted-foreground`     | Cool Grey        | `#8B95A8` |
| `--accent`               | Cyan             | `#06B6D4` |
| `--accent-foreground`    | Ice White        | `#E8EDF5` |
| `--destructive`          | Red              | `#EF4444` |
| `--border`               | Steel            | `#2A3550` |
| `--input`                | Steel            | `#2A3550` |
| `--ring`                 | Electric Blue    | `#3B82F6` |

### Timer-state colours

Used in client components for visual feedback during training:

| State          | Colour          | Hex       | Description                          |
| -------------- | --------------- | --------- | ------------------------------------ |
| Idle           | Cool Grey       | `#8B95A8` | Timer not started                    |
| Ready          | Amber           | `#F59E0B` | Countdown before round starts        |
| Active         | Emerald         | `#10B981` | Round in progress                    |
| Rest           | Cyan            | `#06B6D4` | Rest interval between rounds         |
| Paused         | Red             | `#EF4444` | Timer paused                         |
| React          | Vivid Violet    | `#8B5CF6` | Reaction cue flash                   |

### Typography

- **Timer digits:** `font-mono` (Geist Mono), oversized (`text-6xl`-`text-8xl`), `text-foreground`.
- **Headings:** `font-sans` (Geist Sans), semibold.
- **Body / labels:** `font-sans`, regular weight, `text-muted-foreground` for secondary info.

### Audio cues

Timer sound cues live in `public/audio/` and are referenced by public URL (e.g. `new Audio('/audio/timer-start.mp3')`). Do not import audio through the bundler.

| File               | Cue purpose                                      |
| ------------------ | ------------------------------------------------ |
| `timer-start.mp3`  | Bell played when the timer starts                |
| `timer-stop.mp3`   | Bell played when the timer stops or ends         |
| `interval.mp3`     | Short cue for interval beeps and reaction triggers |

All cues should be crisp, short sounds audible over background noise (see non-functional requirements in `product.md`). Use kebab-case `.mp3` filenames named after the cue's purpose.

### Border radius

Keep the default shadcn radius (`--radius: 0.625rem`). Use `rounded-lg` for cards/dialogs, `rounded-full` for circular timer displays and icon buttons.

