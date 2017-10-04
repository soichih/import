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
    let project = new mongo.ObjectId("592dcc5b0188fd1eecf7b4ec"); //hcp-dev
    let datatypes = [
        new mongo.ObjectId("58c33bcee13a50849b25879a"), //t1
        new mongo.ObjectId("58c33c5fe13a50849b25879b"), //dwi
        new mongo.ObjectId("58cb22c8e13a50849b25882e"), //freesurfer
    ];
    col.find({project, datatype: {$in: datatypes}}).toArray((err, datasets)=>{
        if(err) throw err;
        
        async.eachSeries(datasets, (dataset, next_dataset)=>{

            var config = {};

            switch(dataset.datatype.toString()) {
            case "58c33bcee13a50849b25879a": //t1
                config = { files: [
                    {filepath: "/N/dcwan/projects/hcp/"+dataset.meta.subject+"/T1w/T1w_acpc_dc_restore_1.25.nii.gz", local: "t1.nii.gz"},
                ]};
                break;
            case "58c33c5fe13a50849b25879b": //dwi
                config = { files: [
                    {filepath: "/N/dcwan/projects/hcp/"+dataset.meta.subject+"/T1w/Diffusion/bvecs", local: "dwi.bvecs"},
                    {filepath: "/N/dcwan/projects/hcp/"+dataset.meta.subject+"/T1w/Diffusion/bvals", local: "dwi.bvals"},
                    {filepath: "/N/dcwan/projects/hcp/"+dataset.meta.subject+"/T1w/Diffusion/data.nii.gz", local: "dwi.nii.gz"},
                ]};
                break;
            case "58cb22c8e13a50849b25882e": //freesurfer
                config = { dirpath: "/N/dcwan/projects/hcp/"+dataset.meta.subject+"/T1w/"+dataset.meta.subject, local: "output"}
                break;
            default:
                console.error("wrong datatype", dataset.datatype);
                process.exit(1);
            }

            //update
            col.updateOne({_id: dataset._id}, {$set: {storage_config: config}}, (err, result)=>{
                next_dataset();
            });
        }, err=>{
            db.close();
        });
        /*
        console.log("found ",new_datasets.length,"new dataset");
        col.insertMany(new_datasets,function(err, result) {
            if(err) throw err;
            db.close();
            cb();
        });
        */
    });
});

