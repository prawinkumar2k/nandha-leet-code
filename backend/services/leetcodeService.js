const axios = require('axios');

// LeetCode GraphQL endpoint
const LEETCODE_API = 'https://leetcode.com/graphql';

// User-agent to mimic browser
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://leetcode.com',
  'Origin': 'https://leetcode.com',
};

// Extract username from various URL formats
function extractUsername(profileUrl) {
  if (!profileUrl) return null;
  try {
    // Handle formats:
    // https://leetcode.com/u/USERNAME/
    // https://leetcode.com/u/USERNAME
    // https://leetcode.com/USERNAME/
    // https://leetcode.com/USERNAME
    // USERNAME (plain)
    const trimmed = profileUrl.trim().replace(/\/$/, '');

    const uMatch = trimmed.match(/leetcode\.com\/u\/([^\/\?]+)/i);
    if (uMatch) return uMatch[1];

    const directMatch = trimmed.match(/leetcode\.com\/([^\/\?]+)$/i);
    if (directMatch && directMatch[1] !== 'u') return directMatch[1];

    // Plain username
    if (!trimmed.includes('/')) return trimmed;

    return null;
  } catch (e) {
    return null;
  }
}

// Sleep utility for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function retryRequest(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
}

// GraphQL query for user public profile stats
async function getStudentProfile(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        profile {
          ranking
          reputation
          starRating
        }
      }
    }
  `;

  return retryRequest(async () => {
    const response = await axios.post(LEETCODE_API, {
      query,
      variables: { username }
    }, {
      headers: HEADERS,
      timeout: 15000
    });

    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    const user = response.data?.data?.matchedUser;
    if (!user) throw new Error(`User "${username}" not found`);
    return user;
  });
}

// Get solved problem stats
async function getSolvedProblems(username) {
  const profile = await getStudentProfile(username);

  const stats = { total: 0, easy: 0, medium: 0, hard: 0 };
  const acStats = profile?.submitStatsGlobal?.acSubmissionNum || [];

  for (const stat of acStats) {
    const diff = stat.difficulty?.toLowerCase();
    const count = stat.count || 0;
    if (diff === 'all') stats.total = count;
    else if (diff === 'easy') stats.easy = count;
    else if (diff === 'medium') stats.medium = count;
    else if (diff === 'hard') stats.hard = count;
  }

  // Validate total
  const calcTotal = stats.easy + stats.medium + stats.hard;
  if (stats.total === 0) stats.total = calcTotal;

  return stats;
}

// Get contest data
async function getContestRating(username) {
  const query = `
    query getUserContestRanking($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
        badge {
          name
        }
      }
      userContestRankingHistory(username: $username) {
        attended
        trendDirection
        problemsSolved
        totalProblems
        finishTimeInSeconds
        rating
        ranking
        contest {
          title
          startTime
        }
      }
    }
  `;

  return retryRequest(async () => {
    const response = await axios.post(LEETCODE_API, {
      query,
      variables: { username }
    }, {
      headers: HEADERS,
      timeout: 15000
    });

    if (response.data.errors) {
      // Non-fatal: user may not have contest data
      return { rating: 0, globalRanking: 0, history: [] };
    }

    const contestData = response.data?.data;
    return {
      rating: contestData?.userContestRanking?.rating || 0,
      globalRanking: contestData?.userContestRanking?.globalRanking || 0,
      attendedCount: contestData?.userContestRanking?.attendedContestsCount || 0,
      badge: contestData?.userContestRanking?.badge?.name || null,
      history: contestData?.userContestRankingHistory || []
    };
  });
}

// Get profile global ranking (non-contest)
async function getGlobalRanking(username) {
  const profile = await getStudentProfile(username);
  return profile?.profile?.ranking || 0;
}

// Get latest contest data for a user
function getLatestContest(contestHistory) {
  if (!contestHistory || contestHistory.length === 0) {
    return { solved: 0, total: 4, name: 'N/A', date: null };
  }

  // Sort by start time descending
  const sorted = [...contestHistory]
    .filter(c => c.attended)
    .sort((a, b) => {
      const aTime = a.contest?.startTime || 0;
      const bTime = b.contest?.startTime || 0;
      return bTime - aTime;
    });

  if (sorted.length === 0) {
    return { solved: 0, total: 4, name: 'N/A', date: null };
  }

  // Find the latest weekly or biweekly contest
  const latestContest = sorted.find(c => {
    const title = c.contest?.title?.toLowerCase() || '';
    return title.includes('weekly contest') || title.includes('biweekly contest');
  });

  const target = latestContest || sorted[0];

  return {
    solved: target.problemsSolved || 0,
    total: target.totalProblems || 4,
    name: target.contest?.title || 'Unknown',
    date: target.contest?.startTime ? new Date(target.contest.startTime * 1000).toISOString().split('T')[0] : null,
    rating: target.rating || 0,
    ranking: target.ranking || 0
  };
}

// Single combined GraphQL query for all data in one request
async function fetchStudentData(profileUrl) {
  const username = extractUsername(profileUrl);
  if (!username) {
    throw new Error(`Cannot extract username from URL: ${profileUrl}`);
  }

  const query = `
    query getCombinedData($username: String!) {
      matchedUser(username: $username) {
        username
        badges { name }
        languageProblemCount {
          languageName
          problemsSolved
        }
        tagProblemCounts {
          advanced { name problemsSolved }
          intermediate { name problemsSolved }
          fundamental { name problemsSolved }
        }
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
          totalSubmissionNum { difficulty count }
        }
        profile {
          ranking
        }
      }
      userContestRanking(username: $username) {
        rating
        globalRanking
        attendedContestsCount
        badge { name }
      }
      userContestRankingHistory(username: $username) {
        attended
        problemsSolved
        totalProblems
        rating
        ranking
        contest { title startTime }
      }
      recentAcSubmissionList(username: $username, limit: 15) {
        title
        timestamp
      }
    }
  `;

  return retryRequest(async () => {
    const response = await axios.post(LEETCODE_API, {
      query,
      variables: { username }
    }, {
      headers: HEADERS,
      timeout: 10000
    });

    const d = response.data?.data;
    if (!d) throw new Error(`No data returned for user "${username}"`);

    const user = d.matchedUser || {};
    if (!user) throw new Error(`User "${username}" not found on LeetCode`);

    // Parse solved stats and submission stats
    const stats = { total: 0, easy: 0, medium: 0, hard: 0 };
    for (const stat of user.submitStatsGlobal?.acSubmissionNum || []) {
      const diff = stat.difficulty?.toLowerCase();
      if (diff === 'all') stats.total = stat.count;
      else if (diff === 'easy') stats.easy = stat.count;
      else if (diff === 'medium') stats.medium = stat.count;
      else if (diff === 'hard') stats.hard = stat.count;
    }
    if (stats.total === 0) stats.total = stats.easy + stats.medium + stats.hard;

    let totalSubmissionsCount = 0;
    for (const stat of user.submitStatsGlobal?.totalSubmissionNum || []) {
      if (stat.difficulty?.toLowerCase() === 'all') {
        totalSubmissionsCount = stat.count;
        break;
      }
    }

    let acceptance_rate = 0;
    if (totalSubmissionsCount > 0) {
      acceptance_rate = (stats.total / totalSubmissionsCount) * 100;
    }

    // Parse Badges
    const badgesArray = (user.badges || []).map(b => b.name);
    const badgesString = JSON.stringify(badgesArray);

    // Parse Top Language
    let topLanguage = '';
    let maxLangSolved = 0;
    for (const lang of user.languageProblemCount || []) {
      if (lang.problemsSolved > maxLangSolved) {
        maxLangSolved = lang.problemsSolved;
        topLanguage = lang.languageName;
      }
    }

    // Parse DSA skill tag counts
    let fundamentalCount = 0;
    let intermediateCount = 0;
    let advancedCount = 0;
    for (const item of user.tagProblemCounts?.fundamental || []) fundamentalCount += item.problemsSolved;
    for (const item of user.tagProblemCounts?.intermediate || []) intermediateCount += item.problemsSolved;
    for (const item of user.tagProblemCounts?.advanced || []) advancedCount += item.problemsSolved;

    // Parse contest data — userContestRanking is null for non-participants
    const contestRanking = d.userContestRanking || null;
    const contestHistory = (d.userContestRankingHistory || []).filter(c => c.attended);
    const latestContest = getLatestContest(contestHistory);

    // profile.ranking = the rank shown on their public profile (ALL users have this)
    // contestRanking.rating = only for contest participants
    const profileRanking = user.profile?.ranking || 0;

    // Calculate real-time "today" and "yesterday" from recent submissions
    const recentSubmissions = d.recentAcSubmissionList || [];
    let recent_today = 0;
    let recent_yesterday = 0;

    // Create boundary timestamps in ms
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    for (const sub of recentSubmissions) {
      if (!sub.timestamp) continue;
      const subMs = parseInt(sub.timestamp) * 1000;
      if (subMs >= startOfToday) {
        recent_today++;
      } else if (subMs >= startOfYesterday) {
        recent_yesterday++;
      }
    }

    return {
      username,
      badges: badgesString,
      top_language: topLanguage,
      acceptance_rate: Number(acceptance_rate.toFixed(2)),
      total_submissions: totalSubmissionsCount,
      total_solved: stats.total,
      easy_solved: stats.easy,
      medium_solved: stats.medium,
      hard_solved: stats.hard,
      recent_today,
      recent_yesterday,
      contest_rating: contestRanking ? Math.round(contestRanking.rating || 0) : 0,
      global_ranking: profileRanking,
      contest_solved: latestContest.solved,
      contest_total: latestContest.total,
      latest_contest: latestContest,
      contest_history: contestHistory.slice(0, 20),
      fundamental_solved: fundamentalCount,
      intermediate_solved: intermediateCount,
      advanced_solved: advancedCount,
      language_stats: JSON.stringify(user.languageProblemCount || []),
      recent_submissions: JSON.stringify(recentSubmissions)
    };
  });
}

module.exports = {
  extractUsername,
  fetchStudentData,
  getSolvedProblems,
  getContestRating,
  getGlobalRanking,
  getLatestContest,
  sleep
};
