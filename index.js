const fs = require('fs');
const readline = require('readline');
const express = require('express');
const app = express();
const cors = require("cors");
const IncomingForm = require("formidable").IncomingForm;

const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200
};

const args = process.argv.slice(2);

app.use(cors(corsOptions));

app.post("/upload", (req, res) => {
    const form = new IncomingForm();

    form.on("file", (field, file) => {
        readTextFile(file.path).then(resp => {
            if (resp.length > 0 && resp[0] !== '') {
                let projects = buildProjects(resp);
                let filteredProjects = filterProjects(projects);
                let result = findLongestPeriod(filteredProjects);
                return res.json(result);
            } else {
                return res.json(null);
            }
        });
    });
    form.on("end", () => {
        console.log('end')
    });
    form.parse(req);
});

if (args.includes('console')) {
    readTextFile('data.txt').then(resp => {
        if (resp.length > 0 && resp[0] !== '') {
            let projects = buildProjects(resp);
            let filteredProjects = filterProjects(projects);
            let result = findLongestPeriod(filteredProjects);
            console.log(result);
        } else {
            console.log('Empty file!');
        }

    });
} else {
    app.listen(3001, () => {
        console.log("Server started!");
    });
}

function findLongestPeriod(filteredProjects) {
    let firstProject = filteredProjects.values().next().value;
    let longestPeriod = {
        employees: [firstProject[0].empID, firstProject[1].empID],
        period: firstProject[0].period + firstProject[1].period
    };

    filteredProjects.forEach((value, key) => {
        let project = filteredProjects.get(key);
        let tempPeriod = project[0].period + project[1].period;
        if(tempPeriod > longestPeriod.period) {
            const daysWorked = getDaysWorked(project[0].dateFrom, project[0].dateTo) + getDaysWorked(project[1].dateFrom, project[1].dateTo);
            longestPeriod = {
                employees: [project[0].empID, project[1].empID],
                project: project[0].projectID,
                days: daysWorked
            }
        }
    });

    return longestPeriod;
}


function filterProjects(projects) {
    let projectsWithMoreEmployees = new Map();
    projects.forEach((value, key) => {
        if(Array.isArray(projects.get(key))) {
            let period = 0;
            let employees = [];
            projects.get(key).forEach(value => {
                period = value.dateTo.getTime() - value.dateFrom.getTime();
                employees.push({ ...value, period });
            });

            employees.sort(compare);
            employees = employees.slice(0, 2);
            projectsWithMoreEmployees.set(key, employees);
        }
    });

    return projectsWithMoreEmployees;
}

function buildProjects(resp) {
    let projects = new Map();
    resp.forEach(employee => {
        if (employee) {
            let currentEmployee = employee.split(',');
            let empID = currentEmployee[0].trim();
            let projectID = currentEmployee[1].trim();
            let dateFrom = !isValidDate(new Date(currentEmployee[2])) ? new Date() : new Date(currentEmployee[2]);
            let dateTo = !isValidDate(new Date(currentEmployee[3])) ? new Date() : new Date(currentEmployee[3]);

            if (projects.get(projectID)) {
                let obj = projects.get(projectID);
                if (Array.isArray(obj)) {
                    obj.push({ empID, projectID, dateFrom, dateTo });
                    projects.set(projectID, obj);
                } else {
                    projects.set(projectID, [obj, { empID, projectID, dateFrom, dateTo }]);
                }

            } else {
                projects.set(projectID, { empID, projectID, dateFrom, dateTo });
            }
        }
    });

    return projects;
}

function getDaysWorked(from, to) {
    const timeDiff  = to - from;
    return Math.round(timeDiff / (1000 * 60 * 60 * 24));
}

function compare( a, b ) {
    if ( a.period > b.period ){
        return -1;
    }
    if ( a.period < b.period ){
        return 1;
    }
    return 0;
}

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

async function readTextFile(file) {
    let rows = [];
    const fileStream = fs.createReadStream(file || './data.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        rows.push(line);
    }

    return rows;
}