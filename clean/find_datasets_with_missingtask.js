#!/usr/bin/env node

const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');

console.log("connecting to dbs");
mongo.MongoClient.connect("mongodb://localhost:27017/brainlife", function(err, wfdb) {
    if(err) throw err;

    mongo.MongoClient.connect("mongodb://localhost:27017/warehouse", function(err, warehousedb) {
        if(err) throw err;

        var col_tasks = wfdb.collection('tasks');
        var col_datasets = warehousedb.collection('datasets');

        function close() {
            warehousedb.close();
            wfdb.close();
        }

        function find_bad_task(inputs, cb) {
            var tasks = [];
            async.forEach(inputs, (input, next_input)=>{
                col_tasks.findOne({"_id": new mongo.ObjectId(input.task_id), "config.rotateBvecsWithCanXform": "0"}, function(err, rec) {
                    if(err) return next_input(err);
                    if(rec) tasks.push(rec);
                    next_input(); 
                });
            }, err=>{
                cb(null, tasks);
            });
        }

        var bad_subjects = [];
        //find all datasets on lindsey's project
        col_datasets.find({"project": new mongo.ObjectId("59887dc31cca99002db5e909"), "removed": false}).toArray((err, datasets)=>{
            if(err) throw err;
            console.log(datasets.length, "datasets");

            async.eachSeries(datasets, (dataset, next_dataset)=>{
                //find tasks that produced them
                col_tasks.findOne({"_id": new mongo.ObjectId(dataset.prov.task_id)}, function(err, task) {
                    if(err) return next_dataset(err);
                    if(!task) {
                        console.log("dataset", dataset._id.toString(), "missing task", dataset.prov.task_id);
                        next_dataset(); 
                    }

                    //find dtiinit task for this task
                    var dtiinit = task.config._inputs.find(input=>input.datatype=="58cb234be13a50849b25882f");
                    if(!dtiinit) {
                        return next_dataset();
                    }

                    //check for config
                    col_tasks.findOne({"_id": new mongo.ObjectId(dtiinit.task_id)}, function(err, rec) {
                        if(err) return next_dataset(err);
                        if(!rec) return next_dataset("missing dtiinit task");
                        //if(rec.config.rotateBvecsWithCanXform && rec.config.rotateBvecsWithCanXform) {}
                        if(rec.finish_date < new Date("2017-09-16")) return next_dataset(); //it was fine before this date
                        if(rec.config.rotateBvecsWithCanXform === "0") {
                            console.log("bad dataset", dataset._id, dataset.desc, dataset.meta.subject, " / dtiinit input task", dtiinit.task_id);
                            //console.dir(rec.config);
                            if(!~bad_subjects.indexOf(dataset.meta.subject)) bad_subjects.push(dataset.meta.subject);
                        }
                        next_dataset();
                    });

                });
            }, err=>{ 
                if(err) throw err 
                console.dir(bad_subjects.sort());
                close();
            });
        });  
    });
});


