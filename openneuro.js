#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

const upsert = require('./upsert');
 
//datatype IDs are the same on brain-life.org and dev1
const datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
const datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
const datatype_func = mongo.ObjectId("59b685a08e5d38b0b331ddc5"); 

if(os.hostname() == "brain-life.org") {
    var project = mongo.ObjectId(""); //production
} else {
    var project = mongo.ObjectId("5a0cf2e65f92bc5b569367c0"); //dev
}

const s3_root = "ds000030/ds000030_R1.0.4/uncompressed";
const path = '/link/openneuro/30r4';

fs.readdir(path, function(err, subjects) {
    if(err) throw err;
    let datasets = [];
    console.log("number of subjects", subjects.length);
    async.eachSeries(subjects, (subject, next_subject)=>{
        console.log("subject:", subject);
        let s3base = s3_root+"/sub-"+subject;
        
        //handle each data types
        async.series([
            next=>{
                console.log("...anat");
                fs.stat(path+"/"+subject+"/anat/t1.nii.gz", (err, stats)=>{
                    if(err) return next(); //no t1 then skip
                    console.log(path+"/"+subject+"/anat/t1.nii.gz");
                    datasets.push({
                        "user_id" : "1",
                        "project" : project,
                        "datatype" : datatype_t1,
                        "desc" : "",
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ ],
                        "datatype_tags" : [ ],
                        "status" : "stored",
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/anat/sub-"+subject+"_T1w.nii.gz", local: "t1.nii.gz"},
                            ] 
                        },
                        "removed": false,
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },
            
            next=>{
                console.log("...dwi");
                fs.stat(path+"/"+subject+"/dwi/dwi.nii.gz", (err, stats)=>{
                    if(err) return next(); 
                    console.log(path+"/"+subject+"/dwi/dwi.nii.gz");
                    datasets.push({
                        "user_id" : "1",
                        "project" : project,
                        "datatype" : datatype_dwi,
                        "desc" : "",
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ ],
                        "datatype_tags" : [ ],
                        "status" : "stored",
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/dwi/sub-"+subject+"_dwi.nii.gz", local: "dwi.nii.gz"},
                                {s3: s3base+"/dwi/sub-"+subject+"_dwi.bval", local: "dwi.bvals"},
                                {s3: s3base+"/dwi/sub-"+subject+"_dwi.bvec", local: "dwi.bvecs"},
                            ] 
                        },
                        "removed": false,
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },

            next=>{
                console.log("...func");

                let funcpath = path+"/"+subject+"/func";
                fs.readdir(funcpath, (err, tasks)=>{
                    if(err) return next();
                    async.eachSeries(tasks, (task, next_task)=>{

                        //find time from bold.nii.gz
                        fs.stat(funcpath+"/"+task+"/bold.nii.gz", (err, stats)=>{
                            if(err) return next_task(); 
                            console.log(funcpath+"/"+task+"/bold.nii.gz");

                            //find all files 
                            fs.readdir(funcpath+"/"+task, (err, _files)=>{
                                if(err) return next_task(); 
                                let files = _files.map(file=>{
                                    return {
                                        s3: s3base+"/func/sub-"+subject+"_task-"+task+"_"+file,
                                        local: file
                                    }
                                });
                                datasets.push({
                                    "user_id" : "1",
                                    "project" : project,
                                    "datatype" : datatype_func,
                                    "desc" : "",
                                    "meta": {
                                        "subject": subject,
                                        "task": task,
                                    },
                                    "tags" : [ task ],
                                    "datatype_tags" : [ task ], //should normalize?
                                    "status" : "stored",
                                    "storage" : "openneuro",
                                    "storage_config" : {
                                       files
                                    },
                                    "removed": false,
                                    "create_date": stats.ctime,
                                });
                                next_task();
                            })
                        });

                    }, next);
                });
            },

        ], next_subject);
    }, err=>{
        console.log("inserting...........");
        //console.dir(datasets);
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});
