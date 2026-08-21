const axios = require('axios');

async function getGlobalLatestContests() {
    try {
        const response = await axios.post('https://leetcode.com/graphql', {
            query: `query { pastContests(pageNo: 1, numPerPage: 5) { data { title startTime } } }`
        }, { timeout: 8000 });
        const past = response.data?.data?.pastContests?.data || [];
        const weekly = past.find(c => c.title.includes('Weekly') && !c.title.includes('Biweekly'));
        const biweekly = past.find(c => c.title.includes('Biweekly'));
        
        return {
            weekly: weekly ? { contest_name: weekly.title, contest_date: new Date(weekly.startTime * 1000).toISOString().split('T')[0] } : null,
            biweekly: biweekly ? { contest_name: biweekly.title, contest_date: new Date(biweekly.startTime * 1000).toISOString().split('T')[0] } : null
        };
    } catch (e) {
        return { error: e.message };
    }
}

getGlobalLatestContests().then(console.log);
