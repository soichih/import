#!/usr/bin/env node

const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');

nkidir="/mnt/fcp-indi/data/Projects/RocklandSample/RawDataBIDS";
linkdir="/link/nki",

//find sub-* directories
fs.readdir(nkidir, (err, files)=>{
    async.eachSeries(files, (subject_dir, next_subject)=>{
        if(!subject_dir.startsWith("sub-")) return next_subject();

        //list sessions
        fs.readdir(nkidir+"/"+subject_dir, (err, subfiles)=>{
            if(err) return next_subject(err);
            async.eachSeries(subfiles, (session_dir, next_session)=>{
                if(!session_dir.startsWith("ses-")) return next_session();

                var subject = subject_dir.substring(4);
                var session = session_dir.substring(4);
                var srcpath = nkidir+"/"+subject_dir+"/"+session_dir;

                async.series([
                    next=>{
                        //find dwi
                        fs.stat(srcpath+"/dwi", (err, stats)=>{
                            if(err) return next(); //no dwi. skip
                            var dest = linkdir+"/"+subject+"/"+session+"/dwi";
                            mkdirp(dest, err=>{
                                if(err) return next(err);
                                fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.nii.gz", dest+"/dwi.nii.gz", err=>{
                                    console.log(subject,session,"dwi/dwi");         
                                });
                                fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.bvec", dest+"/dwi.bvecs", err=>{
                                    console.log(subject,session,"dwi/bvecs");         
                                });
                                fs.symlink(srcpath+"/dwi/"+subject_dir+"_"+session_dir+"_dwi.bval", dest+"/dwi.bvals", err=>{
                                    console.log(subject,session,"dwi/bvals");         
                                });
                                next();
                            });
                        });
                    },

                    next=>{
                        //find anat
                        fs.stat(srcpath+"/anat", (err, stats)=>{
                            if(err) return next(); //no anat, skip
                            var dest = linkdir+"/"+subject+"/"+session+"/anat";
                            mkdirp(dest, err=>{
                                if(err) return next(err);
                                fs.symlink(srcpath+"/anat/"+subject_dir+"_"+session_dir+"_T1w.nii.gz", dest+"/t1.nii.gz", err=>{
                                    //if(err) console.error(err);
                                    console.log(subject,session,"anat");         
                                    next();
                                });
                            });
                        });
                    },

                    next=>{
                        //find func
                        fs.stat(srcpath+"/func", (err, stats)=>{
                            if(err) return next(); //no func . skip
                            let dest = linkdir+"/"+subject+"/"+session+"/func";

                            //find tasks
                            fs.readdir(srcpath+"/func", (err, files)=>{
                                if(err) return next(err);
                                async.eachSeries(files, (file, next_file)=>{
                                    if(!file.endsWith("bold.nii.gz")) return next_file();
                                    let tokens = file.split("_");
                                    let subject = tokens[0];
                                    let session = tokens[1].substring(4);
                                    let task = tokens[2].substring(5);
                                    let acq = tokens[3].substring(4);
                                    
                                    let subdest = dest+"/"+task+"/"+acq;
                                    mkdirp(subdest, err=>{
                                        if(err) return next(err);
                                        async.series([
                                            n=>{
                                                //all func has bold
                                                fs.symlink(srcpath+"/func/"+file, subdest+"/bold.nii.gz", err=>{
                                                    //console.log(subject,session,task,acq, "bold.nii.gz");
                                                    n();
                                                });
                                            },

                                            n=>{
                                                //some has events.tsv
                                                let tsvpath = srcpath+"/func/"+file.substring(0, file.length-11)+"events.tsv";
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
                                                //some has sbref.tsv
                                                let sbrefpath = srcpath+"/func/"+file.substring(0, file.length-11)+"sbref.nii.gz";
                                                fs.stat(sbrefpath, (err, stats)=>{
                                                    if(err) return n(); //no sbref skip
                                                    //if(err) return console.error(err);
                                                    fs.symlink(sbrefpath, subdest+"/sbref.nii.gz", err=>{
                                                        console.log(sbrefpath, subdest+"/sbref.nii.gz");
                                                        n();
                                                    });
                                                });
                                            },

                                            n=>{
                                                //some has physio.tsv.gz
                                                let physiopath = srcpath+"/func/"+file.substring(0, file.length-11)+"physio.tsv.gz";
                                                fs.stat(physiopath, (err, stats)=>{
                                                    if(err) return n(); //no evnets
                                                    //if(err) return console.error(err);
                                                    fs.symlink(physiopath, subdest+"/physio.tsv.gz", err=>{
                                                        console.log(physiopath, subdest+"/physio.tsv.gz");
                                                        n();
                                                    });
                                                });
                                            },

                                            n=>{
                                                //some has physio.json
                                                let physiojsonpath = srcpath+"/func/"+file.substring(0, file.length-11)+"physio.json";
                                                fs.stat(physiojsonpath, (err, stats)=>{
                                                    if(err) return n(); //no evnets
                                                    fs.symlink(physiojsonpath, subdest+"/physio.json", err=>{
                                                        console.log(physiojsonpath, subdest+"/physio.json");
                                                        n();
                                                    });
                                                });
                                            },
                                        ], next_file);
                                    });
                                }, next);
                            });
                        });
                    }, //next
                
                ], next_session);
                

            }, next_subject);
        });
    }, err=>{
        if(err) console.error(err);
        console.log("done with all subject directories");
    });
});

