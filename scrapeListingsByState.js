const { getListingsPaginiationsList } = require('./pagesScraper');

const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');
let converter = require('json-2-csv');

const { extractListingsIds, extractListingDetails, extractListingsReviewsAndPrice} = require("./utils");
const {get} = require("axios");
const { Cluster } = require('puppeteer-cluster');
const {contentRequest} = require("./contentRequest");

const checkScrapedData = async (arr,path) => {
    const data = readFileSync(`${path}/ids.csv`, {encoding: 'utf-8'});
    if(data === ''){
        return arr;
    }
    let convertedData = await converter.csv2json(data, {delimiter: {field: ';'}});
    convertedData = convertedData.map(c => c.listingId);
    return arr.filter(x => !convertedData.some(c => c==x));
}

const checkResultPath = (path) => {
    if (!existsSync(path)) {
        mkdirSync(path, {recursive: true});
    }
    if (!existsSync(path+"/listings.csv")) {
        writeFileSync(path+"/listings.csv",'scrapedAt;listingId;title;metaPrice.currencyCode;metaPrice.symbol;metaPrice.floatValue;image;description;category;discount;rating;reviewsCount;seller.badge;seller.avatar;seller.features;seller.tags;seller.name;breadcrumbs;location;lat;lng;guests;pets_allowed;description_items;category_rating;rules;details;highlights;neighborhood;nearbyCities;arrangement_details;amenities;images;propertyType;url',{ encoding: 'utf-8' });
    }
    if (!existsSync(path+"/prices.csv")) {
        writeFileSync(path+"/prices.csv",'scrapedAt;listingId;currencyCode;symbol;floatValue',{ encoding: 'utf-8' });
    }
    if (!existsSync(path+"/reviews.csv")) {
        writeFileSync(path+"/reviews.csv",'scrapedAt;listingId;text;customerId;customerName;year;month',{ encoding: 'utf-8' });
    }
    if (!existsSync(path+"/ids.csv")) {
        writeFileSync(path+"/ids.csv",'scrapedAt;listingId',{ encoding: 'utf-8' });
    }
}

exports.scrapeListingsByState = async (baseUrl, path, state, city, order, amount) => {
    try {
        checkResultPath(path);
        console.log(`Start gathering listings pages for ${city} - ${state}...`)
        const pages = await getListingsPaginiationsList(baseUrl);

        console.log(`${order}/${amount} : Listings pages ready for ${city} - ${state}, start to scrape...`);

        let listings = [];

        let listingsPages = await Promise.all(pages.map(async page => await get(page)))
        let listingsIds = await Promise.all(listingsPages.map(async page => await extractListingsIds(page)));

        for (let ids of listingsIds){
            listings = [...listings, ...ids]
        }

        listings = listings.filter((item, index) => listings.indexOf(item) === index && item != null);

        let newListings = await checkScrapedData(listings,path);
        console.log(newListings.length+` listings for ${city} - ${state} ready to scrape...`)

        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 10,
            timeout: 120000,
            monitor: true,
            puppeteerOptions: {
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                //executablePath: "C:/Users/Rjab/IdeaProjects/chrome-win64/chrome",
                defaultViewport: false
            }
        });

        cluster.on("taskerror", (err, data) => {
            console.log(`Error crawling by https://www.airbnb.com/rooms/${data.listingId}: ${err.message}`);
        });

        await cluster.task(async ({ page, data: { url, listingId, path } }) => {
            //console.log(`${i}/${n} : Start with ${city} - ${state}: `, `https://www.airbnb.com/rooms/${listingId}`);
            await page.goto(`https://www.airbnb.com/rooms/${listingId}/reviews`,{
                //waitUntil: 'domcontentloaded',
                timeout: 120000
            });
            await page.waitForFunction(`document.getElementById("data-deferred-state") != ${null}`,{
                timeout: 31000
            });
            let html = await page.content();
            const resDetails = { data: html };
            await extractListingDetails(resDetails, listingId, path);
            await page.waitForFunction(`document.evaluate( '//*[@id="site-content"]/div/div[1]/div[2]/div/div/div/div[2]/div' ,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue != ${null}`, {
                timeout: 32000
            });
            html = await page.content();
            const resExtra = { data: html };
            await extractListingsReviewsAndPrice(resExtra, listingId, path);
            //console.log(`${i}/${n} : ${city} - ${state} Successfully "` + listingId + `" Scraped`);
        });

        let i=0;
        for(let listingId of newListings){
            i++;
            await cluster.queue({
                url: `https://www.airbnb.com/rooms/${listingId}`,
                listingId,
                path
            });
        }

        await cluster.idle();
        await cluster.close();

        console.log(`${city} - ${state} Finish!`)
        return 1;
    }catch (e) {
        console.log(e.message);
        return 0;
    }
}

