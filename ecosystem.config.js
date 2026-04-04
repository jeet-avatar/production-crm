const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx > 0) {
      let key = line.substring(0, idx).trim();
      let val = line.substring(idx + 1).trim();
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      envVars[key] = val;
    }
  });
}
module.exports = {
  apps: [{
    name: "crm-backend",
    script: "dist/server.js",
    cwd: "/var/www/crm-backend",
    env: envVars,
  }]
};
