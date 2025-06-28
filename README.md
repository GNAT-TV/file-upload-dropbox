# Anonymous and Secure File Upload Dropbox

This project provides a secure, high-performance, and cost-free "File Dropbox" that allows anonymous users to upload large files directly into a specific Google Drive folder. It is designed to be embedded within a website and includes email notifications upon successful uploads.

The system is built on a "serverless" architecture, leveraging Google Apps Script for the user interface and a Cloudflare Worker as a high-speed, secure proxy for handling upload initiations.

## Features

-   **Anonymous Uploads:** Users do not need a Google account to upload files.
-   **Large File Support:** Utilizes Google's Resumable Upload protocol, allowing for multi-gigabyte files.
-   **Resumable and Robust:** Uploads can recover from network interruptions and session timeouts.
-   **Secure:** A Service Account is used for authentication, meaning no user credentials or sensitive keys are ever exposed to the browser.
-   **High Performance:** A Cloudflare Worker proxy initiates the upload, then the browser uploads file chunks directly to Google's servers at maximum speed.
-   **Email Notifications:** Automatically sends a configurable email notification with the filename and a link to the destination folder upon every successful upload.
-   **Embeddable:** Designed to be embedded directly into any modern webpage, with a strong recommendation for **Google Sites** for maximum compatibility.

## How It Works: System Architecture

The application uses a hybrid architecture to achieve security, performance, and compatibility.

1.  **Front-End UI (Google Apps Script `HtmlService`):** The user-facing component is a React application contained within a single `index.html` file. It is served by Google Apps Script, which also provides the `sendEmailNotification` backend function. Crucially, hosting on Apps Script places the UI on a `google.com` domain, which is necessary to allow the app to make calls to the Cloudflare Worker proxy.
2.  **Initiation Proxy (Cloudflare Worker):** A lightweight, high-performance serverless function that acts as a secure intermediary for starting the upload. Its only job is to receive a request from the user's browser, use a Service Account to securely create a resumable upload session with the Google Drive API, and pass the unique upload URL back to the browser.
3.  **Authentication (Google Service Account):** A non-human Google Service Account is used for all interactions with Google Drive. Its private key is stored securely as an environment variable in the Cloudflare Worker.
4.  **Storage (Google Drive):** The final destination for the files is a designated Google Drive folder. The files are owned by the Google account that deploys the Apps Script project.

## Installation and Setup Guide

Follow these steps to deploy your own instance of the File Dropbox.

### Phase 1: Google Workspace Setup

1.  **Create a Drive Folder:** In Google Drive, create a new folder where files will be stored. Copy its **Folder ID** from the URL.
2.  **Create a Service Account:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project, and enable the **Google Drive API**.
    *   Navigate to **APIs & Services > Credentials** and create a new **Service account**.
    *   Go to the service account's **Keys** tab, click **Add Key**, and create a new **JSON** key. A file will be downloaded.
3.  **Share the Folder:** Go back to your Google Drive folder, click **Share**, and share it with the `client_email` from your downloaded JSON file, giving it **Editor** permissions.

### Phase 2: Cloudflare Worker Setup

1.  **Create a Worker:** In your Cloudflare dashboard, go to **Workers & Pages > Create Worker**. Deploy the default worker.
2.  **Add Worker Code:** Click **Edit code** and paste in the contents of `worker.js` from this repository.
3.  **Configure Environment Variables:** In the worker's **Settings > Variables**, add the following secure variables:
    *   `FOLDER_ID`: The ID of your Google Drive folder.
    *   `CLIENT_EMAIL`: The `client_email` from your JSON key file.
    *   `PRIVATE_KEY`: The entire `private_key` from your JSON key file (including the `-----BEGIN...` lines).
4.  **Save and deploy** the worker. Copy its public URL.

### Phase 3: Google Apps Script Project Setup

1.  **Create the Project:** Go to [script.google.com](https://script.google.com) and create a new project.
2.  **Add Project Files:**
    *   **`Code.gs`:** Paste the contents of `Code.gs` from this repository.
    *   **`index.html`:** Create an HTML file and paste the contents of `index.html` from this repository.
    *   **`appsscript.json`:** Enable the manifest file in editor settings and paste the contents of `appsscript.json` from this repository.
3.  **Configure the Script:**
    *   In `Code.gs`, set the `NOTIFICATION_EMAIL` and `FOLDER_ID` constants.
    *   In `index.html`, set the `INITIATION_URL` constant to your Cloudflare Worker URL.
4.  **Save the project.**

### Phase 4: Deploy the Web App

1.  In the Apps Script editor, click **Deploy > New deployment**.
2.  **Authorize Permissions:** Follow the prompts to authorize the script to send emails and make external requests.
3.  **Configure Deployment:** Set **Execute as:** `Me` and **Who has access:** `Anyone`.
4.  Click **Deploy** and copy the resulting Web App URL.

## How to Embed in a Google Site (Recommended)

Embedding in a Google Site is the most compatible method for this application.

1.  On your Google Site, select **Embed > By URL** from the "Insert" menu.
2.  Paste your deployed Web App URL.
3.  An embed block will appear. In the Google Sites editor, stretch this block to be full-width and give it a generous fixed height (e.g., `900px` or more) to ensure it does not get cut off on mobile devices. This will create extra whitespace on desktop, which is the necessary trade-off for universal mobile compatibility.
4.  Publish your site. The app will now be live and functional for all users on all devices.
