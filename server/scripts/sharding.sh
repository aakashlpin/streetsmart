#backup development data
#mongodump -d streetsmart-development -o backup

#backup production data
mongodump -d streetsmart-production -o backup
