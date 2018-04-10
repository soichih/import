#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

const upsert = require('./upsert');
 
//datatype IDs are the same on brain-life.org and dev1
const datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
const datatype_t2 = mongo.ObjectId("594c0325fa1d2e5a1f0beda5");
const datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
const datatype_func = mongo.ObjectId("59b685a08e5d38b0b331ddc5"); 

if(os.hostname() == "brainlife.io") {
    var project = mongo.ObjectId("5a0d02f0326f36007cb5a54f"); //production
} else if(os.hostname() == "test.brainlife.io") {
    var project = mongo.ObjectId(""); 
} else {
    var project = mongo.ObjectId("5acbf95ffd018278d693215b"); //dev 000031
    //var project = mongo.ObjectId("5ac94ebbfd018278d6932159"); //dev 000009
    //var project = mongo.ObjectId("5a0cf2e65f92bc5b569367c0"); //dev 000030
}

//TODO
//load following datasets that has dwi data
//ds0000051
//ds0000107
//ds0000114
//ds0000117
//ds0000221
//ds0000201
//ds0000244

//const s3_root = "ds000009/ds000009_R2.0.3/uncompressed";
//const path = '/mnt/openneuro/ds000009/ds000009_R2.0.3/uncompressed';
//const s3_root = "ds000030/ds000030_R1.0.5/uncompressed";
//const path = '/mnt/openneuro/ds000030/ds000030_R1.0.5/uncompressed';
const s3_root = "ds000201/ds000201_R1.0.5/uncompressed";
const path = '/mnt/openneuro/ds000201/ds000201_R1.0.5/uncompressed';

//load t1w/dwi
let t1wjson = {}; 
try {
    if(fs.statSync(path+"/T1w.json")) t1wjson = require(path+"/T1w.json");
} catch(err) {
    console.log("no t1w.json");
}
let t2wjson = {}; 
try {
    if(fs.statSync(path+"/T2w.json")) t2wjson = require(path+"/T2w.json");
} catch(err) {
    console.log("no t2w.json");
}
let dwijson = {}; 
try {
    if(fs.statSync(path+"/dwi.json")) dwijson = require(path+"/dwi.json");
} catch(err) {
    console.log("no dwi.json");
}

//load all func json
const bold_jsons = {};
const files = fs.readdirSync(path);
files.forEach(file=>{
    if(~file.indexOf("_bold.json")) {
        //task-balloonanalogrisktask_bold.json
        let tokens = file.split("_");
        let task = tokens[0].split("-")[1];
        bold_jsons[task] = require(path+"/"+file);
    }
});

let datasets = [];

