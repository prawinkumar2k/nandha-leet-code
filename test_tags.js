fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: `query {
            matchedUser(username: "MohammedSajath") {
                tagProblemCounts {
                    advanced { name problemsSolved }
                    intermediate { name problemsSolved }
                    fundamental { name problemsSolved }
                }
            }
        }`
    })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
