#!/usr/bin/env node

const fs = require('fs');
const mkdirp = require('mkdirp');

nkidir="/mnt/fcp-indi/data/Projects/RocklandSample/RawDataBIDS";
linkdir="/link/nki",

//find sub-* directories
fs.readdir(nkidir, (err, files)=>{
    files.forEach(subject_dir=>{
        if(!subject_dir.startsWith("sub-")) return;

        //list sessions
        fs.readdir(nkidir+"/"+subject_dir, (err, subfiles)=>{
            subfiles.forEach(session_dir=>{
                if(!session_dir.startsWith("ses-")) return;

                var subject = subject_dir.substring(4);
                var session = session_dir.substring(4);
                var srcpath = nkidir+"/"+subject_dir+"/"+session_dir;

                //find dwi
                fs.stat(srcpath+"/dwi", (err, stats)=>{
                    if(err) return;
                    var dest = linkdir+"/"+subject+"/"+session+"/dwi";
                    mkdirp(dest, err=>{
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.nii.gz", dest+"/dwi.nii.gz", err=>{
                            console.log(subject,session,"dwi/dwi");         
                        });
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.bvec", dest+"/dwi.bvecs", err=>{
                            console.log(subject,session,"dwi/bvecs");         
                        });
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.bval", dest+"/dwi.bvals", err=>{
                            console.log(subject,session,"dwi/bvals");         
                        });
                    });
                });
                
                //find anat
                fs.stat(srcpath+"/anat", (err, stats)=>{
                    if(err) return;
                    var dest = linkdir+"/"+subject+"/"+session+"/anat";
                    mkdirp(dest, err=>{
                        fs.symlink(srcpath+"/anat/"+subject_dir+"_"+session_dir+"_T1w.nii.gz", dest+"/t1.nii.gz", err=>{
                            //if(err) console.error(err);
                            console.log(subject,session,"anat");         
                        });
                    });
                });
            });
        });
    });
});

