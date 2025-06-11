---
layout: post
title: Disable Beep in Windows Terminal
categories: [ Productivity, WSL ]
tags: [ Windows, Hacks ]
image: /assets/img/productivity/productivity-tools.avif
description: Disable Beep in Windows Terminal
---

### How to Disable Beep in WSL Terminal on Windows

- Microsoft’s releases of the Windows Subsystem for Linux (WSL) and Windows Terminal were causes for much excitement as they signified Microsoft’s commitment to improving the developer experience on Windows.
- There is still much to be desired from both products, but they have already significantly improved the developer experience on Windows.

### Disable Beep in WSL Terminal on Windows

- One of the issues with Windows Terminal is the annoying sound that gets triggered when you hit a text or navigation boundary using the tab, backspace, or arrow keys.
- Apparently, that sound is a bell, and it is left on by default.
- To disable it, you can follow the short steps outline below.

1. Install Latest Windows Terminal Version
    - Before you begin, make sure you’ve installed the latest version of Windows Terminal.
    - You can check the installed version by navigating to the down (🔽) button next to the last open tab → About.
    - If not, you can upgrade the Windows Terminal from the Microsoft Store.
    - Once the latest version installed, we can now configure to disable the beep sound on Terminal.

2. Open Windows Terminal then open its settings page.

3. On the left panel under Profiles, you can select a particular profile to configure. In the case, we will edit the Default profile to disable the sound on all profiles.
    - Select Defaults → Advanced (under Additional settings section).

4. Expand the Bell notification style option then uncheck the checkbox to disable the beep sound on Terminal for all profiles → Hit the Save button to apply the changes.
    - Go back to the shell and the annoying beep sound should be gone.