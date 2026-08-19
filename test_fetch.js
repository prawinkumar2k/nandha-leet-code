const { fetchStudentData } = require('./backend/services/leetcodeService');

async function test() {
    console.log('Testing fetch for a real student...');
    try {
        const data = await fetchStudentData('https://leetcode.com/u/MohammedSajath');
        console.log('✅ SUCCESS! Data fetched:');
        console.log('  Username:', data.username);
        console.log('  Total Solved:', data.total_solved);
        console.log('  Easy:', data.easy_solved, '| Medium:', data.medium_solved, '| Hard:', data.hard_solved);
        console.log('  Contest Rating:', data.contest_rating);
        console.log('  Latest Contest:', data.latest_contest?.name);
    } catch (err) {
        console.log('❌ ERROR:', err.message);
        if (err.response?.data) {
            console.log('Response errors:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

test();
