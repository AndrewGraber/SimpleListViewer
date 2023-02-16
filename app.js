const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
    maxHttpBufferSize: 1e8
});

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const random_name = require('node-random-name');

//Config Values
const config = {
    ID_NAME: "Matter Number",
    HEADER_1: "Matter Number",
    HEADER_2: "Matter Name",
    IN_FILE: "./MatterExport.csv",
    OUT_FILE: "./HLO_Matters.csv",
    CSV_IN_NAME_TITLE: "Matter: Name",
    CSV_IN_NUMBER_TITLE: "Matter: Number"
};

const rawIn = fs.readFileSync(config.IN_FILE, {encoding: 'ascii', flag: 'r'});
const recordsIn = parse(rawIn, {columns: true});
var data = [];

recordsIn.forEach((row, i) => {
    if(!row.hasOwnProperty(config.CSV_IN_NAME_TITLE) || !row.hasOwnProperty(config.CSV_IN_NUMBER_TITLE)) {
        console.error("Missing data for the following entry:");
        console.error(row);
    }
    data.push([row[config.CSV_IN_NUMBER_TITLE], row[config.CSV_IN_NAME_TITLE]]);
});

function saveNewFile(new_data) {
    var success = true;
    const writableStream = fs.createWriteStream(config.OUT_FILE);
    const columns = [
        config.HEADER_1,
        config.HEADER_2
    ];

    const csv_data = stringify(new_data, { header: true, columns: columns });
    
    fs.writeFile(config.OUT_FILE, csv_data, err => {
        if(err) {
            success = false;
            console.error(err);
        }
    });

    if(success) {
        console.log("Successfully saved new data to \'" + config.OUT_FILE + "\'!");
    } else {
        console.log("Error saving new data!");
    }

    return success;
}

data = data.sort(sortFn);
console.log(data);

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static('public'))

function sortFn(a, b) {
    if(isNaN(parseInt(a[0]))) {
        if(isNaN(parseInt(b[0]))) {
            return a[1].localeCompare(b[1]);
        } else {
            return -1;
        }
    } else if(isNaN(parseInt(b[0]))) {
        return 1;
    } else {
        return a[0] - b[0];
    }
}

io.on('connection', (socket) => {
    var name = random_name();
    console.log('A new user has connected! I shall call them \'' + name + '\'.');
    socket['random_name'] = name;
    
    socket.on('disconnect', () => {
        console.log('The user known as \'' + socket.random_name + '\' disconnected. Goodbye, whoever you are!');
    });

    socket.on('pull_data', (msg) => {
        console.log('Got pull request for CSV data from the user known as \'' + socket.random_name + '\'.');
        socket.emit('pull_data_resp', data);
    });

    socket.on('pull_config', (msg) => {
        console.log('Got pull request for config data from the user known as \'' + socket.random_name + '\'.')
        socket.emit('pull_config_resp', config);
    });

    socket.on('save_changes', (new_data) => {
        console.log('Got request to save changes from the user known as \'' + socket.random_name + '\'.');
        success = saveNewFile(new_data);
        socket.emit('save_changes_resp', success);
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});