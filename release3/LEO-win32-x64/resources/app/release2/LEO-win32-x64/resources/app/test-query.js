const axios = require('axios');
const q = 'query($u:String!,$l:Int!){recentAcSubmissionList(username:$u,limit:$l){title timestamp}}';
axios.post('https://leetcode.com/graphql', {
    query: q,
    variables: { u: 'Dharsini_2411', l: 15 }
}, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
}).then(r => console.log(r.data.data.recentAcSubmissionList.length, r.data.data.recentAcSubmissionList))
    .catch(e => console.log(e.message));
