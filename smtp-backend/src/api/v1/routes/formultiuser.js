const router = require("express").Router();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Function to create an OAuth2 client
const createOAuth2Client = (clientId, clientSecret, refreshToken) => {
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
};

// Function to create a transporter for sending emails
const createTransporter = async (user) => {
  const oAuth2Client = createOAuth2Client(
    user.clientId,
    user.clientSecret,
    user.refreshToken
  );
  const accessToken = await oAuth2Client.getAccessToken();
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: user.email,
      clientId: user.clientId,
      clientSecret: user.clientSecret,
      refreshToken: user.refreshToken,
      accessToken: accessToken.token,
    },
  });
};

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("file"), async (req, res) => {
  const emailList = req.body.emailList;
  let desc = req.body.desc;
  const subject = req.body.subject;
  const users = req.body.users;

  function generateRandomNumber() {
    const min = 10000000;
    const max = 99999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const randomNumber = generateRandomNumber();

  const changeDesc = (desc, recipient) => {
    const username = recipient.split("@")[0];

    desc = desc.replace("{username}", `${username}`);
    desc = desc.replace("{invoice}", `${randomNumber}`);

    return desc;
  };

  let totalSent = 0;
  let totalRejected = 0;
  let userIndex = 0; // Track the current user index
  let failedEmails = [];

  // Helper function to introduce a delay
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(5);

    let attachmentPath = null;
    if (req.file) {
      attachmentPath = path.join(uploadsDir, req.file.filename);

      if (!fs.existsSync(attachmentPath)) {
        console.error(`File not found: ${attachmentPath}`);
        return res.status(404).send("File not found");
      }
    }

    // Function to send a batch of emails
    const sendBatch = async (batch, user) => {
      const transporter = await createTransporter(user);
      const emailPromises = batch.map((recipient) =>
        limit(async () => {
          try {
            let mailOptions = {
              from: `${subject} <${user.email}>`,
              to: recipient,
              subject: `${subject} ${randomNumber}`,
              html: changeDesc(desc, recipient),
            };

            if (attachmentPath) {
              mailOptions.attachments = [
                { filename: req.file.originalname, path: attachmentPath },
              ];
            }

            let info = await transporter.sendMail(mailOptions);
            totalSent += info.accepted?.length || 0;
            totalRejected += info.rejected?.length || 0;
            console.log(`Email sent to ${recipient}`);
          } catch (error) {
            console.error(`Error sending email to ${recipient}:`, error);

            // Switch user if quota exceeded
            if (error.response && error.response.includes("Quota exceeded")) {
              userIndex = (userIndex + 1) % users.length; // Move to the next user
              console.log(
                `Switching to the next user: ${users[userIndex].email}`
              );
            }

            failedEmails.push(recipient);
          }
        })
      );

      await Promise.all(emailPromises);
    };

    let currentBatch = [];
    for (let i = 0; i < emailList.length; i++) {
      currentBatch.push(emailList[i]);
      if (currentBatch.length === 5 || i === emailList.length - 1) {
        const user = users[userIndex];
        await sendBatch(currentBatch, user);
        currentBatch = []; // Reset batch

        if (i < emailList.length - 1) {
          await delay(3000); // Wait for 3 seconds before sending the next email
        }
      }
    }

    if (attachmentPath && fs.existsSync(attachmentPath)) {
      fs.unlinkSync(attachmentPath);
    }

    res.status(200).json({
      message: "Emails sent successfully!",
      totalSent,
      totalRejected,
      failedEmails,
    });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).send("Error sending emails");
  }
});

module.exports = router;
