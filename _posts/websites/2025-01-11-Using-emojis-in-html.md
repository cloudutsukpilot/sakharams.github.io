---
title: Using Emoji's 😀 in HTML
categories: [website, jekyll]
tags: [Website, Jekyll ]
image: /assets/img/website/chirpy-posts.jpg
description: How to make your articles more readable and engaging using Emoji's?
---

## Emoji's 😆 in HTML

- There are mainly two ways to display emojis on your web page, but first:

### HTML charset

- To show the correct symbols, inform the web browser of the character set used on your page.
- Although the UFT-8 is the default character set, it’s better to declare it explicitly to ensure the correct information is displayed.
- So, in the HTML <head> tags, put:

```html
<meta charset="UTF-8>
```

1. **First mode: using the emoji Unicode**

- First, go to this [Unicode](https://unicode.org/emoji/charts/full-emoji-list.html) site page with the full emoji list.
- Find the emoji that you want to use.
- For example, I’ll choose the smiley upside-down face with the code `U+1F643`.

![HTML Emoji Unicode](/assets/img/website/html-emoji-unicode.png)

- Now replace the U+ for &#x, adding and ; at the end, and put it on your HTML code:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Lorem Ipsum</title>
  </head>
  <body> 
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    <p>&#x1F643;</p>
  </body>
</html>
```

- And the result will be: Page example

![HTML Emoji Unicode result](/assets/img/website/html-emoji-unicode-result.png)

### 2. Second mode: Copy and Paste (Everyone's Favorite)

- You can copy and paste the emoji. Your code will be:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Lorem Ipsum</title>
  </head>
  <body> 
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    <p>🙃</p>
  </body>
</html>
```

- And you will have the same result.

### Emojis by Category

### Faces

😀 😀 🤣 🫠 🙃 😇 😊 😍 🤩 😘 😘 🤑 😰 😡 😭 😴 🧔‍♂️ 🇮🇳 🤷‍♂️ 🤦‍♂️👍👎 👆 🫵 🤙👊 ✌ 👌 💯 💥 👽 💀 🤖

### Daily

✅ ❌ ❗❓➡ ⛔ ⚠ 🔗 ⚙ 📌 📉 📈 📅 📁 💼 📝 ✒ ✉ 💰 🌠 ⭐ 🕖 🚀 ⚓ 🚗 🏡 🌍 🍻 🎂 💐 🐞 🐌	🐋 👤 🚴 🕺 💃 🚶 🕵🏿‍♂️ 🔜 💾 💳 🔎 ▶ 🛠

### Animals

🦖 🦢 🐓 🐛 🐧 🐞🐳 🐍

### Numbers

#️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟

### Technology

🛜 📴 🔆 🎦 ⏯	☸️ ☸ 🐳 🖧 👨🏻‍💻 🔄 ♾️ 🛡️ 🔎 

Good luck with your html emotions !!!
