#!/bin/bash
root=/mnt/dcwan/projects/hcp
ls $root > subjects
for subject in `cat subjects`
do
	if [[ $subject =~ "txt" ]]; then
		echo "skipping $subject with odd name"
		continue
	fi

	echo "------------------$root/$subject"
	mkdir -p hcp/$subject
    cd hcp/$subject
    if [ -f "$root/$subject/T1w/Diffusion/data.nii.gz" ]; then
        mkdir -p dwi 
        ln -s $root/$subject/T1w/Diffusion/bvals dwi/dwi.bvals
        ln -s $root/$subject/T1w/Diffusion/bvecs dwi/dwi.bvecs
        ln -s $root/$subject/T1w/Diffusion/data.nii.gz dwi/dwi.nii.gz
    fi

    if [ -d "$root/$subject/T1w/Diffusion_7T" ]; then
        mkdir -p dwi7t
        ln -sf $root/$subject/T1w/Diffusion_7T/bvals dwi7t/dwi.bvals
        ln -sf $root/$subject/T1w/Diffusion_7T/bvecs dwi7t/dwi.bvecs
        ln -sf $root/$subject/T1w/Diffusion_7T/data.nii.gz dwi7t/dwi.nii.gz
    fi

    if [ -f "$root/$subject/T1w/T1w_acpc_dc_restore_1.25.nii.gz" ]; then
        #3t anat
        mkdir -p t1
        ln -sf  $root/$subject/T1w/T1w_acpc_dc_restore_1.25.nii.gz t1/t1.nii.gz
    fi

    if [ -f "$root/$subject/T1w/T1w_acpc_dc_restore_1.05.nii.gz" ]; then
        #7t anat
        mkdir -p t17t
        ln -sf  $root/$subject/T1w/T1w_acpc_dc_restore_1.05.nii.gz t17t/t1.nii.gz
    fi

    if [ -d "$root/$subject/T1w/$subject" ]; then
        mkdir -p freesurfer
        #if output directory already exists, it tries to create another link inside it
        #and create infinite loop..
        if [ ! -L "$root/$subject/T1w/$subject" ]; then
            ln -sf  $root/$subject/T1w/$subject freesurfer/output
        fi
    fi
    cd -
done
