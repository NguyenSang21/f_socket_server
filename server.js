const express = require('express')
const udp = require('dgram');
const app = express()
const port = 2019
const fs = require('fs')
const server = require('http').Server(app);
const server_download = udp.createSocket('udp4');
const io = require('socket.io')(server);

let files = {}
let struct = {
  name: null,
  type: null,
  size: 0,
  data: [],
  slice: 0,
}

server.listen(port, () => console.log(`App listening on port ${port}!`));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))

io.on('connection', (socket) => {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event',  (data) => {
    console.log(data);
  });
  // set 10 second - send data info to master server
  setInterval( () => {
    socket.emit('receive_file_info', {data: getAllFilesFromFolder()})
  }, 10000)

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
});

/* dowload using udp*/
server_download.on('file_download', (stream, name, callback) => {
  //== Do stuff to find your file
  callback({
    name : "filename",
    size : 500
  });

  var MyFileStream = fs.createReadStream(name);
  MyFileStream.pipe(stream);
})

server_download.bind(2021)

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