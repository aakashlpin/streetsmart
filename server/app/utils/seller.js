module.exports = {
    getSellerFromURL: function(url) {
        if (url.indexOf('flipkart.com') >= 0) {
            return 'flipkart';
        } else if (url.indexOf('amazon.in') >= 0) {
            return 'amazon';
        } else if (url.indexOf('jabong.com') >= 0) {
        	return 'jabong';
        } else if (url.indexOf('myntra.com') >= 0) {
        	return 'myntra';
        }
        return null;
    }
};
