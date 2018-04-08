#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
 
var url = 'mongodb://localhost:27017/warehouse';

exports.upsert = function(project, datasets, cb) {
    mongo.MongoClient.connect(url, function(err, db) {
        if(err) throw err;
        console.log("connected to mongo");

        //first load all datasets 
        var new_datasets = [];
        var col = db.collection('datasets');
        col.find({project: project}).toArray(function(err, exists) {
            if(err) throw err;
            //now, find *new* datasets
            console.log("existing", exists.length);
            datasets.forEach(dataset=>{
                var found = null;
                exists.forEach(exist=>{
                    if(!dataset.datatype_tags) dataset.datatype_tags = [];
                    if(
                        exist.meta.subject == dataset.meta.subject &&
                        exist.meta.session == dataset.meta.session &&
                        exist.datatype.toString() == dataset.datatype.toString() &&
                        exist.datatype_tags.toString() == dataset.datatype_tags.toString()
                    ) found = exist;
                });
                if(!found) {
                    new_datasets.push(Object.assign({
                        //defaults
                        project,
                        user_id: "1",
                        tags: [],
                        datatype_tags: [],
                        desc: dataset.desc || dataset.storage_config.files[0].s3,
                        status : "stored",
                        removed: false,
                        create_date: new Date(),
                    }, dataset));
                } else {
                    console.log("updating", found._id);//, dataset.storage_config);
                    col.updateOne({ _id: found._id }, { $set: dataset }, (err, result)=>{
                        console.dir(result);
                    });
                }
            });
            console.log("found ",new_datasets.length,"new dataset");
            if(new_datasets.length == 0) return cb();
            col.insertMany(new_datasets,function(err, result) {
                if(err) throw err;
                db.close();
                cb();
            });
        });
    });
}
