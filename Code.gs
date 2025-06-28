/**
 * @fileoverview This is the server-side backend for the "File Dropbox" web app.
 * Its primary purpose is to serve the front-end user interface and provide a server-side
 * function for sending email notifications upon successful file uploads.
 */

// --- CONFIGURATION ---

/**
 * The email address where notifications for new file uploads will be sent.
 * @type {string}
 */
const NOTIFICATION_EMAIL = "--- ENTER YOUR NOTIFICATION EMAIL HERE ---";

/**
 * The ID of the Google Drive folder where uploaded files will be stored.
 * @type {string}
 */
const FOLDER_ID = "--- ENTER YOUR FOLDER ID HERE ---";


// --- WEB APP ENDPOINT ---

/**
 * Handles GET requests by serving the main HTML page of the application.
 *
 * The .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) method is
 * the critical setting that permits this Web App to be embedded in an iframe
 * on an external website (like WordPress). Without this, browsers will block
 * the connection with a "refused to connect" error.
 *
 * @param {object} e - The event parameter for a GET request.
 * @returns {HtmlOutput} The HTML service output to be rendered in the browser.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("File Dropbox")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// --- CLIENT-CALLABLE FUNCTION ---

/**
 * Sends an email notification after a successful file upload.
 * This function is called from the client-side JavaScript using google.script.run.
 * @param {string} filename - The name of the file that was uploaded.
 * @returns {{success: boolean}|{success: boolean, error: string}} An object indicating the outcome of the email operation.
 */
function sendEmailNotification(filename) {
  try {
    // Construct the URL to the destination folder for convenience.
    const folderUrl = `https://drive.google.com/drive/folders/${FOLDER_ID}`;

    const subject = `New File Dropbox Upload: ${filename}`;
    
    // Create a user-friendly HTML body for the email notification.
    const htmlBody = `
      <html>
        <body>
          <h2>A new file has been uploaded to the file dropbox.</h2>
          <p><b>Filename:</b> ${filename}</p>
          <p>You can view the folder containing the file by clicking the link below:</p>
          <p><a href="${folderUrl}">Go to Upload Folder</a></p>
        </body>
      </html>
    `;

    // Use Apps Script's built-in MailApp service to send the email.
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    
    // Return a success status to the client (optional, but good practice).
    return { success: true };

  } catch (error) {
    // Log any errors for debugging purposes in the Apps Script execution logs.
    console.error("Failed to send email notification: " + error.toString());
    // Return a failure status to the client.
    return { success: false, error: error.toString() };
  }
}
