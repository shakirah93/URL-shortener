const express = require("express");
const bodyParser = require("body-parser");
const shortid = require("shortid");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const { sendEmail } = require("./emails");

const app = express();

// to use body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Serve index.html from the 'views' folder
app.use(express.static("views"));

// generate path to the urlMappings.json
const urlMappingsFilePath = path.join(__dirname, "urlMappings.json");

// initilize URL mappings
let urlMappings = {};

async function loadUrlMappings() {
  try {
    const data = await fs.readFile(urlMappingsFilePath, "utf-8");
    urlMappings = JSON.parse(data);
  } catch (error) {
    console.error("Error loading mappings: ", error.message);
  }
}
loadUrlMappings();

async function saveUrlMappings() {
  try {
    await fs.writeFile(
      urlMappingsFilePath,
      JSON.stringify(urlMappings, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error saving URL mappings: ", error.message);
  }
}

// Route to handle shortening a URL
app.post("/shorten", (req, res) => {
  // this will get the value of our URL from the form
  const longUrl = req.body.longUrl;

  // generate corresponding short URL
  const shortUrl = shortid.generate();

  // Ensure that the longUrl is in the right format
  const completeLongUrl = /^(f|ht)tps?:\/\//i.test(longUrl)
    ? longUrl
    : `http://${longUrl}`;

  // store the URL mapping in memory
  urlMappings[shortUrl] = completeLongUrl;

  // save the object generated to the urlMappings.json file
  saveUrlMappings();

  // send the details of the shortened url to the email address entered
  sendEmail(
    req.body.email,
    "URL Shortened",
    `Your short URL: http://localhost:${PORT}/${shortUrl}`
  );

  res.json({ shortUrl });
});

// Route to redirect to the original URL
app.get("/:shortUrl", (req, res) => {
  // get the shortUrl from the URL generated above
  const shortUrl = req.params.shortUrl;

  const longUrl = urlMappings[shortUrl];

  if (longUrl) {
    res.redirect(longUrl);
  } else {
    res.status(404).send("Short URL not found");
  }
});
