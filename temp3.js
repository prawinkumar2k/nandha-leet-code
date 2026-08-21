const { fetchStudentData } = require('./backend/services/leetcodeService');
fetchStudentData('prawinkumar2k').then(d => console.log('prawinkumar2k:', d?.latest_contest)).catch(console.error);
fetchStudentData('neal_wu').then(d => console.log('neal_wu:', d?.latest_contest)).catch(console.error);
