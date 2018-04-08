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
    var project = mongo.ObjectId(""); //dev
}

const s3_root = "ds000030/ds000031_R1.0.4/uncompressed/sub-01";
const path = "/mnt/openneuro/ds000030/ds000031_R1.0.4/uncompressed/sub-01";

let t1wjson = require(path+"/"++"/T1w.json");

fs.readdir(path, function(err, sessions) {
    if(err) throw err;
    let datasets = [];
    async.eachSeries(sessions, (session, next_session)=>{
        console.log("subject:", subject);
        fs.readdir(path+"/"+session, (err, modes)=>{
            if(err) throw err;
            async.eachSeries(modes, (mode, next_mode)=>{
                let s3base = s3_root+"/"+session+"/"+mode;
                switch(mode) {
                case "anat":
                    datasets.push({
                        datatype: mongo.ObjectId("58c33bcee13a50849b25879a"), //t1
                        meta: Object.assign({ subject: subject.substring(4), session: session.substring(4) }, t1wjson),
                        tags: [ session ],
                        storage: "nki",
                        storage_config: {
                            files: [
                                {
                                    local: "t1.nii.gz",
                                    s3: s3+"/"+subject+"_"+session+"_run-1_T1w.nii.gz",
                                }
                            ]
                        }
                    });
                    next_mode();
                    break;
                case "dwi":
                    break;
                case "func":
                    break;
                default:
                    console.log("unknown mode:"+mode);
                    next_mode();
                ]
            }, err=>{
                next_session();
            });
        });

            next=>{
                fs.stat(path+"/"+subject+"/"+session+"/anat/t1.nii.gz", (err, stats)=>{
                    if(err) return next(); //no t1 then skip
                    console.log(path+"/"+subject+"/anat/t1.nii.gz");
                    datasets.push({
                        "datatype" : datatype_t1,
                        "meta": {
                            "subject": subject,
                        },
                        "datatype_tags" : [ "defaced" ],
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/anat/sub-01_ses-"+session+"_T1w.nii.gz", local: "t1.nii.gz"},
                                {s3: s3base+"/anat/sub-01_ses-"+session+"_T1w.json", local: "t1.json"},
                            ] 
                        },
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },
            
            next=>{
                fs.stat(path+"/"+subject+"/dwi/dwi.nii.gz", (err, stats)=>{
                    if(err) return next(); 
                    console.log(path+"/"+subject+"/dwi/dwi.nii.gz");
                    datasets.push({
                        "datatype" : datatype_dwi,
                        "meta": {
                            "subject": subject,
                        },
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/dwi/sub-01_ses-"+session+"_dwi.nii.gz", local: "dwi.nii.gz"},
                                {s3: s3base+"/dwi/sub-01_ses-"+session+"_dwi.bval", local: "dwi.bvals"},
                                {s3: s3base+"/dwi/sub-01_ses-"+session+"_dwi.bvec", local: "dwi.bvecs"},
                                {s3: s3base+"/dwi/sub-01_ses-"+session+"_dwi.json", local: "dwi.json"},
                            ] 
                        },
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },

            next=>{
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
                                        s3: s3base+"/func/sub-01_ses-"+session+"_task-"+task+"_"+file, local: file
                                    }
                                });
                                datasets.push({
                                    "datatype" : datatype_func,
                                    "meta": {
                                        "subject": subject,
                                        "task": task,
                                    },
                                    "tags" : [ task ],
                                    "datatype_tags" : [ task ], //should normalize?
                                    "storage" : "openneuro",
                                    "storage_config" : {
                                       files
                                    },
                                    "create_date": stats.ctime,
                                });
                                next_task();
                            })
                        });

                    }, next);
                });
            },

        ], next_session);
    }, err=>{
        console.log("inserting...........");
        console.dir(datasets);
        /*
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
        */
    });
});
