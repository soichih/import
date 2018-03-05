#!/usr/bin/env node

const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');

//const srcdir="/mnt/openneuro/ds000030/ds000030_R1.0.4/uncompressed";
const srcpath="/mnt/scratch/hayashis/ixi/";
const linkdir="/link/ixi";

fs.readdir(srcpath+"/T2", (err, files)=>{
    async.eachSeries(files, (file, next_file)=>{

        console.log(file);
        let tokens = file.split("-");
        let subject = tokens[0]; //IXI025
        let inst = tokens[1]; //Guys / HH 
        let something = tokens[2]; //1211.. what is this?

        var dest = linkdir+"/"+subject+"/t2";
        mkdirp(dest, err=>{
            if(err) return next(err);
            fs.symlink(srcpath+"/T2/"+file, dest+"/t2.nii.gz", err=>{
                console.log(subject);
            });
            next_file();
        });
    }, err=>{
        if(err) throw err;
        console.log("done");
    });
});

/*
fs.readdir(srcpath+"/T1", (err, files)=>{
    async.eachSeries(files, (file, next_file)=>{

        console.log(file);
        let tokens = file.split("-");
        let subject = tokens[0]; //IXI025
        let inst = tokens[1]; //Guys / HH 
        let something = tokens[2]; //1211.. what is this?

        var dest = linkdir+"/"+subject+"/anat";
        mkdirp(dest, err=>{
            if(err) return next(err);
            fs.symlink(srcpath+"/T1/"+file, dest+"/t1.nii.gz", err=>{
                console.log(subject);
            });
            next_file();
        });
    }, err=>{
        if(err) throw err;
        console.log("done");
    });
});
*/

/*
fs.readdir(srcpath+"/DTI-merged", (err, files)=>{
    async.eachSeries(files, (file, next_file)=>{

        console.log(file);
        let tokens = file.split("-");
        let subject = tokens[0]; //IXI025
        let inst = tokens[1]; //Guys / HH 
        let something = tokens[2]; //1211.. what is this?

        var dest = linkdir+"/"+subject+"/dwi";
        mkdirp(dest, err=>{
            if(err) return next(err);
            fs.symlink(srcpath+"/DTI-merged/"+file, dest+"/dwi.nii.gz", err=>{
                console.log(subject,"dwi/dwi");         
            });
            fs.symlink(srcpath+"/bvecs.txt", dest+"/dwi.bvecs", err=>{
                console.log(subject,"dwi/bvecs");         
            });
            fs.symlink(srcpath+"/bvals.txt", dest+"/dwi.bvals", err=>{
                console.log(subject,"dwi/bvals");         
            });
            next_file();
        });
    }, err=>{
        if(err) throw err;
        console.log("done");
    });
});
*/


