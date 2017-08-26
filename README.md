# import-hcp
HCP data import script

1. 

symlinks directories are created by /N/dcwan/projects/brainlife/hcp_links.sh

2. 

find broken links (there shouldn't be any, but just in case.. if there is fix hcp_links.sh so that it won't create them)

$ find . -xtype l

3. 

run import.js which will go through all symlink directories and add dataset record to warehouse *if it doesn't exist*

