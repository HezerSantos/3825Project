const tls = require('tls');
const readline = require('readline');
const fs = require('fs')
const caCert = fs.readFileSync('server-cert.pem');


const options = {
  rejectUnauthorized: true,   //Makes sure that the server is valid to authroize handshake
  ca:caCert //Tls certificate
};

//Create Client
const client = tls.connect(8000, 'localhost', options, () => {
  console.log('Connected to server \n');
  console.log("Type --help for options\n")
});

//Eventlistener for received data
client.on('data', (data) => {
  console.log(`${data.toString()}\n`);
});

//Handler for client leaving
client.on('end', () => {
  console.log('Disconnected from server');
});

//Handler for standard input and output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


//Method to write to the server
rl.on('line', (input) => {
  readline.moveCursor(process.stdout, 0, -1); // This is for clearing the input. Important for manipulating how data is sent
  readline.clearLine(process.stdout, 0); //I am sending the data in a specific way which is why this is needed
  client.write(input); //Sends to server
  if (input === 'exit') {
    client.end();
    rl.close();
  }
});