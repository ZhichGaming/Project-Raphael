let githubRequestsLeft: number | null = null;
let githubRequestsReset: Date | null = null;
// The number of times `checkGitHubRateLimited` has been called since the rate limits were last set.
let lastIterationOfSettingRateLimits: number | null = null;

/**
 * Checks if the GitHub API rate limit has been reached.
 * Important: Rate limit values should be set using headers from the GitHub API response before calling this function.
 * @returns true if the GitHub API rate limit has been reached, false otherwise.
 */
export default async function checkGitHubRateLimited(): Promise<boolean> {
    console.log('Checking GitHub API rate limits...');
    console.log('Requests left:', githubRequestsLeft);
    console.log('Reset date:', githubRequestsReset);
    
    if (!githubRequestsReset) {
        // If the reset date is not set, get the rate limits from the GitHub API.
        await updateGitHubRateLimits();
    } else if (lastIterationOfSettingRateLimits) {
        // If the rate limits have not been updated in the last 3 calls, update them.
        // This is to ensure that the rate limits are always up to date.
        if (lastIterationOfSettingRateLimits > 3) {
            console.warn('GitHub API rate limits were not updated for more than 3 calls. Did you forget to set the rate limits manually?');

            await updateGitHubRateLimits();
        }
    }

    // If the reset date is in the past, reset the rate limit values because the limit has been reset.
    if (githubRequestsReset! > new Date()) {
        githubRequestsLeft = null;
        githubRequestsReset = null;
        lastIterationOfSettingRateLimits = 0;

        return false;
    }
    
    if (githubRequestsLeft && githubRequestsLeft <= 0) {
        console.error('GitHub API rate limit reached. Please wait until the limit resets at', githubRequestsReset);
        return true;
    }

    lastIterationOfSettingRateLimits!++;
    return false;
}

/**
 * Updates the GitHub API rate limit values.
 */
async function updateGitHubRateLimits() {
    const response = await fetch('https://api.github.com/rate_limit');
    const data = await response.json();

    githubRequestsLeft = data.resources.core.remaining;
    // This multiplies the seconds by 1000 to convert them to milliseconds.
    githubRequestsReset = new Date(data.resources.core.reset * 1000);

    lastIterationOfSettingRateLimits = 0;
}

export function setGitHubRateLimits(requestsLeft: number, reset: Date) {
    githubRequestsLeft = requestsLeft;
    githubRequestsReset = reset;

    lastIterationOfSettingRateLimits = 0;
}
