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
    //let project = new mongo.ObjectId("59a4d5a39823b1266ba14e13"); //nki-dev
    let project = new mongo.ObjectId("59a57af4b5e93a0023001416"); //nki-prod
    let datatypes = [new mongo.ObjectId("58c33bcee13a50849b25879a"), new mongo.ObjectId("58c33c5fe13a50849b25879b")];
    col.find({project, datatype: {$in: datatypes}, storage: "nki"}).toArray((err, datasets)=>{
        if(err) throw err;
        
        async.eachSeries(datasets, (dataset, next_dataset)=>{
            /*
            var found = false;
            exists.forEach(exist=>{
                if(
                    exist.meta.subject == dataset.meta.subject &&
                    exist.meta.session == dataset.meta.session &&
                    exist.datatype.toString() == dataset.datatype.toString() &&
                    exist.datatype_tags.toString() == dataset.datatype_tags.toString()
                ) found = true;
            });
            if(!found) new_datasets.push(dataset);
            */
            var s3_base = "data/Projects/RocklandSample/RawDataBIDS";
            var files = [];
            let base = s3_base+"/sub-"+dataset.meta.subject+"/ses-"+dataset.meta.session;

            switch(dataset.datatype.toString()) {
            case "58c33bcee13a50849b25879a": //t1
                files.push({s3: base+"/anat/sub-"+dataset.meta.subject+"_ses-"+dataset.meta.session+"_T1w.nii.gz", local: "t1.nii.gz"});
                break;
            case "58c33c5fe13a50849b25879b": //dwi
                files.push({s3: base+"/dwi/sub-"+dataset.meta.subject+"_ses-"+dataset.meta.session+"_dwi.nii.gz", local: "dwi.nii.gz"});
                files.push({s3: base+"/dwi/sub-"+dataset.meta.subject+"_ses-"+dataset.meta.session+"_dwi.bval", local: "dwi.bvals"});
                files.push({s3: base+"/dwi/sub-"+dataset.meta.subject+"_ses-"+dataset.meta.session+"_dwi.bvec", local: "dwi.bvecs"});
                break;
            default:
                console.error("wrong datatype", dataset.datatype);
                process.exit(1);
            }

            //update
            dataset.storage_config = {files};
            console.dir(dataset);
            col.updateOne({_id: dataset._id}, {$set: {storage_config: {files}}}, (err, result)=>{
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