function handle_modality(subject_path, subject, session, cb) {
    console.log("subject:", subject, "session:", session);
    let s3base = s3_root+"/"+subject;
    if(session) s3base += "/"+session;

    //scan for modality
    fs.readdir(subject_path, (err, modes)=>{
        if(err) return cb(err);
        async.eachSeries(modes, (mode, next_mode)=>{

            if(!~["dwi", "func", "anat"].indexOf(mode)) return next_mode();

            //scan for all files
            fs.readdir(subject_path+"/"+mode, (err, files)=>{
                if(err) return cb(err);

                /*
                //look for runs
                let runs = [null]; //include no-run
                files.forEach(file=>{
                    let tokens = file.split("_");
                    let file_comp = [];
                    tokens.forEach(token=>{
                        let sub_token = token.split("-")  
                        if(sub_token.length == 2) file_comp[sub_token[0]] = sub_token[1];
                    });
                    if(file_comp.run && !~runs.indexOf(file_comp.run)) runs.push(file_comp.run);
                });
                */

                switch(mode) {
                case "anat":
                    //load files
                    async.eachSeries(files, (file, next_file)=>{
                        //parse filename
                        let tokens = file.split("_");
                        let file_comp = [];
                        tokens.forEach(token=>{
                            let sub_token = token.split("-")  
                            if(sub_token.length == 2) file_comp[sub_token[0]] = sub_token[1];
                        });
                        let filebase = subject;
                        let tags = [];
                        if(session) {
                            filebase += "_"+session;
                            tags.push(session);
                        }
                        if(file_comp.run) {
                            filebase += "_run-"+file_comp.run;
                            tags.push("run-"+file_comp.run);
                        }

                        if(~file.indexOf("_T1w.nii.gz")) {
                            console.log(filebase, "t1");
                            let t1wjson_local = {};
                            try {
                                let fullpath = subject_path+"/anat/"+filebase+"_T1w.json";
                                if(fs.statSync(fullpath)) t1wjson_local = require(fullpath);
                            } catch(err) {
                                console.log("no local t1w.json");
                            }

                            datasets.push({
                                "datatype" : datatype_t1,
                                "desc" : t1wjson_local.SeriesDescription, 
                                "meta": Object.assign({
                                    "subject": subject.substring(4),
                                    "session": session.substring(4),
                                    "run": file_comp.run,
                                }, t1wjson, t1wjson_local),
                                tags,
                                //"datatype_tags" : [ "defaced" ],
                                "storage" : "openneuro",
                                "storage_config" : {
                                    files: [
                                        {s3: s3base+"/anat/"+filebase+"_T1w.nii.gz", local: "t1.nii.gz"},
                                    ] 
                                },
                                "create_date": fs.statSync(subject_path+"/anat/"+file).ctime,
                            });
                        }

                        if(~file.indexOf("_T2w.nii.gz")) {
                            console.log(filebase, "t2");
                            let t2wjson_local = {};
                            try {
                                let fullpath = subject_path+"/anat/"+filebase+"_T2w.json";
                                if(fs.statSync(fullpath)) t2wjson_local = require(fullpath);
                            } catch(err) {
                                console.log("no local t2w.json");
                            }

                            datasets.push({
                                "datatype" : datatype_t2,
                                "desc" : t2wjson_local.SeriesDescription, 
                                "meta": Object.assign({
                                    "subject": subject.substring(4),
                                    "session": session.substring(4),
                                    "run": file_comp.run,
                                }, t2wjson, t2wjson_local),
                                tags,
                                //"datatype_tags" : [ "defaced" ],
                                "storage" : "openneuro",
                                "storage_config" : {
                                    files: [
                                        {s3: s3base+"/anat/"+filebase+"_T2w.nii.gz", local: "t2.nii.gz"},
                                    ] 
                                },
                                //"create_date": stats.ctime,
                                "create_date": fs.statSync(subject_path+"/anat/"+file).ctime,
                            });
                        }
                        next_file();

                    }, next_mode);
                    break;

                case "dwi":
                    //load files
                    async.eachSeries(files, (file, next_file)=>{
                        //parse filename
                        let tokens = file.split("_");
                        let file_comp = [];
                        tokens.forEach(token=>{
                            let sub_token = token.split("-")  
                            if(sub_token.length == 2) file_comp[sub_token[0]] = sub_token[1];
                        });
                        let tags = [];
                        let filebase = subject;
                        if(session) {
                            filebase += "_"+session;
                            tags.push(session);
                        }
                        if(file_comp.run) {
                            filebase += "_run-"+file_comp.run;
                            tags.push("run-"+file_comp.run);
                        }
                        if(~file.indexOf("_dwi.nii.gz")) {
                            console.log(filebase);
                            let dwijson_local = require(subject_path+"/dwi/"+filebase+"_dwi.json"); //should always have this?
                            datasets.push({
                                "datatype" : datatype_dwi,
                                "desc" : dwijson_local.SeriesDescription, 
                                "meta": Object.assign({
                                    "subject": subject.substring(4),
                                    "session": session.substring(4),
                                    "run": file_comp.run,
                                }, dwijson, dwijson_local),
                                tags,
                                //"datatype_tags" : [ ],
                                "storage" : "openneuro",
                                "storage_config" : {
                                    files: [
                                        {s3: s3base+"/dwi/"+filebase+"_dwi.nii.gz", local: "dwi.nii.gz"},
                                        {s3: s3base+"/dwi/"+filebase+"_dwi.bval", local: "dwi.bvals"},
                                        {s3: s3base+"/dwi/"+filebase+"_dwi.bvec", local: "dwi.bvecs"},
                                    ] 
                                },
                                //"create_date": stats.ctime,
                                "create_date": fs.statSync(subject_path+"/dwi/"+file).ctime,
                            });
                        }
                        next_file();
                    }, next_mode);
                    break;

                case "func":
                    //load files
                    async.eachSeries(files, (file, next_file)=>{
                        //parse filename
                        let tokens = file.split("_");
                        let file_comp = [];
                        tokens.forEach(token=>{
                            let sub_token = token.split("-")  
                            if(sub_token.length == 2) file_comp[sub_token[0]] = sub_token[1];
                        });
                        let filebase = subject;
                        let tags = [ file_comp.task ];
                        if(session) {
                            filebase += "_"+session;
                            tags.push(session);
                        }
                        filebase +="_task-"+file_comp.task;
                        if(file_comp.run) {
                            filebase += "_run-"+file_comp.run;
                            tags.push("run-"+file_comp.run);
                        }

                        if(~file.indexOf("_bold.nii.gz")) {
                            console.log(filebase);
                            
                            //load bold.json
                            let json_local = require(subject_path+"/func/"+filebase+"_bold.json"); //should always have this?
                            let files = [
                                {s3: s3base+"/func/"+filebase+"_bold.nii.gz", local: "bold.nii.gz"},
                            ];

                            //events.tsv is optional (rest doesn't have it)
                            try {
                                if(fs.statSync(subject_path+"/func/"+filebase+"_events.tsv")) {
                                    files.push({s3: s3base+"/func/"+filebase+"_events.tsv", local: "events.tsv"});
                                }
                            } catch(err) {
                                console.log("no events.tsv");
                            }
                            
                            //sbref.nii.gz
                            try {
                                if(fs.statSync(subject_path+"/func/"+filebase+"_sbref.nii.gz")) {
                                    files.push({s3: s3base+"/func/"+filebase+"_sbref.nii.gz", local: "sbref.nii.gz"});
                                }
                            } catch(err) {
                                console.log("no sbref.nii.gz");
                            }

                            //now create dataset records
                            datasets.push({
                                "datatype" : datatype_func,
                                "desc" : json_local.SeriesDescription, 
                                "meta": Object.assign({
                                    "subject": subject.substring(4),
                                    "session": session.substring(4),
                                    "task": file_comp.task,
                                    "run": file_comp.run,
                                }, bold_jsons[file_comp.task], json_local),
                                tags,
                                "datatype_tags" : [ file_comp.task ], //should normalize?
                                "storage" : "openneuro",
                                "storage_config" : {
                                    files,
                                },
                                "create_date": fs.statSync(subject_path+"/func/"+file).ctime,
                                //"create_date": stats.ctime,
                            });
                        }
                        next_file();
                    }, next_mode);
                    break;
                default:
                    console.log("unknown mode", mode);
                    next_mode();
                }
            });
        }, cb);
    });
}

fs.readdir(path, function(err, subjects) {
    if(err) throw err;
    console.log("number of subjects", subjects.length);
    async.eachSeries(subjects, (subject, next_subject)=>{
        if(subject.indexOf("sub-") !== 0) return next_subject();
        console.log(subject);
        
        //handle sessions if there are any
        fs.readdir(path+"/"+subject, (err, files)=>{
            if(err) return next_subject(err);
            async.eachSeries(files, (file, next_file)=>{
                if(file.indexOf("ses-") === 0) {
                    let session = file;
                    handle_modality(path+"/"+subject+"/"+session, subject, session, next_file);
                } else next_file();
            }, err=>{
                //handle non session case
                handle_modality(path+"/"+subject, subject, null, next_subject);
            });
        });
    }, err=>{
        if(err) throw err;
        console.log("inserting...........");

        //dump few things
        let count = 0;
        datasets.forEach(dataset=>{
            count++;
            if(count > 20) return;
            console.log(JSON.stringify(dataset, null, 4));

        });
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});
