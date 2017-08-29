#!/usr/bin/env node
const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
const xmlparser = require('xml-parser');
const request = require('request');
 
var url = 'mongodb://localhost:27017/warehouse';
mongo.MongoClient.connect(url, function(err, db) {
    console.log("Connected correctly to server");

    //datatype IDs are the same on brain-life.org and dev1
    var datatype_t1 = mongo.ObjectId("58c33bcee13a50849b25879a");
    var datatype_dwi = mongo.ObjectId("58c33c5fe13a50849b25879b"); 
    //var datatype_freesurfer = mongo.ObjectId("58cb22c8e13a50849b25882e"); 

    if(os.hostname() == "brain-life.org") {
        var project = mongo.ObjectId(""); //production
    } else {
        var project = mongo.ObjectId("59a4d5a39823b1266ba14e13"); //dev
    }

    var urlbase = "http://fcp-indi.s3.amazonaws.com/";
    //var keyurl = urlbase+"?prefix=data/Projects/ABIDE2/RawData/ABIDEII-BNI_1&max-keys=5000";
    var keyurl = urlbase+"?prefix=data/Projects/HBNSSI/RawData&max-keys=50000";

    console.log(keyurl);
    request(keyurl, (err, res, body)=> {
        if(err) throw err;

        //parse xml
        var xml = xmlparser(body);
        var subjects = {};
        xml.root.children.forEach(node=>{
            if(node.name == "Contents") {
                var key = null;
                var date = null;
                node.children.forEach(elem=>{
                    if(elem.name == "Key") key = elem.content;
                    if(elem.name == "LastModified") date = new Date(elem.content);
                });
                var tokens = key.split("/");
                tokens.splice(0,4); //remove first 5 elements
                console.dir(tokens);
                var subject = tokens.shift().substring(4); //remove "sub-" prefix
                if(tokens[1] == "dwi" || tokens[1] == "anat") {
                    if(!subjects[subject]) subjects[subject] = [];
                    subjects[subject].push({key, scan:tokens[0], type:tokens[1], file: tokens.pop(), date});
                }
            }
        });

        //create list of datasets
        var datasets = [];
        for(var subject in subjects) {
            var files = subjects[subject];
            files.forEach(file=>{
                if(file.type == "anat") datasets.push({
                    "user_id" : "1",
                    "project" : project,
                    "datatype" : datatype_t1,
                    "desc" : file.key,
                    "meta": {
                        "subject": subject,
                    },
                    "tags" : [],
                    "datatype_tags" : [ ],
                    "storage" : "url",
                    "storage_config" : {
                        "url": urlbase+file.key,
                    },
                    "removed": false,
                    "create_date": file.date,
                });
            });
        }

        console.dir(datasets);
        console.log(datasets.length);
    }); 
});
