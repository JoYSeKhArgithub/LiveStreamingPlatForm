import {WebSocket, WebSocketServer} from 'ws';
const matchSubscribers = new Map();

/**
 * Subscribe a WebSocket client to updates for a specific match.
 * Ensures there is a subscriber set for the match and adds the socket to it.
 * @param {number|string} matchId - Identifier of the match to subscribe to.
 * @param {WebSocket} socket - The WebSocket client to add to the match's subscribers.
 */
function subscribe (matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId,new Set())
    }
    matchSubscribers.get(matchId).add(socket)
}

/**
 * Remove a socket from the subscriber list for a specific match and delete the match entry if no subscribers remain.
 * @param {number|string} matchId - Identifier of the match whose subscription should be removed.
 * @param {WebSocket} socket - The WebSocket client to unsubscribe.
 */
function unSubscribe(matchId,socket){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return;

    subscribers.delete(socket)

    if(subscribers.size === 0){
        matchSubscribers.delete(matchId)
    }
}

/**
 * Remove the socket from every match subscription it currently holds.
 * @param {WebSocket & { subscription: Set<number|string> }} socket - WebSocket whose `subscription` set lists matchIds to unsubscribe; each matchId will be removed for this socket.
 */
function cleanUpSubScriber(socket){
    for(const matchId of socket.subscription){
        unSubscribe(matchId,socket)
    }
}


/**
 * Broadcasts a payload to all open WebSocket clients subscribed to a given match.
 * @param {string|number} matchId - Identifier of the match whose subscribers should receive the payload.
 * @param {*} payload - Value to be JSON-stringified and sent to subscribers.
 */
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


/**
 * Send a JSON-serializable payload over a WebSocket if the socket is open.
 * @param {WebSocket} socket - The WebSocket to send the payload on.
 * @param {*} payload - The value to JSON.stringify and transmit.
 */
function sendJson(socket,payload){
    if(socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload))
}

/**
 * Broadcasts a payload to every connected client of the given WebSocket server.
 * @param {import('ws').WebSocketServer} wss - The WebSocket server whose connected clients will receive the payload.
 * @param {*} payload - The value to serialize and send to clients; it will be JSON-stringified.
 */
function broadCastToAll(wss,payload){
    wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify(payload))
        }
    });
}

/**
 * Handle a raw incoming WebSocket message for subscription control and send appropriate responses.
 *
 * Attempts to parse the incoming data as JSON; if parsing fails, sends an error message to the socket.
 * If the parsed message has `type: 'subscribe'` and a numeric `matchId`, subscribes the socket to that match,
 * records the subscription on the socket, and sends a subscribe acknowledgement containing the `matchId`.
 * If the parsed message has `type: 'unsubscribe'` and a numeric `matchId`, removes the socket's subscription for that match
 * and sends an unsubscribe acknowledgement containing the `matchId`.
 *
 * @param {WebSocket} socket - The client WebSocket connection that sent the message; its `subscription` Set is mutated.
 * @param {Buffer|string} data - The raw message payload received from the client.
 */
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


/**
 * Attach a WebSocket server to an existing HTTP(S) server and expose helpers to broadcast match events.
 *
 * @param {import('http').Server|import('https').Server} server - The HTTP or HTTPS server to bind the WebSocket server to.
 * @returns {{ broadCastMatchCreated: function(match: any): void, broadCastCommnetry: function(matchId: number|string, commnetry: any): void }}
 * @returns {object} An object with broadcast helper functions:
 * - `broadCastMatchCreated(match)` — broadcasts a `match_created` event containing `match` to all connected clients.
 * - `broadCastCommnetry(matchId, commnetry)` — broadcasts a `commentry` event containing `commnetry` to clients subscribed to `matchId`.
 */
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