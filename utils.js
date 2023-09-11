const converter = require("json-2-csv");
const {appendFile, readFileSync} = require("fs");
const {launch} = require("puppeteer");
const cheerio = require("cheerio");
const dJSON = require("dirty-json");
const JsonFind = require("json-find");
const {getListingdata} = require("./listingScraper");
const {getListingPriceAndReviews} = require("./listingReviewsScraper");


const saveResult = async (data,path,separator) => {
    const listingsDetails = await converter.json2csv(data, {delimiter: {field: ';'}});
    appendFile(path, listingsDetails.split(separator)[1], function (err) {
        if (err) return console.log(err);

    });
}

const puppeteerCall = async (url,args) => {
    const browser = await launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: "C:/Users/Rjab/IdeaProjects/chrome-win64/chrome"
    });
    const page = await browser.newPage();
    await page.goto(url+"", {
        timeout: 120000
    });
    await page.waitForSelector('.c1k13iig .dir .dir-ltr');

    const html = await page.content();
    await browser.close();
    return {data: html};
}

exports.extractListingsIds = async (res) => {
    const $ = cheerio.load(res.data);
    let json = JSON.parse($("script[id='data-deferred-state']").text());
    json = json["niobeMinimalClientData"][0][1].data.presentation;
    const doc = JsonFind(json);
    const {staysInViewport} = doc.findValues('staysInViewport');
    return staysInViewport.map(el => el.listingId);
}

exports.extractListingDetails = async (resDetails, listingId, path) => {
    const listingDetails = await getListingdata(resDetails);

    let l = [{scrapedAt: (new Date()).toUTCString(),listingId, ...listingDetails}];
    let id = [{scrapedAt: l[0].scrapedAt,listingId}];

    await Promise.all([
        await saveResult(l,path+"/listings.csv",';url'),
        await saveResult(id,path+"/ids.csv",';listingId')
    ]);

}

exports.extractListingsReviewsAndPrice = async (resExtra, listingId, path) => {

    const {price, reviews} = await getListingPriceAndReviews(resExtra,`${listingId}`);

    if(price !== null) {
        let r = reviews;
        let p = [price];

        await Promise.all([
            await saveResult(p, path + "/prices.csv", ';floatValue'),
            ...r.map(async review => await saveResult(review, path + "/reviews.csv", ';month'))
        ]);
    }else{
        let r = reviews;
        await Promise.all([
            ...r.map(async review => await saveResult(review, path + "/reviews.csv", ';month'))
        ]);
    }
}