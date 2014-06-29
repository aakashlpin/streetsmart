module.exports = {
    getSellerFromURL: function(url) {
        if (url.indexOf('flipkart.com') >= 0) {
            return 'flipkart';
        } else if (url.indexOf('amazon.in') >= 0) {
            return 'amazon';
        }
        return null;
    }
};
