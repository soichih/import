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

        let subjects =[ 
			'200513',
			'209834',
			'214221',
			'268850',
			'366446',
			'378756',
			'562446',
			'688569',
			'727654',
			'815247',
			'820745',
			'835657',
			'878877',
			'880157',
			'891667',
			'910443',
			'933253',
			'952863',
			'969476',
			'972566',
			'983773',
			'987983' 
		];

        let datatypes = [
            new mongo.ObjectId("5907d922436ee50ffde9c549"), //ensemble tracking
            new mongo.ObjectId("58d15eaee13a50849b258844"), //life
            new mongo.ObjectId("58f10a90436ee50ffd9063c5"), //afq
            new mongo.ObjectId("599f305ad1f46fec1759f363"), //fiber tracts
            new mongo.ObjectId("592dded1436ee50ffd88f5d0"), //binary tract mask
            new mongo.ObjectId("59307a08436ee50ffd973278"), //3d tract
            new mongo.ObjectId("59399b95436ee50ffdc08381"), //laplace bectrami
        ];

        /*
        col_datasets.find({"project": new mongo.ObjectId("59887dc31cca99002db5e909"), "meta.subject": {$in: subjects}, "datatype": {$in: datatypes}}).toArray((err, datasets)=>{
            if(err) throw err;
            datasets.forEach(dataset=>{
                console.log("datasets", dataset);
            });
            console.log("datasets", datasets.length);
        });  
        */
        col_datasets.update({"project": new mongo.ObjectId("59887dc31cca99002db5e909"), "meta.subject": {$in: subjects}, "datatype": {$in: datatypes}}, {$set: {removed: true}}, {multi: true}, (err, res)=>{
            if(err) throw err;
            console.dir(res);
        });
    });
});


