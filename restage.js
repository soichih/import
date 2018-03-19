#!/usr/bin/env node

const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
const request = require('request');
const meter = require('stream-meter'); 
const pkgcloud = require('pkgcloud'); 

const project = mongo.ObjectId("592dcc5b0188fd1eecf7b4ec");

//jwt used to download all datasets
const jwt = fs.readFileSync("user.jwt");

const apibase = "https://dev1.soichi.us/api/warehouse";
//const apibase = "http://localhost:12501";

//jetstream destination
const js_storage = pkgcloud.storage.createClient(require('/home/hayashis/git/warehouse/api/config/jetstream.js'));

//dataset.storage_config = { contname, filename };
console.log("making sure container exists:", project.toString());
js_storage.createContainer({
    name: project.toString(),
    metadata: {
        //TODO..project_name?
    },
}, (err, container)=> {
    if(err) throw err;
    
    //to see uploaded datasets..
    //https://jblb.jetstream-cloud.org/project/containers/container/592dcc5b0188fd1eecf7b4ec
    //
    //console.dir(container);
    mongo.MongoClient.connect("mongodb://localhost:27017/warehouse", function(err, db) {
        if(err) throw err;
        console.log("connected to mongo");

        //first load all datasets 
        let new_datasets = [];
        let col = db.collection('datasets');
        col.find({project, removed: false, storage: "dcwan/hcp"}).toArray(function(err, datasets) {
            if(err) throw err;
            async.eachSeries(datasets, (dataset, next_dataset)=>{
                console.log(JSON.stringify(dataset, null, 4));

                //stream dataset to jetstream
                let url = apibase+"/dataset/download/"+dataset._id+"?at="+jwt;
                //let write = fs.createWriteStream("test.tar");

                let m = meter();
                let tmp = fs.createWriteStream('dataset.tar');
                console.log("downloading");
                request(url)
                .on('response', res=>{
                    if(res.statusCode != 200) next_dataset("code"+res.statusCode);
                })
                .on('error', next_dataset)
                .pipe(m).pipe(tmp);
                tmp.on('finish', ()=>{
                    console.log("stream to tmp finished", m.bytes, "now sending to js");
                    if(m.bytes == 0) {
                        console.log("0-byte dataset.. must be invalid.. removing this dataset");
                        dataset.removed = true;
                        col.updateOne({_id: dataset._id}, dataset, next_dataset);
                    } else {
                        let remote = dataset._id.toString()+".tar";
                        let write = js_storage.upload({container, remote});
                        let tmp_read = fs.createReadStream('dataset.tar');
                        tmp_read.pipe(write);
                        write.on('error', err=>{
                            console.log("writing to js failed");
                            next_dataset(err);
                        });
                        write.on('finish', err=>{
                            dataset.storage = "jetstream";
                            dataset.size = m.bytes;
                            dataset.storage_config = {
                                contname: project.toString(),
                                filename: remote,
                            };
                            console.log("done sending to jw.. now updating dataset to point to the js for storage", dataset.size, dataset.storage_config);
                            col.updateOne({_id: dataset._id}, dataset, next_dataset);
                        });
                    }
                });
            }, err=>{
                if(err) {
                    console.dir(err);
                    throw err;
                }
            });
        });
    });
});


