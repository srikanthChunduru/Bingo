const express = require('express');
var app = express()
app.use(express.static('public'))
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
   res.sendfile('bingo.html');
});


var preDefinedRCD = {
    "D1": ['0-0', '1-1', '2-2', '3-3', '4-4'],
    "D2": ['4-0', '3-1', '2-2', '3-1', '4-0']
};

var MAX_ROWS = 5;
var MAX_COLS = 5;

for(i=0; i < MAX_ROWS; i++){
    preDefinedRCD['R'+i] = [];
    preDefinedRCD['C'+i] = [];
    for (j=MAX_COLS-1; j>=0; j--){
        preDefinedRCD['R'+i].push(''+i+'-'+j);
        preDefinedRCD['C'+i].push(''+j+'-'+i);
    }
}
var preDefKeys = Object.keys(preDefinedRCD);
console.log(preDefinedRCD);
console.log(preDefKeys);

var clients = 0;
var poolOfReadyUsers = [];
var gamesSessionsInProgress = {};
var users = {};

io.on('connection', function(socket) {
    clients++;
    
    socket.on('userReady', function(numberBtnMap, btnNumberMap){
        var p = [];
        console.log(typeof(p));
        console.log(socket.id)  
//        console.log(numberBtnMap)  
//        console.log(btnNumberMap)  
        console.log('user ready for game play');
        users[socket.id] = {
            "socket_connection":socket,
            "bnm": numberBtnMap,
            "nbm": btnNumberMap,
            "game": startGameSession()
        };
//        console.log(users)
        console.log(users.keys)
        
        var userReady = getAReadyUser();
        
        if(!userReady){
            poolOfReadyUsers.push(socket.id);
            console.log(poolOfReadyUsers);
        }else{
            console.log(userReady);
            console.log(poolOfReadyUsers);
            gameId = socket.id + userReady;
            users[socket.id]['gameId'] = gameId;
            users[socket.id]['gameRCDs'] = [];
            users[socket.id]['otherPlayer'] = userReady;
            users[userReady]['gameId'] = gameId;
            users[userReady]['otherPlayer'] = socket.id;
            users[userReady]['gameRCDs'] = [];
            gamesSessionsInProgress[gameId] = {};
            gamesSessionsInProgress[gameId]['turnOf'] = userReady;
            gamesSessionsInProgress[gameId]['turnNumber'] = 0;
            users[userReady]["socket_connection"].emit("yourTurn");
            users[socket.id]["socket_connection"].emit("waitOtherPlayerTurn")
            console.log(gamesSessionsInProgress);
        }
    });
    
    socket.on('inGameButtonClicked', function(btnId, value){
        console.log(btnId);
        console.log(value);
        console.log(socket.id);
        if(gamesSessionsInProgress[users[socket.id]['gameId']]['turnOf'] == socket.id){
        gamesSessionsInProgress[gameId]['turnNumber']++;
        users[socket.id]["game"][btnId] = 1;
        p2Id = users[socket.id]['otherPlayer'];
        p2BtnId = users[p2Id]["nbm"][value];
        users[p2Id]["game"][p2BtnId] = 1;
        users[p2Id]["socket_connection"].emit("disableButton", p2BtnId);
        if(checkIfGame(socket.id) == true){
            console.log(""+ "user "+socket.id+" won");
            socket.emit("wonTheGame");
            users[p2Id]["socket_connection"].emit("youLose");
        }else if(checkIfGame(p2Id) == true){
            console.log(""+ "user "+p2Id+" won");
            users[p2Id]["socket_connection"].emit("wonTheGame");
            socket.emit("youLose");
        }else{
            console.log("game is still on");
            gamesSessionsInProgress[users[socket.id]['gameId']]['turnOf'] = p2Id;
            socket.emit("waitOtherPlayerTurn");
            users[p2Id]["socket_connection"].emit("yourTurn");
        }
        }else{
            console.log("Not your turn " + socket.id);
            console.log(btnId);
            socket.emit('notYourTurn', btnId)
            }         
});
    
});

http.listen(3000, function() {
   console.log('listening on localhost:3000');
});

function getAReadyUser(){
    if(poolOfReadyUsers.length >0){
        return poolOfReadyUsers.pop();
    }
    return false;
}

function startGameSession(){
    var gameStatus = {};
    for(var i=0;i<5;i++){
            for(var j=0;j<5;j++){
                gameStatus[""+i+"-"+j] = 0;
                }
        }
    return gameStatus;
    }

function checkIfGame(userId){
    if(gamesSessionsInProgress[gameId]['turnNumber'] < 15){
        console.log("Still a long way to go");
        return false;
    }else{
        var userRCD = users[userId]['gameRCDs'];
        console.log('USER RCDs '+ userRCD);
        for(var rcd in preDefKeys){
            console.log('rcd' + rcd);
            console.log('predefkeys[rcd]' + preDefKeys[rcd]);
            if(!userRCD.includes(preDefKeys[rcd])){
                var count =0;
                for(var btnId in preDefinedRCD[preDefKeys[rcd]]){
                    if(!users[userId]["game"][preDefinedRCD[preDefKeys[rcd]][btnId]]){
                        break;
                    }
                    count++;
                }
                if (count==5){
                    console.log("I got a count of 5");
                    users[userId]['gameRCDs'].push(preDefKeys[rcd]);
                }
            }
        }
    }
    console.log(users[userId]['gameRCDs'].length);
    if(users[userId]['gameRCDs'].length == 5){
        return true;
        }
}