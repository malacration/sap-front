#!/bin/sh

isUrl() {
    if curl --head --silent --fail $1 2> /dev/null;
    then
        return 0
    else
        return 1
    fi
}

download(){
    curl -o $1 $2 -L
}


if [ "$config" != "" ] 
    then echo $config > /usr/share/nginx/html/config; 
fi

if [ "$favicon" != "" ] 
    then echo $favicon > /usr/share/nginx/html/favicon.svg; 
fi

if isUrl $logo -eq 0;
    then download "/usr/share/nginx/html/logo.png" $logo;
fi
