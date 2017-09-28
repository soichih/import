#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

const upsert = require('./upsert');
 
//datatype IDs are the same on brain-life.org and dev1
var datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
var datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
//var datatype_freesurfer = mongo.ObjectId("58cb22c8e13a50849b25882e"); 

if(os.hostname() == "brain-life.org") {
    var project = mongo.ObjectId("59a57af4b5e93a0023001416"); //production
} else {
    var project = mongo.ObjectId("59a4d5a39823b1266ba14e13"); //dev
}

var path = '/link/nki';
fs.readdir(path, function(err, subjects) {
    if(err) throw err;

    var datasets = [];

    console.log("number of subjects", subjects.length);
    async.eachSeries(subjects, (subject, next_subject)=>{
        //loading sessions
        fs.readdir(path+"/"+subject, (err, sessions)=>{
            async.eachSeries(sessions, (session, next_session)=>{

                //handle each data types
                async.series([

                    next=>{
                        fs.stat(path+"/"+subject+"/"+session+"/anat/t1.nii.gz", (err, stats)=>{
                            if(err) return next(); //no t1 then skip
                            console.dir(stats);
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
                                    "subject": subject,
                                    "session": session,
                                    "subdir": "anat",
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
                                    "subject": subject,
                                    "session": session,
                                    "subdir": "dwi",
                                },
                                "removed": false,
                                "create_date": stats.ctime,
                            });

                            next();
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
