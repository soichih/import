#!/usr/bin/env node

const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
 
var url = 'mongodb://localhost:27017/warehouse';

mongo.MongoClient.connect(url, function(err, db) {
    if(err) throw err;
    console.log("connected to mongo");

    console.log("finding bad dtiinit");
    var col = db.collection('datasets');
    col.find({project: new mongo.ObjectId("59dcff5a7a73410027714521"), datatype: new mongo.ObjectId("58cb234be13a50849b25882f")}, (err, dtiinits)=>{
        if(err) throw err;
        console.dir(dtiinits);
    });
});

