const fs = require('fs');
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Ensure this is set in your workflow
const REPO_URL = 'https://api.github.com/repos/yourusername/yourrepo/issues'; // Replace with your details

async function fetchIssues() {
    const response = await fetch(REPO_URL, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues = await response.json();
    return issues;
}

async function writeIssuesToFile() {
    try {
        const issues = await fetchIssues();
        fs.writeFileSync('./src/_data/issues.json', JSON.stringify(issues, null, 2));
        console.log('Issues written to /src/_data/issues.json');
    } catch (error) {
        console.error(error.message);
    }
}

writeIssuesToFile();
