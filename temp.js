const axios = require('axios');
axios.get('https://leetcode.com/contest/api/ranking/weekly-contest-515/?pagination=1&region=global').then(r => {
    console.log("Total rank users:", r.data.total_rank.length);
    console.log("First user:", r.data.total_rank[0]);
    console.log("User num:", r.data.user_num);
}).catch(console.error);
