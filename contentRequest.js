const {get} = require("axios");
const {call} = require("proxidoor");

exports.contentRequest = async (url) => {
    try {
        let res = await get(url);
        if(res.status !== 200){
            res = await call(url);
            if(res.status !== 200){
                throw Error('Failed to request '+url+' with proxidoor');
            }
            return  res.html
        }
        return res.data;
    }catch (e) {
        console.log(e.message);
    }
}