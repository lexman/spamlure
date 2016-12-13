var fs = require('fs');
fs.readdir('/tmp', (err, files) => {
  files.forEach(file => {
    console.log(file);
  });
}); 