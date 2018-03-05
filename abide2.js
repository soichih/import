#!/usr/bin/env node

const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');
const mongo = require('mongodb');
const upsert = require('./upsert');
const os = require("os");

let datasets = [];

if(os.hostname() == "brainlife.io") {
    var project = mongo.ObjectId(""); //prod
} else {
    var project = mongo.ObjectId("5a9b626489426e42cf725795"); //abide2 project
}

rootdir="/mnt/fcp-indi/data/Projects/ABIDE2/RawData";
fs.readdir(rootdir, (err, institutions)=>{
    if(err) throw err;
    async.eachSeries(institutions, (institution, next_institution)=>{
        console.log("reading", institution);

        //let's skip institutions that has odd acquisition ids (acq_pedj, etc..)
        //these institutions doesn't have dwi.. so it's not very useful for us.
        if(institution == "ABIDEII-KKI_1") return next_institution();
        if(institution == "ABIDEII-ONRC_2") return next_institution();

        let t1wjson = require(rootdir+"/"+institution+"/T1w.json");
        let participants = null;
        try {
            participants = fs.readFileSync(rootdir+"/"+institution+"/participants.tsv");
        } catch(err) {
            console.log("no participants info");
        }
        let boldjson = require(rootdir+"/"+institution+"/task-rest_bold.json");
        //console.dir(boldjson);

        fs.readdir(rootdir+"/"+institution, (err, subjects)=>{
            if(err) throw err;
            async.eachSeries(subjects, (subject, next_subject)=>{
                if(!subject.startsWith("sub-")) return next_subject();
                console.log("reading", subject);
                fs.readdir(rootdir+"/"+institution+"/"+subject, (err, sessions)=>{
                    if(err) throw err;
                    async.eachSeries(sessions, (session, next_session)=>{
                        console.log("reading", session);
                        fs.readdir(rootdir+"/"+institution+"/"+subject+"/"+session, (err, modes)=>{
                            if(err) throw err;
                            async.eachSeries(modes, (mode, next_mode)=>{
                                let s3 = "data/Projects/ABIDE2/RawData/"+institution+"/"+subject+"/"+session+"/"+mode;
                                switch(mode) {
                                case "anat":
                                    datasets.push({
                                        datatype: mongo.ObjectId("58c33bcee13a50849b25879a"), //t1
                                        meta: Object.assign({ institution, subject: subject.substring(4), session: session.substring(4) }, t1wjson),
                                        tags: [ institution, session ],
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
                                    datasets.push({
                                        datatype: mongo.ObjectId("58c33c5fe13a50849b25879b"), //dwi
                                        meta: { institution, subject: subject.substring(4), session: session.substring(4) },
                                        tags: [ institution, session ],
                                        storage: "nki",
                                        storage_config: {
                                            files: [
                                                { local: "dwi.nii.gz", s3: s3+"/"+subject+"_"+session+"_run-1_dwi.nii.gz" },
                                                { local: "dwi.bvecs", s3: s3+"/"+subject+"_"+session+"_run-1_dwi.bvec" },
                                                { local: "dwi.bvals", s3: s3+"/"+subject+"_"+session+"_run-1_dwi.bval" },
                                            ]
                                        }
                                    });
                                    next_mode();
                                    break;
                                case "func":
                                    fs.readdir(rootdir+"/"+institution+"/"+subject+"/"+session+"/func", (err, files)=>{
                                        if(err) throw err;
                                        files.forEach(file=>{
                                            //runs ..  sub-29608[0] _ ses-1[1] _ task-rest[2] _ run-1[3] _ bold.nii.gz[4]
                                            var parts = file.split("_");
                                            var task = parts[2]; 
                                            var run = parts[3]; 
                                            datasets.push({
                                                datatype: mongo.ObjectId("59b685a08e5d38b0b331ddc5"), //func
                                                datatype_tags: [ "rest" ], 
                                                meta: Object.assign({ institution, subject: subject.substring(4), session: session.substring(4), run }, boldjson),
                                                tags: [ institution, session, run ],
                                                storage : "nki",
                                                storage_config: {
                                                    files: [
                                                        { local: "bold.nii.gz", s3: s3+"/"+subject+"_"+session+"_"+task+"_"+run+"_bold.nii.gz" },
                                                    ],
                                                }
                                            });
                                        });
                                        next_mode();
                                    });
                                    break;
                                default: 
                                    console.log("unknown mode:"+mode);
                                    next_mode();
                                }
                            }, err=>{
                                next_session();
                            });
                        });
                    }, err=>{
                        next_subject();
                    });
                });
            }, err=>{
                next_institution();
            });
        });
    }, err=>{
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});

