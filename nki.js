#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

const upsert = require('./upsert');
 
//datatype IDs are the same on brain-life.org and dev1
var datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
var datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
var datatype_func = mongo.ObjectId("59b685a08e5d38b0b331ddc5"); 
//var datatype_freesurfer = mongo.ObjectId("58cb22c8e13a50849b25882e"); 

if(os.hostname() == "brain-life.org") {
    var project = mongo.ObjectId("59a57af4b5e93a0023001416"); //production
} else {
    var project = mongo.ObjectId("59a4d5a39823b1266ba14e13"); //dev
}

var s3_base = "data/Projects/RocklandSample/RawDataBIDS";

var path = '/link/nki';
fs.readdir(path, function(err, subjects) {
    if(err) throw err;

    var datasets = [];

    console.log("number of subjects", subjects.length);
    async.eachSeries(subjects, (subject, next_subject)=>{
        //loading sessions
        fs.readdir(path+"/"+subject, (err, sessions)=>{
            async.eachSeries(sessions, (session, next_session)=>{

                let base = s3_base+"/sub-"+subject+"/ses-"+session;

                //handle each data types
                async.series([

                    next=>{
                        fs.stat(path+"/"+subject+"/"+session+"/anat/t1.nii.gz", (err, stats)=>{
                            if(err) return next(); //no t1 then skip
                            console.log(path+"/"+subject+"/"+session+"/anat/t1.nii.gz");
                            datasets.push({
                                "user_id" : "1",
                                "project" : project,
                                "datatype" : datatype_t1,
                                "desc" : session,
                                "meta": {
                                    "subject": subject,
                                    "session": session,
                                },
                                "tags" : [ session ],
                                "datatype_tags" : [ ],
                                "status" : "stored",
                                "storage" : "nki",
                                "storage_config" : {
                                    /*
                                    "subject": subject,
                                    "session": session,
                                    */
                                    files: [
                                        {s3: base+"/anat/sub-"+subject+"_ses-"+session+"_T1w.nii.gz", local: "t1.nii.gz"},
                                    ] 
                                },
                                "removed": false,
                                "create_date": stats.ctime,
                            });

                            next();
                        });
                    },
                    
                    next=>{
                        fs.stat(path+"/"+subject+"/"+session+"/dwi/dwi.nii.gz", (err, stats)=>{
                            if(err) return next(); 
                            console.log(path+"/"+subject+"/"+session+"/dwi/dwi.nii.gz");
                            datasets.push({
                                "user_id" : "1",
                                "project" : project,
                                "datatype" : datatype_dwi,
                                "desc" : session,
                                "meta": {
                                    "subject": subject,
                                    "session": session,
                                },
                                "tags" : [ session ],
                                "datatype_tags" : [ ],
                                "status" : "stored",
                                "storage" : "nki",
                                "storage_config" : {
                                    /*
                                    "subject": subject,
                                    "session": session,
                                    */
                                    files: [
                                        {s3: base+"/dwi/sub-"+subject+"_ses-"+session+"_dwi.nii.gz", local: "dwi.nii.gz"},
                                        {s3: base+"/dwi/sub-"+subject+"_ses-"+session+"_dwi.bval", local: "dwi.bvals"},
                                        {s3: base+"/dwi/sub-"+subject+"_ses-"+session+"_dwi.bvec", local: "dwi.bvecs"},
                                    ] 
                                },
                                "removed": false,
                                "create_date": stats.ctime,
                            });

                            next();
                        });
                    },

                    next=>{
                        //find tasks
                        let funcpath = path+"/"+subject+"/"+session+"/func";
                        fs.readdir(funcpath, (err, tasks)=>{
                            if(err) return next();
                            async.eachSeries(tasks, (task, next_task)=>{

                                //find acquisitions
                                fs.readdir(funcpath+"/"+task, (err, acqs)=>{
                                    if(err) return next_task();
                                    async.eachSeries(acqs, (acq, next_acq)=>{

                                        //find time from bold.nii.gz
                                        fs.stat(funcpath+"/"+task+"/"+acq+"/bold.nii.gz", (err, stats)=>{
                                            if(err) return next_acq(); 

                                            //find all files 
                                            fs.readdir(funcpath+"/"+task+"/"+acq, (err, _files)=>{
                                                if(err) return next_acq(); 
                                                //bold.nii.gz
                                                //events.tsv (optional)
                                                //sbref.nii.gz (optional)
                                                //physio.tsv.gz (optional)
                                                //physio.json (optional)
                                                let files = _files.map(file=>{
                                                    return {
                                                        s3: base+"/func/sub-"+subject+"_ses-"+session+"_task-"+task+"_acq-"+acq+"_"+file,
                                                        local: file
                                                    }
                                                });
                                                console.dir(files);
                                                
                                                datasets.push({
                                                    "user_id" : "1",
                                                    "project" : project,
                                                    "datatype" : datatype_func,
                                                    "desc" : "session:"+session+" task:"+task+" acq:"+acq,
                                                    "meta": {
                                                        "subject": subject,
                                                        "session": session,
                                                        "task": task,
                                                        "acq": acq,
                                                    },
                                                    "tags" : [ session, task, acq ],
                                                    "datatype_tags" : [ task ], //should normalize?
                                                    "status" : "stored",
                                                    "storage" : "nki",
                                                    "storage_config" : {
                                                        /*
                                                        "subject": subject,
                                                        "session": session,
                                                        */
                                                        files
                                                    },
                                                    "removed": false,
                                                    "create_date": stats.ctime,
                                                });
                                                next_acq();
                                            });
                                        });
                                    }, next_task);
                                });
                            }, next);
                        });
                    },
                ], next_session);
            }, next_subject);
        });
    }, err=>{
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});
