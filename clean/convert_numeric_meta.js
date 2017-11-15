#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

var url = 'mongodb://localhost:27017/warehouse';

mongo.MongoClient.connect(url, function(err, db) {
    if(err) throw err;
    console.log("connected to mongo");

    //find datasets that we need to clean up
    var col = db.collection('datasets');
    col.find({}).forEach(dataset=>{
        for(let k in dataset.meta) {
            let m = dataset.meta[k];
            if(typeof m === 'number') {
                console.log("need to fix", dataset._id, dataset.project, k, m.toString());
                var set = {};
                set["meta."+k] = m.toString();
                col.updateOne({_id: dataset._id}, {$set: set}, (err, res)=>{
                    if(err) throw err;
                    console.log("fixed");
                });
            }
        }
    })
});
