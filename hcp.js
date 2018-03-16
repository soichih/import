#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

const upsert = require('./upsert');
 
//datatype IDs are the same on brain-life.org and dev1
var datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
var datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
var datatype_freesurfer = mongo.ObjectId("58cb22c8e13a50849b25882e"); 

if(os.hostname() == "brainlife.io") {
    var project = mongo.ObjectId(""); //hcp project
} else {
    var project = mongo.ObjectId("5aabf7b723f8fa0027301edf"); //hcp3t
}

//mount sshfs mount dcwan

//reading directory
var path = './hcp';
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
		hcppath = subject+"/T1w/T1w_acpc_dc_restore_1.25.nii.gz";
                fs.stat(path+"/"+hcppath, (err, stats)=>{
                    console.error(err);
                    if(err) return next(); //no t1 then skip
                    console.log("has t1");
                    datasets.push({
                        "datatype" : datatype_t1,
                        "datatype_tags" : [ "acpc_aligned" ],
                        //"desc" : hcppath,
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ "hcp" ],
                        "storage" : "dcwan/hcp",
                        "storage_config" : {
                            //"subdir": subject+"/t1",
			    files: [
				{filepath: "/N/dcwan/projects/hcp/"+hcppath, local: "t1.nii.gz"}
			    ],
                        },
                    });

                    next();
                });
            },

            //dwi(3t)
            next=>{
		hcppath = subject+"/T1w/Diffusion";
                fs.stat(path+"/"+hcppath, (err, stats)=>{
                    if(err) return next(); //no dwi then skip
                    console.log("has dwi(3t)");
                    datasets.push({
                        "datatype" : datatype_dwi,
                        //"datatype_tags" : [],
                        //"desc" : "/T1w/Diffusion/data.nii.gz (with bvecs/bvals)",
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ 
                            "hcp" , "3t"
                        ],
                        "storage" : "dcwan/hcp",
                        "storage_config" : {
                            //"subdir": subject+"/dwi",
			    files: [
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/bvecs", local: "dwi.bvecs" },
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/bvals", local: "dwi.bvals" },
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/data.nii.gz", local: "dwi.nii.gz" },
			    ],
                        },
                    });
                    next();
                });
            },
            
	/*
            //dwi(7t)
            next=>{
		hcppath = subject+"/T1w/Diffusion_7T";
                fs.stat(path+"/"+hcppath, (err, stats)=>{
                    if(err) return next(); //no dwi then skip
                    console.log("has 7t data!", path+"/"+subject+"/dwi7t");
                    datasets.push({
                        "datatype" : datatype_dwi,
                        //"name" : "HCP dwi(7t) dataset",
                        //"desc" : "/T1w/Diffusion_7T/data.nii.gz (with bvecs/bvals)",
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ "hcp" , "7t" ],
                        "datatype_tags" : ["7t"],
                        "storage" : "dcwan/hcp",
                        "storage_config" : {
			    files: [
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/bvecs", local: "dwi.bvecs" },
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/bvals", local: "dwi.bvals" },
				{ filepath: "/N/dcwan/projects/hcp/"+hcppath+"/data.nii.gz", local: "dwi.nii.gz" },
			    ],
                        },
                    });
                    console.dir(datasets);
                    next();
                });
            },
	*/
            
            //freesurfer
            next=>{
		hcppath = subject+"/T1w/"+subject;
                fs.stat(path+"/"+hcppath, (err, stats)=>{
                    if(err) return next(); //no dwi then skip
                    console.log("has freesurfer");
                    datasets.push({
                        "datatype" : datatype_freesurfer,
                        //"name" : "HCP freesurfer output",
                        "desc" : "/T1w/"+subject+" (t1 aligned)",
                        "meta": {
                            "subject": subject,
                        },
                        "tags" : [ "hcp" ],
                        //"datatype_tags" : [],
                        "storage" : "dcwan/hcp",
                        "storage_config" : {
			    dirpath: "/N/dcwan/projects/hcp/"+hcppath, local: "output",
                        },
                    });
                    next();
                });
            },
        ], err=>{
            if(err) console.error(err); 
            next_subject();
        });

    }, err=> {
	//console.dir(datasets);
        upsert.upsert(project, datasets, err=>{
            console.log("all done");
        });
    });
});
