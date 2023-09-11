const cheerio = require("cheerio");
const dJSON = require('dirty-json');
const JsonFind = require("json-find");
const {get} = require("axios");
const {contentRequest} = require("./contentRequest");

exports.getListingsPaginiationsList = async (url) => {
    const res = await get(url);

    const $ = cheerio.load(res.data);

    let json = dJSON.parse($("script[id='data-deferred-state']").text());
    json = json["niobeMinimalClientData"][0][1].data.presentation;

    const doc = JsonFind(json);

    const {pageCursors} = doc.findValues('pageCursors');
    const {federatedSearchSessionId} = doc.findValues('federatedSearchSessionId')

    const params = {
        pagination_search: true,
        channel: 'EXPLORE'
    }

    return pageCursors.map(cursor =>  `${url}?pagination_search=${params.pagination_search}&channel=EXPLORE&federated_search_session_id=${federatedSearchSessionId}&cursor=${cursor}`);
}