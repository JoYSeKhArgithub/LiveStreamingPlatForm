import {WebSocket, WebSocketServer} from 'ws';
const matchSubscribers = new Map();

function subscribe (matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId,new Set())
    }
    matchSubscribers.get(matchId).add(socket)
}

function unSubscribe(matchId,socket){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return;

    subscribers.delete(socket)

    if(subscribers.size === 0){
        matchSubscribers.delete(matchId)
    }
}

function cleanUpSubScriber(socket){
    for(const matchId of socket.subscription){
        unSubscribe(matchId,socket)
    }
}


function broadCastToCommnetry(matchId,payload){
    console.log("Attempting broadcast for Match ID:", matchId);
    console.log("Type of Match ID:", typeof matchId);

    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);
    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message)
        }
    }
}


function sendJson(socket,payload){
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload))
}

function broadCastToAll(wss,payload){
    wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify(payload))
        }
    });
}

function handleMessage(socket,data){
    let message;
    try {
        message = JSON.parse(data.toString())
    } catch (error) {
        sendJson(socket, {type: 'error',message: 'Invalid JSON'})
    }
    if(message?.type === 'subscribe' && !isNaN(message.matchId)){
        subscribe(message.matchId,socket);
        socket.subscription.add(message.matchId);
        sendJson(socket, { type: 'subscribe',matchId: message.matchId});
        return;
    }

    if (message?.type === 'unsubscribe' && !isNaN(message.matchId)){
        unSubscribe(message.matchId,socket)
        socket.subscription.delete(message.matchId);
        sendJson(socket, { type: 'unsubscribe',matchId: message.matchId})
    }

}


export function attachedWebsocketServer(server){
    const wss = new WebSocketServer({
        server,path: '/ws',maxPayload: 1024*1024
    })
    wss.on('connection',(socket)=>{
        socket.isAlive = true;
        socket.on('pong',()=> socket.isAlive = true)

        socket.subscription = new Set()

        sendJson(socket,{type: 'welcome'});

        socket.on('message',(data)=>{
            handleMessage(socket,data)
        })

        socket.on('error',()=>{
            socket.terminate()
        });

        socket.on('close',()=>{
            cleanUpSubScriber(socket)
        })

        socket.on('error',console.error)
    });

    const interval = setInterval(()=>{
        wss.clients.forEach((ws)=>{
            if(ws.isAlive === false)  return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    },3000)

    wss.on('close',()=> clearInterval(interval))

    function broadCastMatchCreated(match){
        broadCastToAll(wss,{type: 'match_created',data: match})
    }

    function broadCastCommnetry(matchId,commnetry) {
        broadCastToCommnetry(matchId, { type: 'commentry', data: commnetry })
    }

    return { broadCastMatchCreated, broadCastCommnetry }

}