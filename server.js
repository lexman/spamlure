console.log('Start 2');
const ENV = process.env.ENV;
const BASE_URL = process.env.BASE_URL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const mongoUri = process.env.MONGOURI;

// init project
var express = require('express');
var nunjucks  = require('nunjucks');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var assert = require('assert');
var multer = require('multer');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var striptags = require('striptags');

var upload = multer({ storage:multer.memoryStorage() });
var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
// For uploading files with mutli-part
app.use(bodyParser.urlencoded({
  extended: true
}));

nunjucks.configure('views', {
  autoescape: true,
  express   : app
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/accounts", function (request, response) {
  accounts.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    response.send(docs);
  });
});

app.get("/screenshots/:screeenshot_id", function (request, response) {
  var screeenshot_id = ObjectID(request.params.screeenshot_id);
  screenshots.findOne({ _id :screeenshot_id}, function(err, doc) {
    if (err) {
      response.status(404).send("Screenshot not found");
      return;
    }
    response.type(doc.mimetype);
    response.send(doc.blob.buffer);
  });
}); 

//var transporter = nodemailer.createTransport('smtps://alexandre.bonnasseau%40gmail.com:pencilpe@smtp.gmail.com'); 
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
});

function sendmail(from, to, subject, message, image) {
    var mailData = {
      from: from,
      to: to,
      subject: subject,
      text: striptags(message),
      html: message,
      attachments: [
        {   // define custom content type for the attachment
          filename: 'screenshot',
          content: 'hello world!',
          contentType: 'text/plain'
        },
      ]
    };
  /*transporter.sendMail(mailData , function(error, info){
    if(error){
        return console.log(error);
    }
  });*/
  console.log('Message sent: ' + info.response);
  
}

app.post("/send_mail", function (request, response) {
  var account_id = ObjectID(request.body.account_id);
  console.log(request.body)
  accounts.findOne({ _id :account_id}, function(err, doc) {
    if (err) {
      response.status(404).send("Account not found");
      return;
    }
    console.log("Account")
    console.log(doc)
    var screeenshot_id = ObjectID(doc.screeenshot);
    screenshots.findOne({ _id :screeenshot_id}, function(err, screenshot) {
      if (err) {
        response.status(404).send("Screenshot not found");
        return;
      }
      console.log("Screenshot")
      console.log(screenshot);
    
      accounts.update({_id:account_id}, {$set:{contact:request.body.contact}}, function(err, result) {
        if (err) {
            console.log("Error updating account " + account_id);
            response.sendStatus(500);
            return;
        }
        sendmail('"Alexandre de spamlure" <contact@spamlure.com>',
                 'alexandre.bonnasseau@gmail.com, test@lexman.org',
                 request.body.object,
                 request.body.message,
                 'toto');
      });
    });
  });
  response.sendStatus(204);
});


// creates a new entry in the accounts collection with the submitted values
app.post("/accounts", upload.single('screenshot'), function (request, response) {
  img = {blob:request.file.buffer, mimetype:request.file.mimetype};
  screenshots.insert(img, function(err, result) {
    if (err) {
        console.log("Error inserting new screenshot");
        response.sendStatus(500);
        return;
    }
    screenshot_id = result.insertedIds[0];
    console.log("Inserted new screenshot " + screenshot_id);
    doc = {site: request.body.site, mail: request.body.mail, contact: request.body.contact, screenshot : screenshot_id};
    accounts.insert(doc, function(err, result) {
      if (err) {
          console.log("Error inserting new account");
          response.sendStatus(500);
          return;
      } 
      response.redirect('/').send(doc);
    });
  } );
});

app.get("/accounts/:account_id", function (request, response) {
  var account_id = ObjectID(request.params.account_id);
  accounts.findOne({ _id :account_id}, function(err, doc) {
    if (err) {
      response.status(404).send("Account not found");
      console.log("Can't find account" + account_id);
      return;
    }
    doc.base_url = BASE_URL;
    app.render('mail.html', doc, function(err, html) {
      if (err) {
        response.status(500).send("Internal error");
        console.log("Can't render mail");
        return;
      }
      console.log(doc);
      doc.message = html;
      response.render('account.html', doc);
    });
  });
});

MongoClient.connect(mongoUri, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to Mongodb server");
  accounts = db.collection('accounts' + ENV);
  screenshots = db.collection('screenshots' + ENV);

  // listen for requests :)
  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
   
});

