const tls = require('tls');
const fs = require('fs');

//Tls certificates
const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem')
};

//Data structure to keep track of clients
const socketMap = new Map()
const messageMap = new Map()


//Id tracker to remember what Ids have been given
let socketIdAutoIncrement = 0
let messageIdAutoIncrement = 0
//Server
const server = tls.createServer(options, (socket) => {

    //Welcome message
    if (socketMap.size === 0){
        socket.write("You're the first client!\n")
    } else {
        socket.write('Connected Clients:')
        Array.from(socketMap.keys()).forEach(socketId => {
            socket.write(`-Client${socketId} \n`)
        })
        socket.write('-me \n') //This works because the socketMap isnt updated yet
    }


    socketIdAutoIncrement += 1;
    //Set this socketId
    const socketId = socketIdAutoIncrement;

    //socket data that contains the socket and a message array
    const socketData = {
        socket: socket,
        messageIds: new Set()
    }

    //Map that uses the socketId as a key and SocketData as value
    socketMap.set(socketIdAutoIncrement, socketData)
    
    console.log(`Client${socketIdAutoIncrement} connected`);


    //Eventlistener for data that is received
    socket.on('data', (data) => {
        //Console messages to sockets that are not this one
        const senderSocket = socketMap.get(socketId)
        try{
            if(data.toString() === '--help'){
                senderSocket.socket.write("Options:")
                senderSocket.socket.write(" Reply to message: --reply {messageId} {reply}\n")
                senderSocket.socket.write("     Example: --reply 1 hello world\n\n")
                senderSocket.socket.write(" Search by Client Id: --search {clientId}\n")
                senderSocket.socket.write("     Example: --search 1\n\n")
                senderSocket.socket.write(" Search by message contains message: --search {message}\n")
                senderSocket.socket.write("     Example: --search hello\n\n")
                return
            }

            //Options set
            // const options = new Set(['--reply', '--search']) Debugging purposes

            //Creates the message [ "option", "Id", "message =>"]
            const message = data.toString().split(" ")

            //If the message is sent with an option, the option is processed

            //Edge Case for if the options is --reply
            if(message[0] === '--reply'){
                //Edge case for no messages yet
                if(messageMap.length === 0){
                    senderSocket.socket.write("No messages to reply to\n")
                    return
                }

                
                messageIdAutoIncrement ++ //If there are messages, increment the id
                const replyMessage = message.slice(2).join(" ") //Get the reply message
                messageMap.set(messageIdAutoIncrement, replyMessage) //Set the reply message
                senderSocket.messageIds.add(messageIdAutoIncrement) //Add the message to socket

                const messageId = parseInt(message[1])  //Convert the id from string to Int

                const reply = message.slice(2).join(" ") //Get the reply ['Example', 'Message'] => 'Example Message'

                const messageById = messageMap.get(messageId) //Get the message

                //Send the message to each client in a specific format
                socketMap.forEach(({socket, messages}, id)  => {
                    if(socketId === id){
                        socket.write(`${messageIdAutoIncrement} Replied to '${messageById}': ${reply}`)
                        return
                    }
                    socket.write(`${messageIdAutoIncrement} Client${socketId} Replied to '${messageById}': ${reply}`)
                })
                return
            }

            //Edge case for search
            if(message[0] === '--search'){
                const id = parseInt(message[1]) //Get the client id if it exists and convert to int

                if(message.length === 2 && !Number.isNaN(id)){ //Search for clientid is fixed meaning only 2 elements
                                                               //Condition check for the second argument to be an int
                    const targetSocket = socketMap.get(id)  //If conditions are true, get the socket data
                    const messages = [] //Empty list to store searched messages

                    if (targetSocket.messageIds.size === 0){ //Edge case if socket Id doesnt have messages yet
                        socket.write(`Client${id} has no messages`)
                        return
                    }

                    targetSocket.messageIds.forEach(id => { //This returns the message ids for that socket
                        const message = messageMap.get(id) //Uses the message id and searches it in the Hash Map
                        messages.push(message) //Pushed the message to the empty list
                    })

                    socket.write(`Search Results for Client${id}:`) //Little description
                    messages.forEach(message => {
                        socket.write(`-${message}\n`) //Send the search results to the socket that searched
                    })
                    return
                }
                let search = message.slice(1).join(" ") //If the second argument is not an int, get the search result

                
                if(search){ //condition just in case search doesnt exist
                    const regex = new RegExp(search) //Creates a regex using the search
                    const results = [] //Empty list to track messages
                    messageMap.forEach((message, id) => {   //Loops through message map
                        const match = regex.test(message) //Returns a boolean
                        if(match){
                            results.push(message) //If there is a match, add to list
                        }
                    })

                    if(results.length > 0){ 
                        socket.write(`Search results for '${search}'\n`) //Edge case for matches
                    } else {
                        socket.write(`No results for '${search}'`) //Edge case if there are no matches
                        return
                    }
                    results.forEach(message => { //Send the search results to the socket that requested it
                        socket.write(`- ${message}\n`)
                    })
                }
                return
            }

            //For normal messages
            messageIdAutoIncrement ++ //Increment the id
            messageMap.set(messageIdAutoIncrement, data.toString()) //Set the message
            senderSocket.messageIds.add(messageIdAutoIncrement) //Add the message to socket

            //Send the message to each client in a specific format
            socketMap.forEach(({socket, messages}, id)  => {
                if(data.toString() == 'exit'){
                    socket.write(`Server: Client${socketId} disconnected`)
                    return
                }
                if(socketId === id){
                    socket.write(`${messageIdAutoIncrement} Me: ${data.toString()}`)
                    return
                }
                socket.write(`${messageIdAutoIncrement} Client${socketId}: ${data.toString()}`)
            })
            // console.log(messageMap) Debugging purposes
        } catch(e){
            console.error(e)
            const senderSocket = socketMap.get(socketId)
            senderSocket.socket.write("Message not Sent. Internal Server Error")
        }

    });

    //Socket error listener
    socket.on('error', (err) => {
    console.log("An error has occured:", err)
    })

    //Socket close handler
    socket.on('end', () => {
    socketMap.delete(socketId)
    console.log('Client disconnected');
    });
});

server.listen(8000, () => {
  console.log('Server listening on port 8000');
});