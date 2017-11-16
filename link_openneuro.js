#!/usr/bin/env node

const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');

const srcdir="/mnt/openneuro/ds000030/ds000030_R1.0.4/uncompressed";
const linkdir="/link/openneuro/30r4";

//find sub-* directories
fs.readdir(srcdir, (err, files)=>{
    async.eachSeries(files, (subject_dir, next_subject)=>{
        if(!subject_dir.startsWith("sub-")) return next_subject();

        var subject = subject_dir.substring(4);
        var srcpath = srcdir+"/"+subject_dir;
        var freesurferpath = srcdir+"/derivatives/freesurfer/"+subject_dir;

        async.series([
            next=>{
                //find freesurfer
                fs.stat(freesurferpath+"/mri", (err, stats)=>{
                    if(err) return next(); 
                    var dest = linkdir+"/"+subject;
                    mkdirp(dest, err=>{
                        if(err) return next(err);
                        fs.symlink(freesurferpath, dest+"/freesurfer", err=>{
                            console.log(subject,"freesurfur");         
                        });
                        next();
                    });
                });
            },

            next=>{
                //find dwi
                fs.stat(srcpath+"/dwi", (err, stats)=>{
                    if(err) return next(); //no dwi. skip
                    var dest = linkdir+"/"+subject+"/dwi";
                    mkdirp(dest, err=>{
                        if(err) return next(err);
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_dwi.nii.gz", dest+"/dwi.nii.gz", err=>{
                            console.log(subject,"dwi/dwi");         
                        });
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_dwi.bvec", dest+"/dwi.bvecs", err=>{
                            console.log(subject,"dwi/bvecs");         
                        });
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_dwi.bval", dest+"/dwi.bvals", err=>{
                            console.log(subject,"dwi/bvals");         
                        });
                        fs.symlink(srcpath+"/dwi/"+subject_dir+"_dwi.json", dest+"/dwi.json", err=>{
                            console.log(subject,"dwi/json");         
                        });
                        next();
                    });
                });
            },

            next=>{
                //find anat
                fs.stat(srcpath+"/anat", (err, stats)=>{
                    if(err) return next(); //no anat, skip
                    var dest = linkdir+"/"+subject+"/anat";
                    mkdirp(dest, err=>{
                        if(err) return next(err);
                        fs.symlink(srcpath+"/anat/"+subject_dir+"_T1w.nii.gz", dest+"/t1.nii.gz", err=>{
                            console.log(subject,"anat");         
                        });
                        fs.symlink(srcpath+"/anat/"+subject_dir+"_T1w.json", dest+"/t1.json", err=>{
                            //if(err) console.error(err);
                            console.log(subject,"anat/json");         
                        });
                        next();
                    });
                });
            },

            next=>{
                //find func
                fs.stat(srcpath+"/func", (err, stats)=>{
                    if(err) return next(); //no func . skip
                    let dest = linkdir+"/"+subject+"/func";

                    //find tasks
                    fs.readdir(srcpath+"/func", (err, files)=>{
                        if(err) return next(err);
                        async.eachSeries(files, (file, next_file)=>{
                            if(!file.endsWith("bold.nii.gz")) return next_file();

                            let tokens = file.split("_");
                            let subject = tokens[0];
                            let task = tokens[1].substring(5); //remove "task-"
                            
                            let subdest = dest+"/"+task;
                            mkdirp(subdest, err=>{
                                if(err) return next(err);
                                async.series([
                                    n=>{
                                        //all func has bold
                                        fs.symlink(srcpath+"/func/"+file, subdest+"/bold.nii.gz", err=>{
                                            console.log(file, subdest+"/bold.nii.gz");
                                            n();
                                        });
                                    },

                                    n=>{
                                        //some has events.tsv
                                        let tsvpath = srcpath+"/func/"+subject+"_task-"+task+"_events.tsv";
                                        fs.stat(tsvpath, (err, stats)=>{
                                            if(err) return n(); //no evnets .. skip
                                            //if(err) return console.error(err);
                                            fs.symlink(tsvpath, subdest+"/events.tsv", err=>{
                                                console.log(tsvpath, subdest+"/events.tsv");
                                                n();
                                            });
                                        });
                                    },

                                    n=>{
                                        let jsonpath = srcpath+"/func/"+subject+"_task-"+task+"_bold.json";
                                        fs.stat(jsonpath, (err, stats)=>{
                                            if(err) return n(); //no json .. skip
                                            fs.symlink(jsonpath, subdest+"/bold.json", err=>{
                                                console.log(jsonpath, subdest+"/bold.json");
                                                n();
                                            });
                                        });
                                    },
                                ], next_file);
                            });
                        }, next);
                    });
                });
            } //next
        ], next_subject);
    }, err=>{
        if(err) console.error(err);
        console.log("done with all subject directories");
    });
});

