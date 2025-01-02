---
title: Jekyll Chirpy Theme - Word Wrap in Tables
categories: [website, jekyll, chirpy]
tags: [Website, Jekyll, Chirpy ]
---

## Enabling Word Wrap in Tables in Jekyll Chirpy Theme

In this blog, we’ll walk you through how to enable word wrapping in tables and ensure they adapt well to different screen sizes.

### Problem: Horizontal Scroll Bar in Tables

- By default, the Jekyll Chirpy theme might cause tables to display horizontal scroll bars when the content inside table cells is too long.
- This can be especially problematic for smaller screens, as users may have to scroll horizontally to view the full content of the table.

![Table Horizontal ScrollBar](/assets/img/website/table-horizontal-scrollbar.png)

- To fix this, we can modify the table cell styles to ensure that content within the table wraps instead of overflowing.

### Solution: Enabling Word Wrap in Table Cells

- To solve this issue and enable word wrapping, you can override the default styles in the Chirpy theme by editing the `jekyll-theme-chirpy.scss` file in the `assets/css` directory.
- Follow the steps below to implement this solution:

- `Step 1`: Locate the jekyll-theme-chirpy.scss File(Create the file if it is not present - ./assets/css/jekyll-theme-chirpy.scss)
- `Step 2`: Modify the CSS to Enable Word Wrap. You will need to add or modify the following CSS rule in the jekyll-theme-chirpy.scss file:

```scss
%table-cell {
  white-space: normal;
}
```

- Below is the complete file content that I have used:

```scss
---

@import "main";

%table-cell {
    white-space: normal;
  }
```

- This CSS rule tells the browser to apply normal text wrapping behavior within the table cells.

- `Step 3`: Rebuild Your Jekyll Site. Once you've made these changes, save the jekyll-theme-chirpy.scss file and rebuild your Jekyll site. You can do this by running:

```bash
bundle exec jekyll serve
```

- After rebuilding, check the tables in your site. The text inside the table cells should now automatically wrap based on the screen size, eliminating the need for horizontal scroll bars.
- Final Output:

  ![Table Word Wrap](/assets/img/website/table-word-wrap.png)

### Latest Solution

### Conclusion

If you're working with tables that contain large blocks of text or dynamic content, enabling word wrap is a simple yet effective way to ensure your tables remain clean and responsive.
