#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
 
var url = 'mongodb://localhost:27017/warehouse';
mongo.MongoClient.connect(url, function(err, db) {
    console.log("Connected correctly to server");

    //datatype IDs are the same on brain-life.org and dev1
    var datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
    var datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
    var datatype_freesurfer = mongo.ObjectId("58cb22c8e13a50849b25882e"); 

    if(os.hostname() == "brain-life.org") {
        var project = mongo.ObjectId("5941a225f876b000210c11e5"); //hcp project
    } else {
        var project = mongo.ObjectId("592dcc5b0188fd1eecf7b4ec"); //hcp project
    }

    //reading directory
    var path = '/mnt/dcwan/projects/brainlife/hcp';
    fs.readdir(path, function(err, subjects) {
        if(err) throw err;

        var datasets = [];

        console.log("number of subjects", subjects.length);
        async.eachSeries(subjects, (subject, next_subject)=>{

            //decide which subject to load
            //if(subject[5] != "0") return next_subject(); //only load subjects that ends with specific number
            //if(!~["107220"].indexOf(subject)) return next_subject(); //only load select subjects

            console.log("processing ",subject);

            async.series([
                //t1
                next=>{
                    fs.stat(path+"/"+subject+"/t1", (err, stats)=>{
                        console.error(err);
                        if(err) return next(); //no t1 then skip
                        console.log("has t1");
                        datasets.push({
                            "user_id" : "1",
                            "project" : project,
                            "datatype" : datatype_t1,
                            "name" : "HCP t1 dataset",
                            "desc" : "/T1w/T1w_acpc_dc_restore_1.25.nii.gz",
                            "meta": {
                                "subject": subject,
                            },
                            "tags" : [ 
                                "hcp" 
                            ],
                            "datatype_tags" : [ "acpc_aligned" ],
                            "storage" : "dcwan/hcp",
                            "storage_config" : {
                                "subdir": subject+"/t1",
                            },
                            "removed": false,
                            "create_date": stats.ctime,
                        });

                        next();
                    });
                },

                //dwi(3t)
                next=>{
                    fs.stat(path+"/"+subject+"/dwi", (err, stats)=>{
                        if(err) return next(); //no dwi then skip
                        console.log("has dwi(3t)");
                        datasets.push({
                            "user_id" : "1",
                            "project" : project,
                            "datatype" : datatype_dwi,
                            "name" : "HCP dwi dataset",
                            "desc" : "/T1w/Diffusion/data.nii.gz (with bvecs/bvals)",
                            "meta": {
                                "subject": subject,
                            },
                            "tags" : [ 
                                "hcp" , "3t"
                            ],
                            "datatype_tags" : [],
                            "storage" : "dcwan/hcp",
                            "storage_config" : {
                                "subdir": subject+"/dwi",
                            },
                            "removed": false,
                            "create_date": stats.ctime,
                        });
                        next();
                    });
                },
                
                //dwi(7t)
                next=>{
                    fs.stat(path+"/"+subject+"/dwi7t", (err, stats)=>{
                        if(err) return next(); //no dwi then skip
                        console.log("has 7t data!", path+"/"+subject+"/dwi7t");
                        datasets.push({
                            "user_id" : "1",
                            "project" : project,
                            "datatype" : datatype_dwi,
                            "name" : "HCP dwi(7t) dataset",
                            "desc" : "/T1w/Diffusion_7T/data.nii.gz (with bvecs/bvals)",
                            "meta": {
                                "subject": subject,
                            },
                            "tags" : [ 
                                "hcp" , "7t"
                            ],
                            "datatype_tags" : ["7t"],
                            "storage" : "dcwan/hcp",
                            "storage_config" : {
                                "subdir": subject+"/dwi7t",
                            },
                            "removed": false,
                            "create_date": stats.ctime,
                        });
                        console.dir(datasets);
                        next();
                    });
                },
                
                //freesurfer
                next=>{
                    fs.stat(path+"/"+subject+"/freesurfer", (err, stats)=>{
                        if(err) return next(); //no dwi then skip
                        console.log("has freesurfer");
                        datasets.push({
                            "user_id" : "1",
                            "project" : project,
                            "datatype" : datatype_freesurfer,
                            "name" : "HCP freesurfer output",
                            "desc" : "HCP freesurfer output from HCP Pipeline",
                            "meta": {
                                "subject": subject,
                            },
                            "tags" : [ 
                                "hcp" 
                            ],
                            "datatype_tags" : [],
                            "storage" : "dcwan/hcp",
                            "storage_config" : {
                                "subdir": subject+"/freesurfer",
                            },
                            "removed": false,
                            "create_date": stats.ctime,
                        });
                        next();
                    });
                },
            ], err=>{
                if(err) console.error(err); 
                next_subject();
            });

        }, function(err) {
            if(err) throw err;
            console.log("dataset.length: ", datasets.length);
            var col = db.collection('datasets');

            //first load all datasets in hcp project    
            var new_datasets = [];
            col.find({project: project}).toArray(function(err, exists) {
                if(err) throw err;
                //now, find new datasets
                console.log("existing", exists.length);
                datasets.forEach(dataset=>{
                    var found = false;
                    exists.forEach(exist=>{
                        if(
                            exist.meta.subject == dataset.meta.subject &&
                            exist.datatype.toString() == dataset.datatype.toString() &&
                            exist.datatype_tags.toString() == dataset.datatype_tags.toString()
                        ) found = true;
                    });
                    if(!found) new_datasets.push(dataset);
                });
                console.log("found ",new_datasets.length,"new dataset");
                col.insertMany(new_datasets,function(err, result) {
                    if(err) throw err;
                    console.dir(result);
                    db.close();
                });
            });
        });
    });
});
