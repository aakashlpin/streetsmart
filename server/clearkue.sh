#!/bin/sh

a=1

while [ $a -lt 305 ]
do
    curl -X DELETE http://localhost:3001/job/$a
    a=`expr $a + 1`
done
