---
title: Set Up Google Analytics in Your Jekyll Chirpy Site
categories: [website, analytics]
tags: [Website, Analytics, Web Development]
image: /assets/img/website/google-jekyll.webp
alt: "Jekyll - Google Analytics" 
---

## Introduction

- This pages provides the steps to create a google analytics account to start collecting insights from website's traffic and user behaviour.
- Below are the step by step instructions:

### 1 . Sign up for Google Analytics

- Visit the  [Google Analytics](https://analytics.google.com/) page and login into your google account.
- Click on `Start measuring`
- Account Creation:
  - Account Name: Provide an account name ( blog or website name)
  - Data Sharing Settings: Leave the default data sharing settings selected.
  - Click Next
- Property Creation:
  - `Property Name`: Choose a descriptive name, such as Blog Analytics or Chirpy Site Analytics.
  - `Reporting Time Zone`: Select your local timezone.
  - `Currency`: Select your preferred currency.
  - Click Next
- Business Details:
  - Industry Category: For a tech blog select Computers & Electroncis
  - Business Size: Choose the size of the business.

- Business Objectives: Select the objectives that best match your goals. For a technical blog, consider:
  - Generate leads
  - Raise brand awareness
  - Examine user behavior
  - Click Create
  - Agree to Terms of Service:
  - Review and accept the Google Analytics terms of service.
  - Start Collecting Data:

- Choose Data Collection Source: Select Web
  - Set Up Web Data Collection:
  - Website URL: Enter your website URL.
  - Stream Name: Suggest a descriptive name for your stream, such as My Blog Stream or Chirpy Site Stream.
  - Click to generate the tracking ID and global site tag click Create Stream

- Copy the Measurement ID:
  - After the stream is created, note down your Measurement ID (it looks like G-XXXXXXXX).

### 2. Set Up Google Analytics in Your Jekyll Chirpy Site

1. Update _config.yml with Your Google Analytics ID:
    - Open your _config.yml file and add or update the Google Analytics section:

    ```sh
    analytics:
      google:
        id: "G-XXXXXXXX" # replace with your actual Google Analytics Measurement ID
    ```

2. Ensure the _includes Directory Exists:

    ```sh
    mkdir -p _includes
    ```

    - This command creates the _includes directory if it doesn’t already exist. 
    - This directory is a standard Jekyll folder used for storing reusable content snippets, like our Google Analytics code. 

3. Create the analytics.html File:
    - Create analytics.html in the _includes directory to isolate the Google Analytics tracking code, making it easier to manage and include across multiple pages in our Jekyll site.
    - Create a file named analytics.html in the _includes directory.
    - Add the following code into the file:

    ```sh
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ site.google_analytics.id }}"></script>
    <script>
    /* global dataLayer */
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{ site.google_analytics.id }}');
    </script>
    ```

    - The /* global dataLayer */ tells the text editor or linter that dataLayer is a global variable, preventing it from showing warnings about dataLayer being undefined.
    - The use of {{ site.google_analytics.id }} instead of a hardcoded ID allows you to set the Google Analytics ID in your _config.yml file, making it easier to update or change in the future.

4. Modify default.html in the _layouts Directory:
    - Modify the default.html file to include the Google Analytics code on all pages while ensuring it only loads in the production environment. This approach prevents tracking during development and testing.
    - Add the following lines into default.html just above the closing </head> tag to include the analytics.html file conditionally:

    ```sh
    <head>
    {% if jekyll.environment == 'production' and site.google_analytics %}
        {% include analytics.html %}
    {% endif %}
    </head>
    ```

    - This placement ensures that the Google Analytics code is included within the <head> section of your HTML document, which is the recommended location for such scripts. Placing it just before the closing </head> tag, ensures it’s one of the last things loaded in the head, which can help with page load performance.

### 3. Build and Deploy Your Site

1. Build the Site:
    - Run the build command with the production environment variable to ensure Google Analytics is included:

    ```sh
    JEKYLL_ENV=production bundle exec jekyll build -d "_site"
    ```

    - The JEKYLL_ENV=production environment variable tells Jekyll to build the site in production mode, enabling features like Google Analytics that are meant only for the live site.

2. Commit and Push the Changes:

    - Stage, commit, and push your changes to your repository:

    ```sh
    git add .
    git commit -m "Add Google Analytics tracking to the site"
    git push
    ```

### 4. Verify Google Analytics Integration

1. **Check Real-Time Report**

    - Verify that your site is sending data to [Google Analytics](https://analytics.google.com/)
      - Visit the Google Analytics Dashboard.
      - Select your Jekyll Chirpy site’s property.
      - Select Realtime
      - Open your website in a separate browser tab or window.
      - Navigate through your site and watch for activity in the Real-Time report.

    > It may take a few hours before data starts appearing in your Google Analytics dashboard.
    {: .prompt-info }

2. Inspect Your Site’s Source Code

- Confirm that the Google Analytics code is properly embedded in your site:

  - Open your live website in any browser.
  - Right-click and select View Page Source
  - Search for the Google Analytics tracking code in the <head> section. It should look similar to this:

    ```sh
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXX');
    </script>
    ```
