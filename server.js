const express = require('express')
const app = express()
const port = 2019
// other package
const fs = require('fs')
// core - socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);
// core - UDP server 
const udp = require('dgram');
const server_download = udp.createSocket('udp4');

/* ======================== SERVER - SOCKET.IO ========================= */
let files = {}
let struct = {
  name: null,
  type: null,
  size: 0,
  data: [],
  slice: 0,
}

// listening port 2019
server.listen(port, () => console.log(`App listening on port ${port}!`));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))

io.on('connection', (socket) => {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event',  (data) => {
    console.log(data);

  });
  socket
  // set 10 second - send data info to master server
  setInterval( () => {
    socket.emit('receive_file_info', {data: getAllFilesFromFolder()})
  }, 10000)

  // listen client upload a file
  socket.on('upload-file', (data) => {
    if (!files[data.name]) {
      files[data.name] = Object.assign({}, struct, data);
      files[data.name].data = [];
    }
    //convert the ArrayBuffer to Buffer
    data.data = Buffer.from(new Uint8Array(data.data));
    //save the data
    files[data.name].data.push(data.data);
    files[data.name].slice++;

    if (files[data.name].slice * 100000 >= files[data.name].size) {
      //do something with the data
      var fileBuffer = Buffer.concat(files[data.name].data);

      fs.writeFile('./public/'+ data.name, fileBuffer, (err) => {
        delete files[data.name];
        if (err) return socket.emit('upload error');
        socket.emit('end upload');
        console.log("UPLOAD SUCCESS")
      });
    } else {
      socket.emit('request slice upload', {
        currentSlice: files[data.name].slice
      });
    }
  })
  //
  socket.emit("message", "connected")
  socket.on('message', (data) => {
    console.log(data);
    // var address = srv.address();
    // var client = dgram.createSocket("udp4");
    // var message = new Buffer(data);
    // client.send(message, 0, message.length, address.port, address.address, function(err, bytes) {
    //   client.close();
    // });
  });
});



/*===========================Initialize a UDP server=============================*/
server_download.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  socket.sockets.emit('udp message', msg);
});

server_download.on('listening', (name) => {
  console.log("udp listening")
  //== Do stuff to find your file  
  fs.readFile('./public/'+ name, (err, data) => {
    if(err) return err
    server_download.emit("send_file_download", {buffer: data})
    console.log('send file to client ...');
  })

})

server_download.bind(7788)

/*=========================== COMMON FUNCTION==============================*/
const getAllFilesFromFolder = () => {
  let results = []
  const dir = './public/'
  fs.readdirSync(dir).forEach(element => {
    const file = dir + element

    const stat = fs.statSync(file)

    if (stat && stat.isDirectory()) {
      results = results.concat(_getAllFilesFromFolder(file))
    } else {
      const fn = {
        fileName: element,
        size: Math.round((stat.size / 1024) * 100) /100,
        ext: element.split('.').pop(),
      }

      results.push(fn);
    }
  });
  return results
}

//app.listen(port, () => console.log(`App listening on port ${port}!`))