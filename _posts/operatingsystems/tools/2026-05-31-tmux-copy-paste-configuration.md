---
layout: post
title: Tmux - Copy Paste Configuration
categories: [Linux]
tags: [Linux, Tools]
---

# Mastering tmux Copy & Paste on Ubuntu 26: A Complete Setup Guide

If you've ever been frustrated by tmux copying text from the wrong pane — or copying nothing at all — this guide is for you. We'll walk through configuring tmux to copy only from the selected pane and wire it up to Ubuntu's system clipboard so `Ctrl+V` works everywhere.

---

## Prerequisites

- Ubuntu 26.04
- tmux installed (`sudo apt install tmux`)
- A terminal emulator (GNOME Terminal, Kitty, Alacritty, etc.)

Verify your tmux version (should be 3.x+):

```bash
tmux -V
```

---

## Step 1: Install xclip

`xclip` bridges tmux's internal buffer and the system clipboard.

```bash
sudo apt update
sudo apt install xclip -y
```

Verify the install:

```bash
xclip -version
```

---

## Step 2: Create or Edit Your tmux Config

Open (or create) the tmux configuration file:

```bash
nano ~/.tmux.conf
```

---

## Step 3: Add the Full Configuration

Paste the following into `~/.tmux.conf`:

```bash
# ─── Mouse & Key Mode ─────────────────────────────────────────────────────────

# Enable mouse support
set -g mouse on

# Use vi-style keys in copy mode
setw -g mode-keys vi

# ─── Pane-Isolated Selection ──────────────────────────────────────────────────

# Prevent selection from bleeding across panes
set -g focus-events on

# Do not auto-copy on mouse release (we handle it manually below)
unbind -T copy-mode-vi MouseDragEnd1Pane

# ─── System Clipboard Bindings ────────────────────────────────────────────────

# Copy to system clipboard on mouse drag end
bind -T copy-mode-vi MouseDragEnd1Pane \
  send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"

# Copy to system clipboard when pressing Enter in copy mode
bind -T copy-mode-vi Enter \
  send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"

# Copy to system clipboard when pressing 'y' (yank) in copy mode
bind -T copy-mode-vi y \
  send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"

# ─── Paste from System Clipboard ──────────────────────────────────────────────

# Ctrl+b P to paste from system clipboard
bind P run "xclip -selection clipboard -out | tmux load-buffer - && tmux paste-buffer"

# ─── Optional: Better Visual Selection ───────────────────────────────────────

# Start visual selection with 'v' (like vim)
bind -T copy-mode-vi v send-keys -X begin-selection

# Rectangle/block selection with Ctrl+v
bind -T copy-mode-vi C-v send-keys -X rectangle-toggle
```

---

## Step 4: Reload the Configuration

Apply changes without restarting tmux:

```bash
tmux source-file ~/.tmux.conf
```

Or if you're outside a tmux session:

```bash
tmux start-server && tmux source-file ~/.tmux.conf
```

---

## How to Use It

### Method 1: Mouse Selection (Easiest)

1. Click inside any tmux pane to focus it
2. Hold and drag to select text — only that pane's text is selected
3. Release the mouse — text is automatically copied to the system clipboard
4. Paste anywhere with `Ctrl+V`

### Method 2: Keyboard Copy Mode (Precise)

1. Press `Ctrl+b [` to enter copy mode
2. Navigate with arrow keys or vi keys (`h j k l`)
3. Press `v` to start selection
4. Move to end of desired text
5. Press `y` or `Enter` to copy to system clipboard
6. Press `Ctrl+b P` to paste back into tmux, or `Ctrl+V` anywhere else

---

## Troubleshooting

### "xclip: Can't open display"

This happens if you're running in a headless or Wayland-only environment.

**Fix for Wayland:** Replace `xclip` with `wl-copy`:

```bash
sudo apt install wl-clipboard -y
```

Then update your `~/.tmux.conf`, replacing every occurrence of:
```bash
xclip -selection clipboard -in
```
with:
```bash
wl-copy
```

And for paste, replace:
```bash
xclip -selection clipboard -out
```
with:
```bash
wl-paste
```

---

### Text still copies from wrong pane

Make sure you **click to focus the target pane first** before selecting. You can add a visual indicator for the active pane:

```bash
# Highlight active pane border
set -g pane-active-border-style 'fg=colour51,bold'
set -g pane-border-style 'fg=colour238'
```

---

### Copy mode exits before I finish selecting

Make sure this line is **not** in your config:
```bash
set -g aggressive-resize on   # unrelated but can cause issues
```

And confirm you're using `copy-pipe-and-cancel` (not just `copy-pipe`) for clean exits.

---

## Quick Reference Card

| Action | Shortcut |
|---|---|
| Enter copy mode | `Ctrl+b [` |
| Start selection (vi) | `v` |
| Block selection | `Ctrl+v` |
| Yank / copy | `y` or `Enter` |
| Exit copy mode | `q` or `Escape` |
| Paste from clipboard | `Ctrl+b P` |
| Scroll up in copy mode | `Ctrl+u` |
| Scroll down in copy mode | `Ctrl+d` |

---

## Final `~/.tmux.conf` at a Glance

```bash
set -g mouse on
setw -g mode-keys vi
set -g focus-events on

unbind -T copy-mode-vi MouseDragEnd1Pane
bind -T copy-mode-vi MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"
bind -T copy-mode-vi Enter             send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"
bind -T copy-mode-vi y                 send-keys -X copy-pipe-and-cancel "xclip -selection clipboard -in"
bind -T copy-mode-vi v                 send-keys -X begin-selection
bind -T copy-mode-vi C-v               send-keys -X rectangle-toggle
bind P run "xclip -selection clipboard -out | tmux load-buffer - && tmux paste-buffer"

set -g pane-active-border-style 'fg=colour51,bold'
set -g pane-border-style 'fg=colour238'
```

---

That's it! You now have a tmux setup where:
- ✅ Selection stays within the focused pane
- ✅ Copied text lands in Ubuntu's system clipboard
- ✅ Both mouse and keyboard workflows are supported

Happy multiplexing! 🖥️