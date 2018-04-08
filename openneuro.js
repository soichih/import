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
    var project = mongo.ObjectId("5a0d02f0326f36007cb5a54f"); //production
} else {
    var project = mongo.ObjectId("5ac94ebbfd018278d6932159"); //dev 000009
    //var project = mongo.ObjectId("5a0cf2e65f92bc5b569367c0"); //dev 000030
}

//TODO
//load following datasets that has dwi data
//ds0000009
//ds0000030 (ross is working on access issue)
//ds0000031
//ds0000051
//ds0000107
//ds0000114
//ds0000117
//ds0000221
//ds0000244

const s3_root = "ds000009/ds000009_R2.0.3/uncompressed";
const path = '/mnt/openneuro/ds000009/ds000009_R2.0.3/uncompressed';
//const s3_root = "ds000030/ds000030_R1.0.5/uncompressed";
//const path = '/mnt/openneuro/ds000030/ds000030_R1.0.5/uncompressed';

//load t1w/dwi
let t1wjson = {}; 
try {
    if(fs.statSync(path+"/T1w.json")) t1wjson = require(path+"/T1w.json");
} catch(err) {
    console.log("no t1w.json", err);
}
let dwijson = {}; 
try {
    if(fs.statSync(path+"/dwi.json")) dwijson = require(path+"/dwi.json");
} catch(err) {
    console.log("no dwi.json", err);
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

fs.readdir(path, function(err, subjects) {
    if(err) throw err;
    let datasets = [];
    console.log("number of subjects", subjects.length);
    async.eachSeries(subjects, (subject, next_subject)=>{
        if(!~subject.indexOf("sub-")) return next_subject();

        let s_subject = subject.substring(4);

        console.log("subject:", subject);
        let s3base = s3_root+"/"+subject;

        //handle each data types
        async.series([
            next=>{
                fs.stat(path+"/"+subject+"/anat/"+subject+"_T1w.nii.gz", (err, stats)=>{
                    if(err) return next(); //no t1 then skip
                    console.log(path+"/"+subject+"/anat/");
                    let t1wjson_local = {};
                    try {
                        let fullpath = path+"/"+subject+"/anat/"+subject+"_T1w.json";
                        if(fs.statSync(fullpath)) t1wjson_local = require(fullpath);
                    } catch(err) {
                        console.log("no local t1w.json");
                    }
                    //console.dir(stats);
                    datasets.push({
                        "datatype" : datatype_t1,
                        //"desc" : "",
                        "meta": Object.assign({}, t1wjson, t1wjson_local, {
                            "subject": s_subject,
                        }),
                        //"tags" : [ ],
                        //"datatype_tags" : [ "defaced" ],
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/anat/"+subject+"_T1w.nii.gz", local: "t1.nii.gz"},
                            ] 
                        },
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },
            
            next=>{
                fs.stat(path+"/"+subject+"/dwi/"+subject+"_dwi.nii.gz", (err, stats)=>{
                    if(err) return next(); 
                    console.log(path+"/"+subject+"/dwi");
                    let dwijson_local = require(path+"/"+subject+"/dwi/"+subject+"_dwi.json");
                    datasets.push({
                        "datatype" : datatype_dwi,
                        //"desc" : "",
                        "meta": Object.assign({}, dwijson, dwijson_local, {
                            "subject": s_subject,
                        }),
                        //"tags" : [ ],
                        //"datatype_tags" : [ ],
                        "storage" : "openneuro",
                        "storage_config" : {
                            files: [
                                {s3: s3base+"/dwi/"+subject+"_dwi.nii.gz", local: "dwi.nii.gz"},
                                {s3: s3base+"/dwi/"+subject+"_dwi.bval", local: "dwi.bvals"},
                                {s3: s3base+"/dwi/"+subject+"_dwi.bvec", local: "dwi.bvecs"},
                            ] 
                        },
                        "create_date": stats.ctime,
                    });

                    next();
                });
            },

            next=>{
                let funcpath = path+"/"+subject+"/func";
                fs.readdir(funcpath, (err, files)=>{
                    if(err) return next();
                    //func has a lot of different tasks.
                    async.eachSeries(files, (file, next_file)=>{
                        if(!~file.indexOf("_bold.nii.gz")) return next_file(); //not bold
                        console.log(funcpath+"/"+file);
                        //find time from bold.nii.gz
                        fs.stat(funcpath+"/"+file, (err, stats)=>{
                            if(err) return next_file(); 

                            //parse task file name - sub-20 _ task-emotionalregulation _ run-01 _ bold.nii.gz
                            let tokens = file.split("_");
                            let task = tokens[1].split("-")[1];
                            let run = null;
                            if(tokens.length == 4) {
                                run = tokens[2].split("-")[1];
                            }
                            //console.log(task, run);

                            //load bold.json
                            let file_prefix = file.substring(0, file.length-11);
                            let json_local = require(funcpath+"/"+file_prefix+"bold.json");
                            let files = [
                                {s3: s3base+"/func/"+file_prefix+"bold.nii.gz", local: "bold.nii.gz"},
                            ];

                            //rest doesn't have event sometimes?
                            fs.stat(funcpath+"/"+file_prefix+"events.tsv", (err, events_stats)=>{
                                if(!err) {
                                    files.push({s3: s3base+"/func/"+file_prefix+"events.tsv", local: "events.tsv"});
                                }
                                let tags = [ task ];
                                if(run) tags.push("run-"+run);
                                datasets.push({
                                    "datatype" : datatype_func,
                                    "meta": Object.assign({}, bold_jsons[task], json_local, {
                                        "subject": s_subject,
                                        "task": task,
                                        "run": run,
                                    }),
                                    tags,
                                    "datatype_tags" : [ task ], //should normalize?
                                    "storage" : "openneuro",
                                    "storage_config" : {
                                        files,
                                    },
                                    "create_date": stats.ctime,
                                });
                                next_file();
                            });
                        });

                    }, next);
                });
            },
        ], next_subject);
    }, err=>{
        console.log("inserting...........");
        datasets.forEach(dataset=>{
            console.log(JSON.stringify(dataset, null, 4));
        });
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});
