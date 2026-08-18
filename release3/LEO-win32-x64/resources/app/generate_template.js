const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.utils.book_new();

// The specified headers required by the application
const headers = [
    {
        'S.No': '',
        'reg_no': '',
        'name': '',
        'department': '',
        'leetcode_profile_url': ''
    }
];

const ws = XLSX.utils.json_to_sheet(headers);

// Make the columns wider
ws['!cols'] = [
    { wch: 10 }, // S.No
    { wch: 15 }, // reg_no
    { wch: 30 }, // name
    { wch: 15 }, // department
    { wch: 60 }  // leetcode_profile_url
];

// The import service looks for a sheet called 'cons'
XLSX.utils.book_append_sheet(wb, ws, 'cons');

XLSX.writeFile(wb, 'student_template.xlsx');
console.log('Template created at student_template.xlsx');
