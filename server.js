console.log('Start 2');
const ENV = process.env.ENV;
const MAIL_TRANSPORT = process.env.MAIL_TRANSPORT;
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

var transporter = nodemailer.createTransport(MAIL_TRANSPORT); 

function sendmail(from, to, subject, message, image) {
    var attachments = [];
    if (image) {
      attachments = [
        {   // define custom content type for the attachment
          filename: 'screenshot',
          content: image.blob.buffer,
          contentType: image.mimetype
        }
      ];
    }
    var mailData = {
      from: from,
      to: to,
      bcc: from,
      subject: subject,
      text: striptags(message),
      html: message,
      attachments: attachments
    };
  transporter.sendMail(mailData , function(error, info){
    if(error){
        return console.log(error);
    }
    console.log('Message sent: ' + info.response);
  });

}

app.post("/send_mail", function (request, response) {
  var account_id = ObjectID(request.body.account_id);
  accounts.findOne({ _id :account_id}, function(err, doc) {
    if (err) {
      response.status(404).send("Account not found");
      return;
    }
    screenshots.findOne({ _id : doc.screenshot}, function(err, screenshot) {
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
      });
      console.log("Send mail")
      to = request.body.contact;
      from = doc.mail;
      // from = '"Alexandre Bonnasseau" <procedure@spamlure.com>';
      sendmail(from,
               to,
               request.body.subject,
               request.body.message,
               screenshot);
    });
  });
  response.sendStatus(204);
});

function create_acount(doc) {
  accounts.insert(doc, function(err, result) {
    if (err) {
        console.log("Error inserting new account");
        response.sendStatus(500);
        return;
    }
  });
}

// creates a new entry in the accounts collection with the submitted values
app.post("/accounts", upload.single('screenshot'), function (request, response) {
  doc = {
    site: request.body.site, 
    mail: request.body.mail,
    titre: request.body.titre,
    contact: request.body.contact, 
    screenshot : null,
    register_date : request.body.register_date
  };
  if (request.file) {
    img = {blob:request.file.buffer, mimetype:request.file.mimetype};
    screenshots.insert(img, function(err, result) {
      if (err) {
          console.log("Error inserting new screenshot");
          response.sendStatus(500);
          return;
      }
      doc.screenshot_id = result.insertedIds[0];
      console.log("Inserted new screenshot " + doc.screenshot_id);
      create_acount(doc);
      response.redirect('/');
    });
  } else {
    create_acount(doc);
    response.redirect('/');
  }
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

