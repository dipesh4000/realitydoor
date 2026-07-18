---
name: RealDoor Core
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  split-main: 60%
  split-sidebar: 40%
  gutter: 24px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-stakes AI interactions within government and enterprise SaaS sectors. The brand personality is **authoritative yet accessible**, emphasizing precision, transparency, and institutional trust. 

The visual style is **Sophisticated Minimalism**. It borrows the functional density of GitHub and Linear while maintaining the approachable clarity of Stripe. The aesthetic relies on ample white space, refined typography, and a "Glass-and-Paper" layering logic. High-contrast elements ensure the interface remains production-ready and accessible for users managing complex regulatory data and AI-generated insights.

## Colors
The palette is rooted in **Trustworthy Blue**, serving as the primary action color. The background system utilizes a three-tier hierarchy: White for primary workspaces, Light Gray for sidebars or secondary navigation, and Soft Slate for deep background contrast or grouped content.

Status colors (Success, Warning, Error) are vibrant but balanced with high-contrast text ratios. For AI-specific interactions, use the Primary Blue with reduced opacity for highlighting and source citations to indicate "intelligence" without overwhelming the user's focus on the data.

## Typography
The typography system uses **Inter** for all UI elements to ensure maximum legibility across dense data tables and long-form AI citations. A secondary monospace font (**JetBrains Mono**) is reserved for specific technical outputs, reference IDs, or metadata.

Headlines utilize tight tracking and semi-bold weights to command attention, while body text maintains a generous line height (1.5x) to prevent reader fatigue during intensive document review.

## Layout & Spacing
The design system employs a **Fluid-Fixed Hybrid** layout. For analytical views, a **60/40 Split-Screen** is the standard: the left 60% serves as the primary workspace (document viewer or data entry), while the right 40% houses the AI context, citations, and assistant interface.

On desktop, use a 12-column grid with 24px gutters. For mobile, the 60/40 split reflows into a stacked vertical layout where the AI context is accessible via a persistent bottom sheet or toggleable overlay. Spacing follows a strict 4px-base increment to ensure alignment and rhythmic consistency.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Soft Ambient Shadows**. This system avoids heavy black shadows in favor of low-opacity, blue-tinted shadows that feel integrated with the "Trustworthy Blue" primary palette.

1.  **Level 0 (Flat):** Primary background (`#ffffff`).
2.  **Level 1 (Subtle):** Secondary background panels (`#f9fafb`) with a 1px border (`#e2e8f0`).
3.  **Level 2 (Raised):** Cards and Modals. Uses a diffused shadow: `0 4px 6px -1px rgba(37, 99, 235, 0.05), 0 2px 4px -2px rgba(37, 99, 235, 0.03)`.
4.  **Level 3 (Overlay):** AI Popovers and tooltips. Uses a high-blur backdrop filter (glassmorphism) of 8px to maintain context of the underlying data.

## Shapes
The shape language is characterized by "Generous Precision." Most UI elements use a **0.5rem (8px)** radius, but primary content containers and AI cards utilize a **1.5rem (24px)** radius (`rounded-xl`) to feel modern and distinct from legacy government software. Input fields and buttons maintain the standard 8px radius for a more "tool-like" and stable feel.

## Components

### AI Contextual Cards
AI-generated insights must be housed in `rounded-xl` containers with a subtle primary-tinted border (`#dbeafe`). These cards often include a "Source Citation" footer—a horizontal list of small, high-contrast badges that link directly to the source data in the 60% view.

### Buttons
- **Primary:** Solid `#2563eb` with white text. 8px radius.
- **Secondary:** Ghost style with `#2563eb` text and a subtle light-blue hover state.
- **AI Action:** A gradient-bordered button or one with a small "sparkle" icon to denote non-deterministic actions.

### Source Evidence Highlights
When an AI citation is hovered, the corresponding text in the document viewer should use a **Soft Blue Highlight** (`#dbeafe`) with a 2px left-border of the Primary Blue.

### Lists & Tables
Tables should be "border-less" using alternating row stripes (`#f9fafb`) and generous 16px cell padding. Data density is high, but legibility is preserved via the Inter typeface.

### Input Fields
Standard fields use a 1px border (`#e2e8f0`). Focus states must be high-contrast, utilizing a 2px outer ring of Primary Blue with a 2px offset.