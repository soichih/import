#!/usr/bin/env node

const fs = require('fs');
const mongo = require('mongodb');
const async = require('async');
const os = require('os');
 
var url = 'mongodb://localhost:27017/warehouse';

mongo.MongoClient.connect(url, function(err, db) {
    if(err) throw err;
    console.log("connected to mongo");

    //let project = new mongo.ObjectId("592dcc5b0188fd1eecf7b4ec"); //hcp-dev
    
    //let project = new mongo.ObjectId("5941a225f876b000210c11e5"); //hcp3t-prod
    let project = new mongo.ObjectId("59a09bbab47c0c0027ad7046"); //hcp7t-prod
    //let project = new mongo.ObjectId("59dbbd66e50f4d0045ade003"); //hcp3t(reteset)-prod

    //qc_a
    //var subjects = "105620 110613 111312 112112 114924 122418 122620 124422 134627 134829 139637 140117 145127 146836 147737 148840 150019 156435 163432 166438 168139 177140 178849 180836 181131 190132 195849 199655 200210 201515 224022 270332 360030 433839 461743 518746 522434 552544 628248 656657 709551 734045 767464 943862 958976 970764 994273".split(" ");

    //qc_b
    //var subjects = "110613 113417 113821 120010 121719 130518 139637 143830 146836 168139 175035 176239 185038 189652 199958 201515 202820 385046 401422 415837 433839 462139 465852 469961 644246 656657 688569 723141 767464 872764 943862 965367 969476 987983 994273".split(" ");

    //qc_c
    //var subjects = "134627 136126 136631 138130 145632 146129 165941 176744 177241 186040 204218 221218 238033 257946 299760 392750 393550 413934 468050 555954 567759 590047 763557 765864 783462 815247 818455 818859 825553 902242 943862 962058 970764".split(" ");
    //var subjects = "130518 146129 562345".split(" ");

    //qc_d
    //var subjects = "101107 106016 108323 109830 111716 116726 118528 127327 130518 134627 134728 136126 136631 138130 145632 146129 148436 151728 155635 158843 161630 162733 165941 166438 167238 176744 177241 178647 181232 186040 191841 194847 198249 203418 204218 206929 211215 211720 227533 231928 238033 257946 297655 299760 308331 336841 339847 382242 386250 392750 433839 453441 468050 510326 558657 559457 567759 590047 599469 609143 614439 627549 628248 662551 706040 763557 765864 779370 783462 786569 792766 804646 815247 818455 818859 825553 880157 902242 943862 957974 962058 970764".split(" ");
    //var subjects = "115320 130518 135528 139839 146129 169343 172332 175439 204521 562345 662551 917255".split(" ");

    //qc_e
    var subjects = "101107 111716 134728 136631 148436 162733 165941 178647 186040 204218 211720 336841 567759 614439 628248 763557 786569 825553 943862".split(" ");

    var col = db.collection('datasets');
    async.eachSeries(subjects, (subject, next)=>{
        //find the record
        col.update({project, "meta.subject": subject}, {$addToSet: {tags: "qc_e"}}, {multi: true}, (err, results)=>{
            console.log(subject);
            console.dir(results.result);
            next();
        });
    }, err=>{
        db.close();
    });
});

