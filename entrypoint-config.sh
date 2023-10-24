#!/bin/sh

if [ "$config" != "" ] 
    then echo $config > /usr/share/nginx/html/config; 
fi
