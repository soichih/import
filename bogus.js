#!/usr/bin/env node
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
 
var url = 'mongodb://localhost:27017/warehouse';
mongo.MongoClient.connect(url, function(err, db) {
    console.log("Connected correctly to server");

    var datasets = [];
    for(var i = 0;i < 5000;++i) {
        datasets.push({
            "user_id" : "1",
            "project" : mongo.ObjectId("5941a225f876b000210c11e5"),
            "datatype" : mongo.ObjectId("58c33bcee13a50849b25879a"),
            "name" : "bogus data "+i,
            "desc" : "bodus "+i,
            "meta": {
                "subject": (i/5),
            },
            "tags" : [ 
                "hcp" 
            ],
            "datatype_tags" : [],
            "storage" : "dcwan/hcp",
            "storage_config" : {
                "subdir": (i/5)+"/freesurfer",
            },
            "removed": false,
            "create_date": new Date(),
        });
    }
    var col = db.collection('datasets');
    /*
    col.insertMany(datasets,function(err, result) {
        if(err) throw err;
        console.dir(result);
        db.close();
    });
    */
    console.dir(datasets);

});
