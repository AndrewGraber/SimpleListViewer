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

const random_name = require('node-random-name');

const inFile = './ContactsExport.csv';
const outFile = './HLOContacts.csv';

const rawIn = fs.readFileSync(inFile, {encoding: 'ascii', flag: 'r'});
const recordsIn = parse(rawIn, {columns: true});
var data = [];

recordsIn.forEach((row, i) => {
    if(!row.hasOwnProperty('Display Name') || !row.hasOwnProperty('Contact: Number')) {
        console.error("Missing data for the following entry:");
        console.error(row);
    }
    data.push([row['Contact: Number'], row['Display Name']]);
});

data = data.sort(sortFn);
console.log(data);

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

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
        console.log('Got pull request from the user known as \'' + socket.random_name + '\'!');
        socket.emit('pull_data_resp', data);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});