fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: `query {
            matchedUser(username: "MohammedSajath") {
                languageProblemCount {
                    languageName
                    problemsSolved
                }
            }
        }`
    })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
