#backup development data
#mongodump -d streetsmart-development -o backup

#backup production data
mongodump --port 38128 -d streetsmart-production -o backup
