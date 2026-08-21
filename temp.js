const axios = require('axios');
axios.post('https://leetcode.com/graphql', {
  query: `query userContestRankingHistory($username: String!) { userContestRankingHistory(username: $username) { attended problemsSolved contest { title startTime } } }`,
  variables: { username: 'awice' }
}).then(r => {
    const history = r.data?.data?.userContestRankingHistory || [];
    console.log(history.slice(-3));
}).catch(console.error);
