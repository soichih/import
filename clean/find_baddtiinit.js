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

        function find_bad_dtiinit(cb) {
            col_tasks.find({"config.rotateBvecsWithRx": "0"}).toArray(cb);
        }

        function find_datasets_from_tasks(tasks, cb) {
            var datasets = [];
            async.forEach(tasks, (task, next_task)=>{
                col_datasets.findOne({"prov.task_id": task._id.toString()}, function(err, rec) {
                    if(err) return next_task(err);
                    if(rec) datasets.push(rec);
                    next_task();
                });
            }, err=>{ cb(err, datasets); });
        }

        function find_tasks_uses_datasets(datasets, cb) {
            var tasks = [];
            async.forEach(datasets, (dataset, next_dataset)=>{
                col_tasks.findOne({"config._inputs.dataset_id": dataset._id.toString()}, function(err, rec) {
                    if(err) return next_task(err);
                    if(rec) tasks.push(rec);
                    next_dataset();
                });
            }, err=>{ cb(err, tasks); })
        }

        /*
        function find_datasets_uses_datasets(datasets, cb) {
            var tasks = [];
            async.forEach(datasets, (dataset, next_dataset)=>{
                col_datasets.findOne({"config._inputs.dataset_id": dataset._id.toString()}, function(err, rec) {
                    if(err) return next_task(err);
                    if(rec) tasks.push(rec);
                    next_dataset();
                });
            }, err=>{ cb(err, tasks); })
        }
        */

        console.log("finding bad dtiitni");
        find_bad_dtiinit((err, tasks)=>{
            if(err) throw err;
            console.log(tasks.length, "bad tasks");
            console.log("finding bad datasets");
            find_datasets_from_tasks(tasks, (err, bad_datasets)=>{
                if(err) throw err;
                console.log(bad_datasets.length, "bad datasets");

                find_tasks_uses_datasets(bad_datasets, (err, tasks)=>{
                    if(err) throw err;
                    console.log(tasks.length, "bad child tasks");

                    tasks.forEach(task=>console.log(task._id));
                    close();
                });
                /*
                find_datasets_uses_dataset(bad_datasets, (err, datasets)=>{
                    if(err) throw err;
                    console.log(datasets.length, "bad child datasets");
                    console.dir(datasets);
                    close();
                });
                */
            });
        });  
    });
});


