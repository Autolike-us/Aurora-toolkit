# Files that must be served at the site root

Anything you drop in this folder (except this README and .gitkeep) is copied to the root of the website by `npm run build:hostgator`,
so `site-root/tiktokXXXX.txt` is served at https://getaurorastudios.com/tiktokXXXX.txt.

Quickest way, no rebuild: upload the file straight into `public_html/` with cPanel File Manager. A later site update (zip upload) does not delete it.
