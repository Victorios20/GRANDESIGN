import fs from "node:fs"
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
const payload = { version: pkg.version, releasedAt: new Date().toISOString() }
fs.writeFileSync("./version.json", JSON.stringify(payload, null, 2))
