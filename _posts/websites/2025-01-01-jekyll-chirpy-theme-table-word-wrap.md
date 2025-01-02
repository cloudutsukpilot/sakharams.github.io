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

### Solution 1: Enabling Word Wrap in Table Cells

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

### Solution 2: Enabling Word Wrap in Table Cells

- As we are using @import in the above solution, we get a warning "Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0".
- To fix these warning, I have used the below code in the jekyll-theme-chirpy.scss file and it is working without any warnings on jekyll-theme-chirpy version 7.2.4.

```scss
---

{%- if jekyll.environment == 'production' -%}
@use "main.bundle";
{%- else -%}
@use "main";
{%- endif -%}

.table-wrapper>table thead th,
.table-wrapper>table tbody tr td {
    padding: .4rem 1rem;
    font-size: 95%;
    white-space: normal
}
```

### Conclusion

If you're working with tables that contain large blocks of text or dynamic content, enabling word wrap is a simple yet effective way to ensure your tables remain clean and responsive.
