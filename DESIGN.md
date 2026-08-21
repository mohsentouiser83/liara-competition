# Liara Copilot Design System

## Direction

A quiet developer workspace: true-white and near-black neutral surfaces, Liara green reserved for actions and evidence, compact typography, and strong information hierarchy. The design should feel like a dependable technical tool used during real work—not a marketing surface.

## Color

All colors are defined as OKLCH tokens in `src/app/globals.css`. The light theme uses a pure white canvas with cool-neutral surfaces. The dark theme uses a neutral near-black canvas. Liara green is the sole primary action color; amber and red are reserved for warnings and errors.

## Typography

Use Geist Sans for product UI and Geist Mono for commands and code. Persian text uses the same loaded family with system Persian fallbacks. Product typography is compact and fixed-scale: 14px body, 12–13px metadata, 16–20px headings.

## Shape and elevation

Controls use 8–12px radii. Panels rely on tonal separation or a crisp border, not wide decorative shadows. Full pills are limited to compact badges and status labels.

## Layout

Desktop uses a narrow conversation-history rail and a centered conversation column. The rail collapses on smaller screens. The composer is sticky at the bottom; sources collapse naturally on mobile. Reading measure stays under 72ch.

## Components

- Buttons: green primary, neutral secondary, quiet icon controls.
- Composer: integrated textarea, attachment affordance, mode label, submit control.
- Messages: user messages are compact neutral blocks; assistant messages sit directly on the canvas.
- Sources: numbered, linked evidence rows with titles and sections.
- Diagnosis and next action: structured blocks used only when the intent requires them.
- Status: subtle live, tool, and streaming indicators with text equivalents.

## Motion

Transitions run 150–220ms and communicate state. Streaming cursor and panel changes respect `prefers-reduced-motion`.
