// getCommitId.js
const { execSync } = require('child_process');

const commitId = execSync('git rev-parse --short HEAD').toString().trim();
console.log(commitId);