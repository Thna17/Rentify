const fs = require("fs");
const path = require("path");
const { logger } = require('../utils/logger');

function updateDeploymentUrls(newUrl) {
  const envFilePath = path.resolve(__dirname, "..", ".env");
  
  // Read or initialize .env content
  let envContent = "";
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, "utf8");
  }

  // Parse existing URLs
  const urlRegex = /DEPLOYMENT_URLS=([^\n]*)/;
  const match = envContent.match(urlRegex);
  const currentUrls = match ? match[1].split(",").filter(Boolean) : [];
  // Format new URL
  const formattedUrl = newUrl.startsWith("https://") ? newUrl : `https://${newUrl}`;

  // Update URL list (prepend new URL, remove duplicates)
  const updatedUrls = [
    formattedUrl,
    ...currentUrls.filter(url => url !== formattedUrl)
  ];

  // Update .env content
  const updatedUrlString = `DEPLOYMENT_URLS=${updatedUrls.join(",")}`;
  const newEnvContent = match
    ? envContent.replace(urlRegex, updatedUrlString)
    : `${envContent}\n${updatedUrlString}`;

  fs.writeFileSync(envFilePath, newEnvContent, "utf8");
  logger.info(`Updated DEPLOYMENT_URLS with: ${formattedUrl}`);
}

module.exports = updateDeploymentUrls;